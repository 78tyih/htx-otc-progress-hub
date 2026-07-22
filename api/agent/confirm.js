/**
 * POST /api/agent/confirm — 确认执行任务状态变更（写操作唯一入口）
 *
 * body: { taskId, newStatus, evidence?, operator? }
 * 流程：校验状态机 → 应用变更 → 记录 updatedAt/updatedBy/previousStatus/newStatus/
 *       completionEvidence/changeSource → 审计 → 展示层投影 → 手机通知（失败不阻断）
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry, recentAgentUpdates } = require('../_lib/store');
const { sendWebhook } = require('../_lib/notify');
const { STATUS_TRANSITIONS, TASK_STATUSES } = require('../../agent/schema');
const { projectPresentation } = require('../../agent/presenter');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const taskId = String(body.taskId || '').toUpperCase();
    const newStatus = String(body.newStatus || '');
    const evidence = typeof body.evidence === 'string' ? body.evidence.trim() : '';
    const operator = String(body.operator || '').trim() || 'Sera';

    if (!TASK_STATUSES.includes(newStatus)) {
      return sendJson(res, 400, { ok: false, error: `非法目标状态「${newStatus}」` });
    }

    const state = await loadState();
    const task = state.tasks.tasks.find((t) => t.id === taskId);
    if (!task) return sendJson(res, 404, { ok: false, error: `未找到任务 ${taskId}` });

    const previousStatus = task.status;
    if (previousStatus === newStatus) {
      return sendJson(res, 200, { ok: true, noop: true, message: `${taskId} 已处于「${newStatus}」`, task });
    }
    const allowed = STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(newStatus)) {
      return sendJson(res, 409, { ok: false, error: `不允许从「${previousStatus}」迁移到「${newStatus}」` });
    }

    // 应用变更
    const nowIso = new Date().toISOString();
    task.status = newStatus;
    if (newStatus === '已完成') {
      task.progress = 100;
      task.completedAt = nowIso;
      if (evidence) {
        task.completionEvidence = evidence;
        task.result = evidence;
      }
    }
    task.updatedBy = operator;
    task.updatedAt = nowIso;
    state.tasks.updatedAt = nowIso;

    // 审计（changeSource: agent）
    appendAuditEntry(state, {
      actor: 'web',
      action: 'agent-update',
      taskId: task.id,
      detail: JSON.stringify({
        operator,
        previousStatus,
        newStatus,
        completionEvidence: task.completionEvidence || null,
        changeSource: 'agent',
      }),
    });

    // 展示层投影（todo 读取时实时投影，这里更新 pipeline / weekly-log）
    const projected = projectPresentation({ tasks: state.tasks.tasks, pipeline: state.pipeline, weeklyLog: state.weeklyLog });
    state.pipeline = projected.pipeline;
    state.weeklyLog = projected.weeklyLog;

    // 先落库（校验失败则不会有任何通知，杜绝“幽灵推送”）
    await saveState(state);

    // 手机通知（失败不影响已落库的状态更新）
    const notify = await sendWebhook(state, {
      event: 'task_status_changed',
      task,
      previousStatus,
      newStatus,
      operator,
      message: `${task.id}｜${task.title} 已更新为 ${newStatus === '已完成' ? 'done' : 'in_progress'}`,
      dashboardUrl: dashboardUrl(req),
    });
    // 通知防重复/最近成功时间有变更时尽力二次落库
    if (notify.ok || notify.skipped) {
      try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
    }

    sendJson(res, 200, {
      ok: true,
      task,
      previousStatus,
      newStatus,
      notify: notify.configured === false
        ? { configured: false, message: '未配置 NOTIFY_WEBHOOK_URL，已跳过通知' }
        : notify,
      notifyFailed: notify.configured !== false && !notify.ok && !notify.skipped,
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
