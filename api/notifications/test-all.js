/**
 * POST /api/notifications/test-all — 双通道连接测试（企业微信 + 飞书同时推送）
 *
 * 受保护约定：仅接受 POST；webhook URL 只从服务端环境变量读取；
 * 响应永不包含完整 URL 或 key；线上由 Vercel Authentication 整体保护。
 *
 * 响应：{ ok, partial, allFailed, message, requestedAt, wecom: {...}, feishu: {...} }
 *   ok        双通道推送成功
 *   partial   部分发送成功（仅一个渠道成功）
 *   allFailed 双通道均失败（至少一个渠道已配置）
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState } = require('../_lib/store');
const { wecomConfigured, beijingNow } = require('../_lib/wecom');
const { feishuConfigured } = require('../_lib/feishu');
const { sendPipNotification } = require('../_lib/dual');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    await readBody(req); // 兼容空 body

    if (!wecomConfigured() && !feishuConfigured()) {
      return sendJson(res, 200, {
        ok: false,
        configured: false,
        error: 'WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL 均未配置（请在部署平台环境变量中设置，勿使用 NEXT_PUBLIC_ 前缀）',
        requestedAt: new Date().toISOString(),
      });
    }

    const state = await loadState();
    const dual = await sendPipNotification(state, {
      eventId: `dual-test:${beijingNow().slice(0, 16)}`, // 分钟分桶：连点防重，稍后仍可再测
      title: '【PIP 双通道通知测试】',
      lines: [
        '企业微信与飞书通知已经连接。',
        '本次测试：',
        '- 企业微信机器人：连接测试（供 Sera 查看）',
        '- 飞书机器人：连接测试（供 Simon 实时查看）',
        '- 看板超链接：手机端打开测试',
        `测试时间：${beijingNow()}（北京时间）`,
      ],
      linkBase: dashboardUrl(req),
      linkParams: {},
    });

    if (!state.notify.channelStatus) state.notify.channelStatus = {};
    for (const ch of ['wecom', 'feishu']) {
      const r = dual[ch];
      state.notify.channelStatus[ch] = Object.assign({}, state.notify.channelStatus[ch], {
        lastTest: { at: r.at, ok: r.success, httpStatus: r.httpStatus, code: r.code, message: r.message, durationMs: r.durationMs, error: r.error },
      });
      if (r.success) state.notify.channelStatus[ch].lastSuccessAt = r.at;
    }
    if (dual.wecom.success) state.notify.lastSuccessAt = dual.wecom.at;
    try { await saveState(state); } catch { /* 诊断状态丢失不阻断 */ }

    sendJson(res, 200, {
      ok: dual.ok,
      partial: dual.partial,
      allFailed: dual.allFailed,
      configured: true,
      message: dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
      requestedAt: dual.wecom.at || dual.feishu.at,
      wecom: dual.wecom,
      feishu: dual.feishu,
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
