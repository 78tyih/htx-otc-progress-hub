/**
 * POST /api/notifications/feishu/test — 发送飞书手机通知测试，返回完整诊断
 *
 * 受保护约定（与 wecom/test.js 一致）：
 *   - 仅接受 POST；webhook URL 只从服务端环境变量 FEISHU_WEBHOOK_URL 读取，接口不接受任何 URL 参数；
 *   - 响应永不包含完整 URL 或 key；线上由 Vercel Authentication 整体保护。
 *
 * 成功判定：业务返回值 code===0 或 StatusCode===0（不得只看 HTTP 200）。
 * 响应：{ ok, configured, requestedAt, httpStatus, code, message, durationMs, error, lastSuccessAt }
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../../_lib/http');
const { loadState, saveState } = require('../../_lib/store');
const { beijingNow } = require('../../_lib/wecom');
const { feishuConfigured, sendFeishuPost } = require('../../_lib/feishu');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    await readBody(req); // 兼容空 body；operator 仅用于前端展示，不进入消息

    if (!feishuConfigured()) {
      return sendJson(res, 200, {
        ok: false,
        configured: false,
        error: 'FEISHU_WEBHOOK_URL 未配置（请在部署平台环境变量中设置，勿使用 NEXT_PUBLIC_ 前缀）',
        requestedAt: new Date().toISOString(),
      });
    }

    const state = await loadState();
    const result = await sendFeishuPost({
      title: '【PIP 飞书通知测试】',
      lines: [
        '飞书机器人连接测试成功',
        'PIP 助手已连接飞书机器人（供 Simon 实时查看）',
        `发送时间：${beijingNow()}（北京时间）`,
      ],
      linkText: '打开 PIP 绩效看板',
      href: dashboardUrl(req) ? `${dashboardUrl(req)}?source=feishu` : '',
    });

    if (!state.notify.channelStatus) state.notify.channelStatus = {};
    state.notify.channelStatus.feishu = {
      lastTest: {
        at: result.at,
        ok: result.ok,
        httpStatus: result.httpStatus,
        code: result.code,
        message: result.message,
        durationMs: result.durationMs,
        error: result.error,
      },
      lastSuccessAt: result.ok ? result.at : (state.notify.channelStatus.feishu || {}).lastSuccessAt || null,
    };
    try { await saveState(state); } catch { /* 诊断状态丢失不阻断 */ }

    sendJson(res, 200, {
      ok: result.ok,
      configured: true,
      requestedAt: result.at,
      httpStatus: result.httpStatus,
      code: result.code,
      message: result.message,
      durationMs: result.durationMs,
      error: result.error,
      lastSuccessAt: state.notify.channelStatus.feishu.lastSuccessAt || null,
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
