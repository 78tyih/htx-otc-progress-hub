/**
 * POST /api/agent/confirm — 确认执行 PIP 任务变更（写操作唯一入口）
 *
 * body: { taskId, patch?: { status?, progress?, nextAction? }, newStatus?, evidence?, operator? }
 * newStatus 为旧版兼容字段。所有字段经过白名单、状态机和 schema 校验。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry, recentAgentUpdates, useKv } = require('../_lib/store');
const { sendPipNotification } = require('../_lib/dual');
const { beijingNow } = require('../_lib/wecom');
const { projectPresentation } = require('../../agent/presenter');
const { patchFromRequest } = require('../_lib/copilot');

function displayValue(field, value) {
  if (value == null || value === '') return '—';
  return field === 'progress' ? String(value) + '%' : String(value);
}

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    // Vercel 的函数文件系统不可持久写入，提前返回可操作的配置提示。
    if (process.env.VERCEL && !useKv()) {
      return sendJson(res, 503, {
        ok: false,
        error: '线上任务写入尚未配置 KV。请在 Vercel 设置 KV_REST_API_URL 和 KV_REST_API_TOKEN 后重新部署。',
      });
    }

    const body = await readBody(req);
    const taskId = String(body.taskId || '').toUpperCase();
    const evidence = typeof body.evidence === 'string' ? body.evidence.trim() : '';
    const operator = String(body.operator || '').trim() || 'Sera';

    const state = await loadState();
    const task = state.tasks.tasks.find((item) => item.id === taskId);
    if (!task) return sendJson(res, 404, { ok: false, error: '未找到任务 ' + taskId });

    const previousStatus = task.status;
    const candidate = patchFromRequest(body, task);
    if (candidate.error) return sendJson(res, 409, { ok: false, error: candidate.error });
    if (!candidate.changes.length) {
      return sendJson(res, 200, {
        ok: true,
        noop: true,
        message: taskId + ' 的任务数据没有变化',
        task,
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
      }),
    });

    const projected = projectPresentation({
      tasks: state.tasks.tasks,
      pipeline: state.pipeline,
      weeklyLog: state.weeklyLog,
    });
    state.pipeline = projected.pipeline;
    state.weeklyLog = projected.weeklyLog;

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
        '变更：' + changeText,
        '负责人：' + (task.owner || '—'),
        '操作人：' + operator,
        '时间：' + beijingNow() + '（北京时间）',
      ],
      linkBase: dashboardUrl(req),
      linkParams: { taskId: task.id },
    });
    if (dual.wecom.success || dual.feishu.success) {
      try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
    }

    const anyConfigured = dual.wecom.configured || dual.feishu.configured;
    sendJson(res, 200, {
      ok: true,
      task,
      previousStatus,
      newStatus: task.status,
      changes: candidate.changes,
      notify: !anyConfigured
        ? { configured: false, message: '未配置通知渠道（WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL），已跳过通知' }
        : {
            configured: true,
            mode: 'dual',
            ok: dual.ok,
            partial: dual.partial,
            allFailed: dual.allFailed,
            message: dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
            wecom: dual.wecom,
            feishu: dual.feishu,
          },
      notifyFailed: anyConfigured && !dual.ok,
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
