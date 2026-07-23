/**
 * POST /api/notifications/test?channel=wecom|feishu — 单通道手机通知测试，返回完整诊断
 * （由 wecom/test + feishu/test 合并：Vercel Hobby 计划单部署上限 12 个 Serverless Functions）
 *
 * 受保护约定：
 *   - 仅接受 POST；webhook URL 只从服务端环境变量读取，接口不接受任何 URL 参数；
 *   - 响应永不包含完整 URL 或 key；线上由 Vercel Authentication 整体保护。
 *
 * channel 取自 query 或 body；缺省 wecom。响应字段与原单通道接口保持一致。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState } = require('../_lib/store');
const { wecomConfigured, beijingNow, sendWecomMarkdown } = require('../_lib/wecom');
const { feishuConfigured, sendFeishuPost } = require('../_lib/feishu');

/** 企微测试消息正文（markdown） */
function buildWecomTestContent() {
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

async function testWecom(req, res) {
  if (!wecomConfigured()) {
    return sendJson(res, 200, {
      ok: false,
      configured: false,
      error: 'WECHAT_WEBHOOK_URL 未配置（请在部署平台环境变量中设置，勿使用 NEXT_PUBLIC_ 前缀）',
      requestedAt: new Date().toISOString(),
    });
  }

  const state = await loadState();
  const result = await sendWecomMarkdown(buildWecomTestContent());

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
}

async function testFeishu(req, res) {
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
}

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req); // 兼容空 body；operator 仅用于前端展示，不进入消息
    const q = (req.url && req.url.includes('?'))
      ? new URL(req.url, 'http://localhost').searchParams.get('channel')
      : null;
    const channel = String(q || (body && body.channel) || 'wecom').toLowerCase();
    if (channel === 'feishu') return await testFeishu(req, res);
    if (channel === 'wecom') return await testWecom(req, res);
    sendJson(res, 400, { ok: false, error: `未知 channel：${channel}（可选 wecom / feishu）` });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
