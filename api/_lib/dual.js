/**
 * 统一双通道通知服务（服务端专用）
 *
 * sendPipNotification：同一事件同时推送企业微信（Sera）与飞书（Simon）。
 *   - Promise.allSettled 并行发送：一个渠道失败绝不阻塞另一个渠道；
 *   - 每个渠道最多重试一次；单次请求超时由渠道模块控制（8s）；
 *   - 同一 eventId 同渠道不重复发送（dualDedupe 随 hub state 持久化，TTL 7 天）；
 *   - 永不抛异常；通知失败不得回滚任务数据。
 *
 * 返回：
 *   { wecom: { success, configured, skipped, code, message, httpStatus, durationMs, error, attempts },
 *     feishu: { ...同上 },
 *     ok,          // 双通道全部成功
 *     partial,     // 仅一个渠道成功（部分发送成功）
 *     allFailed }  // 两个渠道都失败（且至少一个已配置）
 */
'use strict';

const { sendWecomMarkdown } = require('./wecom');
const { sendFeishuPost } = require('./feishu');

const DEDUPE_TTL_MS = 7 * 24 * 3600 * 1000;

/** 看板深链：base + 查询参数（source 按渠道覆盖；值统一 URL 编码） */
function channelLink(base, params, source) {
  const b = String(base || '').trim().replace(/\/+$/, '');
  if (!b) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '' || k === 'source') continue;
    qs.set(k, String(v));
  }
  qs.set('source', source);
  const s = qs.toString();
  return s ? `${b}?${s}` : b;
}

/** 企微 markdown 正文：标题加粗 + 引用行 + 可点击链接 */
function toWecomMarkdown({ title, lines, href }) {
  const body = (lines || []).filter(Boolean).map((l) => `> ${l}`).join('\n');
  const link = href ? `\n[打开 PIP 绩效看板](${href})` : '';
  return `**${title}**\n${body}${link}`;
}

function ensureDualDedupe(state) {
  if (!state.notify) state.notify = {};
  if (!state.notify.dualDedupe) state.notify.dualDedupe = {};
  const now = Date.now();
  for (const [k, v] of Object.entries(state.notify.dualDedupe)) {
    if (now - Date.parse(v) > DEDUPE_TTL_MS) delete state.notify.dualDedupe[k];
  }
  return state.notify.dualDedupe;
}

/** 单渠道发送（eventId 去重 + 失败重试一次）；永不抛异常 */
async function sendChannel(channel, eventId, sendOnce, dedupe) {
  const key = `${channel}:${eventId}`;
  if (eventId && dedupe[key]) {
    return { success: true, configured: true, skipped: true, reason: '同一 eventId 已推送过', code: null, message: null, httpStatus: null, durationMs: null, error: null, attempts: 0 };
  }
  let result = await sendOnce();
  let attempts = 1;
  if (result.configured !== false && !result.ok) {
    result = await sendOnce(); // 最多重试一次
    attempts = 2;
  }
  const at = result.at || new Date().toISOString();
  if (result.ok && eventId) dedupe[key] = at;
  return {
    success: result.ok === true,
    configured: result.configured !== false,
    skipped: false,
    code: result.errcode !== undefined ? result.errcode : result.code,
    message: result.errmsg !== undefined ? result.errmsg : result.message,
    httpStatus: result.httpStatus != null ? result.httpStatus : null,
    durationMs: result.durationMs != null ? result.durationMs : null,
    error: result.error || null,
    at,
    attempts,
  };
}

/**
 * 统一入口。
 * opts: { eventId, title, lines, linkBase, linkParams }
 *   linkBase: dashboardUrl（已校验非本机）；linkParams: { section | taskId | week, ... }（source 自动按渠道覆盖）
 */
async function sendPipNotification(state, opts) {
  const eventId = String(opts.eventId || '').slice(0, 200);
  const title = String(opts.title || 'PIP 项目更新');
  const lines = Array.isArray(opts.lines) ? opts.lines.map((l) => String(l)) : [];
  const dedupe = ensureDualDedupe(state);

  const hrefWecom = channelLink(opts.linkBase, opts.linkParams, 'wecom');
  const hrefFeishu = channelLink(opts.linkBase, opts.linkParams, 'feishu');

  const [wecomSettled, feishuSettled] = await Promise.allSettled([
    sendChannel('wecom', eventId, () => sendWecomMarkdown(toWecomMarkdown({ title, lines, href: hrefWecom })), dedupe),
    sendChannel('feishu', eventId, () => sendFeishuPost({ title, lines, linkText: '打开 PIP 绩效看板', href: hrefFeishu }), dedupe),
  ]);
  const wecom = wecomSettled.status === 'fulfilled'
    ? wecomSettled.value
    : { success: false, configured: true, skipped: false, code: null, message: null, httpStatus: null, durationMs: null, error: String(wecomSettled.reason), attempts: 1 };
  const feishu = feishuSettled.status === 'fulfilled'
    ? feishuSettled.value
    : { success: false, configured: true, skipped: false, code: null, message: null, httpStatus: null, durationMs: null, error: String(feishuSettled.reason), attempts: 1 };

  // 分渠道最近成功时间（供系统状态展示）
  if (!state.notify.channelStatus) state.notify.channelStatus = {};
  for (const [ch, r] of [['wecom', wecom], ['feishu', feishu]]) {
    if (r.success && !r.skipped) {
      state.notify.channelStatus[ch] = Object.assign({}, state.notify.channelStatus[ch], { lastSuccessAt: r.at });
    }
  }

  const ok = wecom.success && feishu.success;
  const partial = !ok && (wecom.success || feishu.success);
  const anyConfigured = wecom.configured || feishu.configured;
  const allFailed = anyConfigured && !wecom.success && !feishu.success;
  return { wecom, feishu, ok, partial, allFailed };
}

/**
 * Agent 查询发现阻塞/逾期任务 → 双通道逐个推送（最多 3 条）。
 * eventId 按小时分桶：同一任务同一类发现一小时内不重复推送；永不抛异常。
 * 返回 { sent }：sent 为至少一个渠道真实发送成功（非跳过）的条数。
 */
async function notifyDiscoveries(state, classified, kind, dashboardUrl) {
  const label = kind === 'blocked' ? '阻塞' : '逾期';
  const bucket = new Date().toISOString().slice(0, 13);
  let sent = 0;
  for (const c of classified.slice(0, 3)) {
    const t = c.task;
    const r = await sendPipNotification(state, {
      eventId: `discover-${kind}:${t.id}:${bucket}`,
      title: `【PIP ${label}提醒】`,
      lines: [
        `PIP 助手发现${label}任务`,
        `任务：${t.id}｜${t.title}`,
        `状态：${t.status}`,
        `负责人：${t.owner}`,
      ],
      linkBase: dashboardUrl,
      linkParams: { taskId: t.id },
    });
    if ((r.wecom.success && !r.wecom.skipped) || (r.feishu.success && !r.feishu.skipped)) sent += 1;
  }
  return { sent };
}

module.exports = { sendPipNotification, channelLink, notifyDiscoveries };
