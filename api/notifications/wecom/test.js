/**
 * POST /api/notifications/wecom/test — 发送企微手机通知测试，返回完整诊断
 *
 * 受保护约定：
 *   - 仅接受 POST；webhook URL 只从服务端环境变量读取，接口不接受任何 URL 参数；
 *   - 响应永不包含完整 URL 或 key；线上由 Vercel Authentication 整体保护。
 *
 * 响应：{ ok, configured, requestedAt, httpStatus, errcode, errmsg, durationMs, error, lastSuccessAt }
 * 失败时 error 为真实原因（HTTP 状态 / errcode / 超时 / 网络异常），绝不假装成功。
 */
'use strict';

const { sendJson, readBody, methodGuard } = require('../../_lib/http');
const { loadState, saveState } = require('../../_lib/store');
const { wecomConfigured, beijingNow, sendWecomMarkdown } = require('../../_lib/wecom');

/** 测试消息正文（企微 markdown） */
function buildTestContent() {
  return (
    '【HTX OTC PIP 看板】\n' +
    '手机通知测试成功\n' +
    'PIP 助手已连接企业微信机器人\n' +
    '交付进度：\n' +
    '- OTC 设计交付包：已交付\n' +
    '- 设计团队交互包：已传回品牌技能包\n' +
    `发送时间：${beijingNow()}（北京时间）`
  );
}

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    await readBody(req); // 兼容空 body；operator 仅用于前端展示，不进入消息

    if (!wecomConfigured()) {
      return sendJson(res, 200, {
        ok: false,
        configured: false,
        error: 'WECHAT_WEBHOOK_URL 未配置（请在部署平台环境变量中设置，勿使用 NEXT_PUBLIC_ 前缀）',
        requestedAt: new Date().toISOString(),
      });
    }

    const state = await loadState();
    const result = await sendWecomMarkdown(buildTestContent());

    state.notify.lastTest = {
      at: result.at,
      ok: result.ok,
      httpStatus: result.httpStatus,
      errcode: result.errcode,
      errmsg: result.errmsg,
      durationMs: result.durationMs,
      error: result.error,
    };
    if (result.ok) state.notify.lastSuccessAt = result.at;
    if (!state.notify.channelStatus) state.notify.channelStatus = {};
    state.notify.channelStatus.wecom = {
      lastTest: {
        at: result.at,
        ok: result.ok,
        httpStatus: result.httpStatus,
        code: result.errcode,
        message: result.errmsg,
        durationMs: result.durationMs,
        error: result.error,
      },
      lastSuccessAt: result.ok ? result.at : (state.notify.channelStatus.wecom || {}).lastSuccessAt || null,
    };
    try { await saveState(state); } catch { /* 诊断状态丢失不阻断 */ }

    sendJson(res, 200, {
      ok: result.ok,
      configured: true,
      requestedAt: result.at,
      httpStatus: result.httpStatus,
      errcode: result.errcode,
      errmsg: result.errmsg,
      durationMs: result.durationMs,
      error: result.error,
      lastSuccessAt: state.notify.lastSuccessAt || null,
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
