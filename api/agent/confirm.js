/**
 * POST /api/agent/confirm — 确认执行 PIP 任务变更（写操作唯一入口）
 *
 * 两种模式：
 *   A. 更新：{ taskId, patch?, newStatus?, evidence?, operator?, baseRevision? }
 *      newStatus 为旧版兼容字段。patch 字段白名单 + 状态机 + schema 校验。
 *   B. 方案执行（创建/拆解）：{ proposalId, selected?: number[], edits?: { [index]: {...} }, operator?, baseRevision? }
 *      selected 为选项下标（默认全选）；edits 仅允许白名单字段；任务 ID 由服务端统一生成。
 *
 * 并发控制：baseRevision 与服务端 revision 不一致时返回 409（REVISION_CONFLICT），
 *   客户端需重新拉取最新数据并再次确认。所有写入成功后 revision +1。
 *
 * 安全约定：确认接口重新完整校验，不信任前端回传的任何 patch / 选项字段。
 */
'use strict';

const { sendJson, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry, recentAgentUpdates, useKv, bumpRevision } = require('../_lib/store');
const { sendPipNotification } = require('../_lib/dual');
const { beijingNow } = require('../_lib/wecom');
const { projectPresentation } = require('../../agent/presenter');
const { patchFromRequest } = require('../_lib/copilot');
const { guardAgentAccess, corsHeaders, readLimitedBody } = require('../_lib/security');
const { getProposal, nextTaskIds, validateOption, buildTaskFromOption, nextProjectId, validateProjectOption, buildProjectFromOption } = require('../_lib/proposals');

/** 方案执行时允许用户编辑的选项字段 */
const OPTION_EDITABLE = ['title', 'priority', 'owner', 'dueAt', 'remindAt', 'nextAction', 'outputCondition', 'workstream', 'projectId'];

/** 项目选项允许用户编辑的字段（v3 create_project） */
const PROJECT_OPTION_EDITABLE = ['title', 'aliases', 'status', 'owner', 'priority', 'summary', 'nextAction'];

function displayValue(field, value) {
  if (value == null || value === '') return '—';
  return field === 'progress' ? String(value) + '%' : String(value);
}

function kvGuard(res) {
  // Vercel 的函数文件系统不可持久写入，提前返回可操作的配置提示。
  if (process.env.VERCEL && !useKv()) {
    sendJson(res, 503, {
      ok: false,
      code: 'KV_NOT_CONFIGURED',
      error: '线上持久化存储尚未配置（KV）。请在 Vercel 设置 KV_REST_API_URL 和 KV_REST_API_TOKEN 后重新部署。',
    });
    return false;
  }
  return true;
}

/** revision 乐观锁校验：客户端显式携带时必须一致 */
function revisionGuard(res, body, state, requestId) {
  if (body && body.baseRevision != null && Number(body.baseRevision) !== state.revision) {
    sendJson(res, 409, {
      ok: false,
      code: 'REVISION_CONFLICT',
      error: '数据已被其他会话更新，请查看最新变更后重新确认',
      revision: state.revision,
      requestId,
    });
    return false;
  }
  return true;
}

function sendCorsJson(res, req, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(corsHeaders(req))) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [k, v] of Object.entries(corsHeaders(req))) res.setHeader(k, v);
    res.end();
    return;
  }

  const guard = guardAgentAccess(req);
  if (!guard.ok) return sendJson(res, guard.status, { ok: false, error: guard.error, requestId: guard.requestId });
  if (!methodGuard(req, res, 'POST')) return;

  try {
    if (!kvGuard(res)) return;

    const body = await readLimitedBody(req);
    const operator = String(body.operator || '').trim() || 'Sera';

    if (body.proposalId) {
      return await executeProposal(req, res, body, operator, guard.requestId);
    }
    return await executeUpdate(req, res, body, operator, guard.requestId);
  } catch (e) {
    const status = (e && e.status) || 500;
    sendJson(res, status, { ok: false, error: String((e && e.message) || e) });
  }
};

/* ================= 模式 A：字段级更新 ================= */

