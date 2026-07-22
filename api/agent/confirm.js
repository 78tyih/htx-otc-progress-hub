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
const { sendPipNotification } = require('../_lib/dual');
const { beijingNow } = require('../_lib/wecom');
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

    // 双通道手机通知：企业微信（Sera）+ 飞书（Simon），失败不影响已落库的状态更新
    const dual = await sendPipNotification(state, {
      eventId: `task-status:${task.id}:${newStatus}:${nowIso.slice(0, 13)}`, // 小时分桶：同时段防重，后续真实变更仍可推送
      title: '【PIP 任务状态更新】',
      lines: [
        `任务：${task.id}｜${task.title}`,
        `原状态：${previousStatus}`,
        `新状态：${newStatus}`,
        `负责人：${task.owner || '—'}`,
        `操作人：${operator}`,
        `时间：${beijingNow()}（北京时间）`,
      ],
      linkBase: dashboardUrl(req),
      linkParams: { taskId: task.id },
    });
    // 通知防重复/分渠道最近成功时间有变更时尽力二次落库
    if (dual.wecom.success || dual.feishu.success) {
      try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }
    }

    const anyConfigured = dual.wecom.configured || dual.feishu.configured;
    sendJson(res, 200, {
      ok: true,
      task,
      previousStatus,
      newStatus,
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
