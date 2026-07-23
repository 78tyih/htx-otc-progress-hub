/**
 * POST /api/agent/archive — 归档任务（写操作）
 *
 * body: { taskId, reason?, operator? }
 * 规则：
 *   - 已完成任务可直接归档（reason 可选，作为批注）；
 *   - 未完成任务须已过截止时间才允许归档，且必须填写 reason（未完成原因）；
 *   - 归档后任务退出倒计时 / Pipeline / 待办等活跃视图，进入周度对比与复盘。
 * 流程：校验规则 → 置 archivedAt/archiveReason → 审计 → 展示层投影 → 落库 → 手机通知（失败不阻断）
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry, recentAgentUpdates } = require('../_lib/store');
const { sendPipNotification } = require('../_lib/dual');
const { beijingNow } = require('../_lib/wecom');
const { projectPresentation } = require('../../agent/presenter');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const taskId = String(body.taskId || '').toUpperCase();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const operator = String(body.operator || '').trim() || 'Sera';

    const state = await loadState();
    const task = state.tasks.tasks.find((t) => t.id === taskId);
    if (!task) return sendJson(res, 404, { ok: false, error: `未找到任务 ${taskId}` });
    if (task.archivedAt) {
      return sendJson(res, 409, { ok: false, error: `${taskId} 已于 ${String(task.archivedAt).slice(0, 16).replace('T', ' ')} 归档，请勿重复操作` });
    }

    const completed = task.status === '已完成';
    const overdue = Date.parse(task.dueAt) < Date.now();
    if (!completed && !overdue) {
      return sendJson(res, 409, { ok: false, error: `${taskId} 未完成且未过截止时间，不能归档（可先标记完成，或延期后再归档）` });
    }
    if (!completed && !reason) {
      return sendJson(res, 400, { ok: false, error: `${taskId} 未完成归档必须填写原因`, needsReason: true });
    }

    const nowIso = new Date().toISOString();
    task.archivedAt = nowIso;
    task.archiveReason = completed ? (reason || null) : reason;
    task.updatedBy = operator;
    task.updatedAt = nowIso;
    state.tasks.updatedAt = nowIso;

    appendAuditEntry(state, {
      actor: 'web',
      action: 'archive',
      taskId: task.id,
      detail: JSON.stringify({
        operator,
        previousStatus: task.status,
        completed,
        reason: task.archiveReason,
        changeSource: 'web',
      }),
    });

    // 展示层投影（归档任务退出 todo / pipeline 镜像）
    const projected = projectPresentation({ tasks: state.tasks.tasks, pipeline: state.pipeline, weeklyLog: state.weeklyLog });
    state.pipeline = projected.pipeline;
    state.weeklyLog = projected.weeklyLog;

    await saveState(state);

    // 双通道手机通知：失败不影响已落库的归档
    const dual = await sendPipNotification(state, {
      eventId: `task-archive:${task.id}:${nowIso.slice(0, 13)}`,
      title: '【PIP 任务归档】',
      lines: [
        `任务：${task.id}｜${task.title}`,
        `归档类型：${completed ? '已完成归档' : '未完成归档'}`,
        ...(task.archiveReason ? [`原因：${task.archiveReason}`] : []),
        `负责人：${task.owner || '—'}`,
        `操作人：${operator}`,
        `时间：${beijingNow()}（北京时间）`,
      ],
      linkBase: dashboardUrl(req),
      linkParams: { taskId: task.id },
    });
    if (dual.wecom.success || dual.feishu.success) {
      try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
    }

    sendJson(res, 200, {
      ok: true,
      task,
      archived: true,
      completed,
      notify: dual && dual.wecom && dual.wecom.configured === false && dual.feishu && dual.feishu.configured === false
        ? { configured: false, message: '未配置通知渠道，已跳过通知' }
        : { configured: true, ok: dual.ok, partial: dual.partial },
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