async function executeUpdate(req, res, body, operator, requestId) {
  const taskId = String(body.taskId || '').toUpperCase();
  const evidence = typeof body.evidence === 'string' ? body.evidence.trim() : '';

  const state = await loadState();
  if (!revisionGuard(res, body, state, requestId)) return;

  const task = state.tasks.tasks.find((item) => item.id === taskId);
  if (!task) return sendJson(res, 404, { ok: false, error: '未找到任务 ' + taskId, requestId });

  const previousStatus = task.status;
  const candidate = patchFromRequest(body, task);
  if (candidate.error) return sendJson(res, 409, { ok: false, error: candidate.error, requestId });
  if (!candidate.changes.length) {
    return sendJson(res, 200, {
      ok: true,
      noop: true,
      message: taskId + ' 的任务数据没有变化',
      task,
      revision: state.revision,
      requestId,
    });
  }

  const nowIso = new Date().toISOString();
  for (const field of Object.keys(candidate.patch)) task[field] = candidate.patch[field];

  if (task.status === '已完成') {
    task.progress = 100;
    task.completedAt = task.completedAt || nowIso;
    if (evidence) {
      task.completionEvidence = evidence;
      task.result = evidence;
    }
  }
  task.updatedBy = operator;
  task.updatedAt = nowIso;
  state.tasks.updatedAt = nowIso;

  appendAuditEntry(state, {
    actor: 'web',
    action: 'agent-update',
    taskId: task.id,
    detail: JSON.stringify({
      operator,
      previousStatus,
      newStatus: task.status,
      changes: candidate.changes,
      completionEvidence: task.completionEvidence || null,
      changeSource: 'agent',
      requestId,
    }),
  });

  const projected = projectPresentation({
    tasks: state.tasks.tasks,
    pipeline: state.pipeline,
    weeklyLog: state.weeklyLog,
  });
  state.pipeline = projected.pipeline;
  state.weeklyLog = projected.weeklyLog;

  bumpRevision(state);
  // 先落库，成功后才通知，避免出现“通知已发但任务未写入”。
  await saveState(state);

  const changeText = candidate.changes
    .map((change) => change.label + '：' + displayValue(change.field, change.previousValue) + ' → ' + displayValue(change.field, change.newValue))
    .join('；');
  const dual = await sendPipNotification(state, {
    eventId: 'task-update:' + task.id + ':' + nowIso,
    title: '【PIP 任务进度更新】',
    lines: [
      '任务：' + task.id + '｜' + task.title,
      '操作：更新',
      '变更：' + changeText,
      '负责人：' + (task.owner || '—'),
      '操作人：' + operator,
      '时间：' + beijingNow() + '（北京时间）',
    ],
    linkBase: dashboardUrl(req),
    linkParams: { taskId: task.id },
  });
  if (dual.wecom && (dual.wecom.success || dual.feishu.success)) {
    try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
  }
  if (dual.queued) {
    try { await saveState(state); } catch { /* 队列状态持久化失败不阻断 */ }
  }

  const anyConfigured = (dual.wecom && dual.wecom.configured) || (dual.feishu && dual.feishu.configured);
  sendJson(res, 200, {
    ok: true,
    task,
    previousStatus,
    newStatus: task.status,
    changes: candidate.changes,
    revision: state.revision,
    requestId,
    notify: !anyConfigured
      ? { configured: false, message: '未配置通知渠道（WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL），已跳过通知' }
      : {
          configured: true,
          mode: dual.queued ? 'summary' : 'dual',
          ok: dual.ok || false,
          queued: dual.queued || false,
          action: dual.action || null,
          partial: dual.partial || false,
          allFailed: dual.allFailed || false,
          message: dual.queued
            ? '已进入 30 分钟汇总队列（普通事项不即时推送）'
            : dual.action === 'silenced'
              ? '已静默（test/chore/重复）'
              : dual.action === 'deduped'
                ? '30 分钟内已去重'
                : dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
          wecom: dual.wecom,
          feishu: dual.feishu,
        },
    notifyFailed: anyConfigured && !dual.ok && !dual.queued,
    recentUpdates: recentAgentUpdates(state, 8),
  });
}

/* ================= 模式 B：方案执行（创建 / 拆解） ================= */

