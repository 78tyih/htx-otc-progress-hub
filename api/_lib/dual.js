/**
 * 统一双通道通知服务（服务端专用）
 *
 * 两层职责：
 *   1. sendDirect：底层直发（dualDedupe 幂等 + 双通道并行 + 失败重试一次）。
 *      供 notify-bus 的 sender 回调、显式测试端点、汇总 flush 使用。
 *   2. sendPipNotification：业务统一入口。先经 notify-bus 分级（critical 即时 / normal 入队 /
 *      silent 静默 / deduped 去重），再决定是否即时发送。返回值在 sendDirect 基础上增加
 *      { queued, action } 字段，供 confirm/archive/weekly 等调用方统一判断。
 *
 * 事件来源：调用方传入 { eventId, title, lines, ... }；本模块从 eventId 前缀推导 bus 事件
 * （task-update / task-create / task-decompose / task-archive / discover-blocked / discover-overdue /
 * weekly-archived / project-create / dual-test / commit）。也支持显式 busEvent 字段。
 *
 * 安全约定：永不抛异常；通知失败不得回滚业务数据；永不把 Webhook URL / Token 写入日志或消息。
 */
'use strict';

const { sendWecomMarkdown, wecomConfigured } = require('./wecom');
const { sendFeishuPost, feishuConfigured } = require('./feishu');
const notifyBus = require('./notify-bus');

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
 * 底层直发函数（供 notify-bus sender 回调和显式测试端点使用）。
 * 仅做 dualDedupe 幂等 + 双通道并行发送，不做分级 / 去重 / 静默判断。
 * opts: { eventId, title, lines, linkBase, linkParams }
 */
async function sendDirect(state, opts) {
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

/** 从 lines[0]（形如「任务：T-0006｜标题」）解析任务标题 */
function taskTitleFromLines(lines) {
  if (!Array.isArray(lines) || !lines[0]) return null;
  const m = String(lines[0]).match(/[^｜]*｜(.+)$/);
  return m ? m[1] : null;
}

/**
 * 从调用方 opts 推导 notify-bus 事件。调用方（confirm/archive/weekly）按历史约定只传
 * eventId + title + lines，故由 eventId 前缀编码事件类型；也支持显式 busEvent。
 */
function eventFromOpts(opts) {
  if (opts && opts.busEvent) return Object.assign({}, opts.busEvent);
  const eventId = String((opts && opts.eventId) || '');

  let m = eventId.match(/^task-update:([^:]+):/);
  if (m) {
    return {
      type: 'task', op: 'update', taskId: m[1],
      title: opts.taskTitle || taskTitleFromLines(opts.lines),
      statusBecame: opts.statusBecame || opts.status || null,
      changeText: opts.changeText || null,
      progress: typeof opts.progress === 'number' ? opts.progress : null,
    };
  }
  m = eventId.match(/^task-(create|decompose):/);
  if (m) {
    return { type: 'task', op: m[1], taskId: opts.taskId || null, title: opts.taskTitle || taskTitleFromLines(opts.lines), decomposedTo: opts.decomposedTo || null };
  }
  m = eventId.match(/^task-archive:([^:]+):/);
  if (m) {
    return { type: 'task', op: 'archive', taskId: m[1], completed: opts.completed === true, title: opts.taskTitle || taskTitleFromLines(opts.lines) };
  }
  m = eventId.match(/^discover-(blocked|overdue):([^:]+)/);
  if (m) {
    const op = m[1];
    const reason = op === 'blocked' ? '任务已阻塞，等待确认' : '任务已逾期';
    return { type: 'task', op, taskId: m[2], title: opts.taskTitle || null, reason, suggestedAction: '查看看板后处理' };
  }
  if (/^weekly-archived:/.test(eventId)) return { type: 'task', op: 'weekly', title: opts.taskTitle || opts.title };
  if (/^project-create:/.test(eventId)) return { type: 'project', op: 'create', title: opts.taskTitle || taskTitleFromLines(opts.lines) || opts.title };
  if (/^dual-test:|^notification-test:/.test(eventId)) return { type: 'notification-test' };
  if (opts && opts.commitSha) return { type: 'commit', commitSha: opts.commitSha, commitMsg: opts.commitMsg || '', project: opts.project || null };
  return null;
}

/** 跳过态（queued / silenced / deduped）下返回给调用方的渠道占位（保留 configured 诊断） */
function skippedResult() {
  return {
    wecom: { success: false, configured: wecomConfigured(), skipped: true, code: null, message: null, httpStatus: null, durationMs: null, error: null, attempts: 0 },
    feishu: { success: false, configured: feishuConfigured(), skipped: true, code: null, message: null, httpStatus: null, durationMs: null, error: null, attempts: 0 },
    ok: false, partial: false, allFailed: false,
  };
}

/**
 * 统一业务入口：经 notify-bus 分级后决定即时发送 / 入队汇总 / 静默 / 去重。
 * 返回 { wecom, feishu, ok, partial, allFailed, queued, action }。
 *   - sent-immediate：已即时双通道发送（critical）
 *   - queued / queued-paused：普通事项已入 30 分钟汇总队列（不即时发送）
 *   - silenced：test/chore/通知链路测试，仅日志
 *   - deduped：30 分钟内重复事件
 *   - sent-direct：未识别事件，直接发送（向后兼容）
 */
async function sendPipNotification(state, opts) {
  const event = eventFromOpts(opts);
  if (!event) {
    const dual = await sendDirect(state, { eventId: opts.eventId, title: opts.title, lines: opts.lines, linkBase: opts.linkBase, linkParams: opts.linkParams });
    return Object.assign({}, dual, { queued: false, action: dual.ok ? 'sent-direct' : (dual.allFailed ? 'sent-failed' : 'sent-partial') });
  }
  if (!event.linkBase) event.linkBase = opts.linkBase;
  if (!event.linkParams) event.linkParams = opts.linkParams;

  const r = await notifyBus.enqueue(state, event, { sender: sendDirect, linkBase: opts.linkBase });

  if (r.action === 'sent-immediate') {
    const dual = r.dual || Object.assign(skippedResult(), { ok: false });
    return Object.assign({}, dual, { queued: false, action: 'sent-immediate' });
  }
  if (r.action === 'queued' || r.action === 'queued-paused') {
    return Object.assign(skippedResult(), { queued: true, action: r.action });
  }
  // silenced / deduped
  return Object.assign(skippedResult(), { queued: false, action: r.action });
}

/**
 * Agent 查询发现阻塞 / 逾期任务 → 经 notify-bus 即时推送（critical）。
 * 同一任务同一类发现由 bus seen 表 30 分钟内幂等。返回 { sent }：即时发送成功的条数。
 */
async function notifyDiscoveries(state, classified, kind, dashboardUrl) {
  let sent = 0;
  for (const c of classified.slice(0, 3)) {
    const t = c.task;
    const r = await sendPipNotification(state, {
      eventId: `discover-${kind}:${t.id}`,
      busEvent: { type: 'task', op: kind, taskId: t.id, title: t.title, linkBase: dashboardUrl, linkParams: { taskId: t.id } },
      linkBase: dashboardUrl,
      linkParams: { taskId: t.id },
    });
    if (r.action === 'sent-immediate' && (r.wecom.success || r.feishu.success)) sent += 1;
  }
  return { sent };
}

module.exports = { sendPipNotification, sendDirect, channelLink, notifyDiscoveries };
