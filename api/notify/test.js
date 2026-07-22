/**
 * POST /api/notify/test — 发送测试手机通知，返回完整诊断
 *
 * 诊断包含：请求时间 / HTTP 状态码 / 是否成功 / 响应耗时 / 错误原因 / 最近一次成功时间。
 * 测试通知不受防重复限制，但会记录 lastTest 供状态面板展示。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState } = require('../_lib/store');
const { sendWebhook, webhookConfigured } = require('../_lib/notify');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const operator = String(body.operator || '').trim() || 'Sera';

    if (!webhookConfigured()) {
      return sendJson(res, 200, {
        ok: false,
        configured: false,
        error: 'NOTIFY_WEBHOOK_URL 未配置（请在部署平台环境变量中设置）',
        requestedAt: new Date().toISOString(),
      });
    }

    const state = await loadState();
    const fakeTask = { id: 'TEST', title: '手机通知联调测试', updatedBy: operator };
    const result = await sendWebhook(state, {
      event: 'test_notification',
      task: fakeTask,
      previousStatus: null,
      newStatus: null,
      operator,
      message: `HTX OTC 看板测试通知（由 ${operator} 手动触发）`,
      dashboardUrl: dashboardUrl(req),
      skipDedupe: true,
    });

    state.notify.lastTest = {
      at: result.at || new Date().toISOString(),
      ok: result.ok,
      httpStatus: result.httpStatus || null,
      durationMs: result.durationMs != null ? result.durationMs : null,
      error: result.error || null,
    };
    await saveState(state);

    sendJson(res, 200, {
      ok: result.ok,
      configured: true,
      requestedAt: state.notify.lastTest.at,
      httpStatus: state.notify.lastTest.httpStatus,
      durationMs: state.notify.lastTest.durationMs,
      error: state.notify.lastTest.error,
      lastSuccessAt: state.notify.lastSuccessAt || null,
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