async function executeProposal(req, res, body, operator, requestId) {
  const state = await loadState();
  if (!revisionGuard(res, body, state, requestId)) return;

  const proposal = getProposal(state, String(body.proposalId));
  if (!proposal) {
    return sendJson(res, 404, { ok: false, error: '方案不存在或已过期（有效期 2 小时），请重新生成', requestId });
  }

  // v3：项目创建方案单独分支（无任务选项）
  if (proposal.kind === 'create_project') {
    return executeCreateProject(req, res, body, state, proposal, operator, requestId);
  }

  // 选中项：默认全选；越界下标拒绝
  const total = proposal.options.length;
  let selected = Array.isArray(body.selected) && body.selected.length
    ? body.selected.map((i) => Number(i)).filter((i) => Number.isInteger(i))
    : proposal.options.map((_, i) => i);
  selected = [...new Set(selected)].sort((a, b) => a - b);
  if (!selected.length) return sendJson(res, 400, { ok: false, error: '未选择任何任务选项', requestId });
  if (selected.some((i) => i < 0 || i >= total)) {
    return sendJson(res, 400, { ok: false, error: `选项下标越界（共 ${total} 项）`, requestId });
  }

  // 用户编辑：仅白名单字段，先合并再整体校验
  const edits = body.edits && typeof body.edits === 'object' && !Array.isArray(body.edits) ? body.edits : {};
  const chosen = selected.map((i) => {
    const opt = JSON.parse(JSON.stringify(proposal.options[i]));
    const patch = edits[i] && typeof edits[i] === 'object' ? edits[i] : {};
    for (const field of OPTION_EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(patch, field) && patch[field] !== undefined) opt[field] = patch[field];
    }
    opt.__index = i;
    return opt;
  });

  // 服务端重新完整校验（不信任任何回传值）
  const errors = [];
  for (const opt of chosen) {
    errors.push(...validateOption(opt, { tasks: state.tasks.tasks, parentTaskId: proposal.parentTaskId }));
  }
  if (errors.length) return sendJson(res, 409, { ok: false, error: errors.join('；'), requestId });

  // 服务端统一生成任务 ID；拆解的串行依赖映射为真实 ID
  const ids = nextTaskIds(state.tasks.tasks, chosen.length);
  const byOptionIndex = new Map(chosen.map((opt, i) => [opt.__index, ids[i]]));
  const warnings = [];
  const nowIso = new Date().toISOString();
  const created = chosen.map((opt, i) => {
    const dependencies = new Set(Array.isArray(opt.dependencies) ? opt.dependencies : []);
    for (const depIdx of Array.isArray(opt.dependsOnOptions) ? opt.dependsOnOptions : []) {
      if (byOptionIndex.has(depIdx)) dependencies.add(byOptionIndex.get(depIdx));
      else warnings.push(`「${opt.title.slice(0, 30)}」的前置步骤未被选中，已忽略该依赖`);
    }
    dependencies.delete(ids[i]); // 不允许依赖自身
    return buildTaskFromOption(
      { ...opt, dependencies: [...dependencies] },
      { id: ids[i], operator, nowIso, proposalId: proposal.id, parentTaskId: proposal.parentTaskId }
    );
  });

  state.tasks.tasks.push(...created);
  state.tasks.updatedAt = nowIso;

  // v3：关联项目——把新建任务的 ID 回填到 project.taskIds，保持双向引用一致
  for (const task of created) {
    if (task.projectId) {
      const proj = (state.projects.projects || []).find((p) => p.id === task.projectId);
      if (proj && !(proj.taskIds || []).includes(task.id)) {
        proj.taskIds = (proj.taskIds || []).concat(task.id);
        proj.updatedAt = nowIso;
      }
    }
  }

  const action = proposal.kind === 'decompose' ? 'agent-decompose' : 'agent-create';
  for (const task of created) {
    appendAuditEntry(state, {
      actor: 'web',
      action,
      taskId: task.id,
      detail: JSON.stringify({
        operator,
        proposalId: proposal.id,
        parentTaskId: proposal.parentTaskId,
        title: task.title,
        priority: task.priority,
        dueAt: task.dueAt,
        dependencies: task.dependencies,
        projectId: task.projectId || null,
        createdFromConversation: true,
        changeSource: 'agent',
        requestId,
      }),
    });
  }
  proposal.status = 'executed'; // gcProposals 会在下次访问时清理

  const projected = projectPresentation({
    tasks: state.tasks.tasks,
    pipeline: state.pipeline,
    weeklyLog: state.weeklyLog,
  });
  state.pipeline = projected.pipeline;
  state.weeklyLog = projected.weeklyLog;

  bumpRevision(state);
  await saveState(state);

  // 落库成功后才通知；失败不回滚任务写入
  const isDecompose = proposal.kind === 'decompose';
  const parent = proposal.parentTaskId ? state.tasks.tasks.find((t) => t.id === proposal.parentTaskId) : null;
  const dual = await sendPipNotification(state, {
    eventId: 'task-' + (isDecompose ? 'decompose' : 'create') + ':' + proposal.id,
    title: isDecompose ? '【PIP 任务拆解】' : '【PIP 新建任务】',
    lines: [
      ...(parent ? ['父任务：' + parent.id + '｜' + parent.title] : []),
      '操作：' + (isDecompose ? '拆解为 ' + created.length + ' 个子任务' : '新建 ' + created.length + ' 个任务'),
      ...created.map((t) => t.id + '｜' + t.title + '（' + t.owner + '，' + t.priority + ' 星，截止 ' + t.dueAt.slice(0, 10) + '）'),
      '操作人：' + operator,
      '时间：' + beijingNow() + '（北京时间）',
    ],
    linkBase: dashboardUrl(req),
    linkParams: parent ? { taskId: parent.id } : {},
  });
  if (dual.wecom && (dual.wecom.success || dual.feishu.success)) {
    try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
  }
  if (dual.queued) {
    try { await saveState(state); } catch { /* 队列状态持久化失败不阻断 */ }
  }

  const anyConfigured = (dual.wecom && dual.wecom.configured) || (dual.feishu && dual.feishu.configured);
  sendCorsJson(res, req, 200, {
    ok: true,
    kind: proposal.kind,
    proposalId: proposal.id,
    parentTaskId: proposal.parentTaskId,
    created: created.map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      priority: t.priority,
      dueAt: t.dueAt,
      dependencies: t.dependencies,
      parentTaskId: t.parentTaskId,
      projectId: t.projectId || null,
    })),
    tasks: created,
    warnings,
    revision: state.revision,
    requestId,
    notify: !anyConfigured
      ? { configured: false, message: '未配置通知渠道（WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL），已跳过通知' }
      : {
          configured: true,
          mode: dual.queued ? 'summary' : 'dual',
          ok: dual.ok || false,
          queued: dual.queued || false,
          action: dual.action || null,
          partial: dual.partial || false,
          allFailed: dual.allFailed || false,
          message: dual.queued
            ? '已进入 30 分钟汇总队列（普通事项不即时推送）'
            : dual.action === 'silenced'
              ? '已静默（test/chore/重复）'
              : dual.action === 'deduped'
                ? '30 分钟内已去重'
                : dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
          wecom: dual.wecom,
          feishu: dual.feishu,
        },
    notifyFailed: anyConfigured && !dual.ok && !dual.queued,
    recentUpdates: recentAgentUpdates(state, 8),
  });
}

/* ================= 模式 C：项目创建方案执行（v3） ================= */

async function executeCreateProject(req, res, body, state, proposal, operator, requestId) {
  if (!proposal.projectOption) {
    return sendJson(res, 400, { ok: false, error: '项目方案缺少 projectOption', requestId });
  }

  // 用户编辑：仅白名单字段，合并后整体校验
  const patch = body.edits && typeof body.edits === 'object' && !Array.isArray(body.edits) ? body.edits : {};
  const opt = JSON.parse(JSON.stringify(proposal.projectOption));
  for (const field of PROJECT_OPTION_EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(patch, field) && patch[field] !== undefined) opt[field] = patch[field];
  }

  // 服务端重新完整校验（不信任任何回传值）
  const errors = validateProjectOption(opt, { projects: state.projects.projects });
  if (errors.length) return sendJson(res, 409, { ok: false, error: errors.join('；'), requestId });

  const nowIso = new Date().toISOString();
  const id = nextProjectId(state.projects.projects);
  const project = buildProjectFromOption(opt, { id, operator, nowIso, proposalId: proposal.id });
  state.projects.projects.push(project);
  state.projects.updatedAt = nowIso;

  appendAuditEntry(state, {
    actor: 'web',
    action: 'agent-create-project',
    taskId: null,
    detail: JSON.stringify({
      operator,
      proposalId: proposal.id,
      projectId: project.id,
      title: project.title,
      aliases: project.aliases,
      changeSource: 'agent',
      requestId,
    }),
  });
  proposal.status = 'executed';

  bumpRevision(state);
  await saveState(state);

  // 落库成功后才通知
  const dual = await sendPipNotification(state, {
    eventId: 'project-create:' + proposal.id,
    title: '【PIP 新建项目】',
    lines: [
      '项目：' + project.id + '｜' + project.title,
      '负责人：' + project.owner,
      '优先级：' + project.priority + ' 星',
      ...(project.aliases.length ? ['别名：' + project.aliases.join('、')] : []),
      '操作人：' + operator,
      '时间：' + beijingNow() + '（北京时间）',
    ],
    linkBase: dashboardUrl(req),
    linkParams: {},
  });
  if (dual.wecom && (dual.wecom.success || dual.feishu.success)) {
    try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
  }
  if (dual.queued) {
    try { await saveState(state); } catch { /* 队列状态持久化失败不阻断 */ }
  }

  const anyConfigured = (dual.wecom && dual.wecom.configured) || (dual.feishu && dual.feishu.configured);
  sendCorsJson(res, req, 200, {
    ok: true,
    kind: 'create_project',
    proposalId: proposal.id,
    project,
    revision: state.revision,
    requestId,
    notify: !anyConfigured
      ? { configured: false, message: '未配置通知渠道（WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL），已跳过通知' }
      : {
          configured: true,
          mode: dual.queued ? 'summary' : 'dual',
          ok: dual.ok || false,
          queued: dual.queued || false,
          action: dual.action || null,
          partial: dual.partial || false,
          allFailed: dual.allFailed || false,
          message: dual.queued
            ? '已进入 30 分钟汇总队列'
            : dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
          wecom: dual.wecom,
          feishu: dual.feishu,
        },
    notifyFailed: anyConfigured && !dual.ok && !dual.queued,
    recentUpdates: recentAgentUpdates(state, 8),
  });
}
