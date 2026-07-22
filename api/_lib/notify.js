/**
 * 手机 Webhook 通知模块（服务端专用）
 *
 * 安全约定：WECHAT_WEBHOOK_URL 只存在于环境变量，
 * 永不进入客户端源码、构建产物、日志或仓库；服务端日志/错误信息必须脱敏（不得包含完整 URL 或 key）。
 *
 * 统一 POST JSON 载荷（event/title/message/taskId/taskName/previousStatus/newStatus/operator/timestamp/dashboardUrl）。
 * 防重复：同一 event + 任务 + 目标状态 10 分钟内只发一次（dedupe 状态随 hub state 持久化）。
 * 失败不阻断主流程：sendWebhook 永不抛异常，结果通过返回值表达。
 */
'use strict';

const { STATUS_EN } = require('../../agent/classify');

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const DEDUPE_TTL_MS = 24 * 3600 * 1000;
const TIMEOUT_MS = 8000;

function webhookConfigured() {
  return !!process.env.WECHAT_WEBHOOK_URL;
}

function buildPayload({ event, task, previousStatus, newStatus, operator, message, dashboardUrl }) {
  const prevEn = STATUS_EN[previousStatus] || previousStatus || null;
  const newEn = STATUS_EN[newStatus] || newStatus || null;
  return {
    event,
    title: 'HTX OTC 看板任务更新',
    message: message || `${task.id}｜${task.title} 已更新为 ${newEn}`,
    taskId: task.id,
    taskName: task.title,
    previousStatus: prevEn,
    newStatus: newEn,
    operator: operator || task.updatedBy || 'agent',
    timestamp: new Date().toISOString(),
    dashboardUrl: dashboardUrl || '',
  };
}

/** 企业微信群机器人 webhook？（其 API 只接受 msgtype 结构，通用 JSON 会被拒） */
function isWecomUrl(url) {
  return /qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send/.test(String(url || ''));
}

/** 企微 markdown 消息体（支持：加粗 / 引用 / 链接 / 字体颜色 info·comment·warning） */
function toWecomBody(p) {
  const statusLine = p.previousStatus || p.newStatus
    ? `\n> 状态：<font color="comment">${p.previousStatus || '—'}</font> → <font color="info">${p.newStatus || '—'}</font>`
    : '';
  const link = p.dashboardUrl ? `\n[打开看板](${p.dashboardUrl})` : '';
  return {
    msgtype: 'markdown',
    markdown: {
      content:
        `**${p.title}**\n` +
        `> 任务：${p.taskId}｜${p.taskName}${statusLine}\n` +
        `> 操作人：${p.operator}\n` +
        `> 时间：${p.timestamp.replace('T', ' ').slice(0, 19)}${link}`,
    },
  };
}

/** 发送 Webhook（带防重复）；返回诊断信息，永不抛异常 */
async function sendWebhook(state, opts) {
  const url = process.env.WECHAT_WEBHOOK_URL;
  if (!url) return { configured: false, ok: false, skipped: false, error: 'WECHAT_WEBHOOK_URL 未配置' };

  const payload = buildPayload(opts);
  const key = `${opts.event}:${payload.taskId}:${payload.newStatus || ''}`;
  const now = Date.now();
  const last = state.notify.dedupe[key];
  if (!opts.skipDedupe && last && now - Date.parse(last) < DEDUPE_WINDOW_MS) {
    return { configured: true, ok: true, skipped: true, reason: '10 分钟内同任务同状态已推送过', payload };
  }

  const started = Date.now();
  let httpStatus = null;
  let ok = false;
  let error = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const headers = { 'content-type': 'application/json' };
    // 企微机器人：换用 msgtype 结构；响应恒为 HTTP 200，须看 errcode
    const wecom = isWecomUrl(url);
    const body = wecom ? toWecomBody(payload) : payload;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    clearTimeout(timer);
    httpStatus = res.status;
    if (!res.ok) {
      error = `Webhook 返回 HTTP ${res.status}`;
    } else if (wecom) {
      const data = await res.json().catch(() => null);
      if (data && data.errcode === 0) ok = true;
      else error = `企微返回错误：errcode=${data && data.errcode} ${(data && data.errmsg) || ''}`.trim();
    } else {
      ok = true;
    }
  } catch (e) {
    error = e && e.name === 'AbortError' ? `请求超时（${TIMEOUT_MS / 1000}s）` : String((e && e.message) || e);
  }
  const durationMs = Date.now() - started;
  const at = new Date().toISOString();

  if (ok) {
    state.notify.dedupe[key] = at;
    state.notify.lastSuccessAt = at;
  }
  // 清理过期 dedupe 记录
  for (const [k, v] of Object.entries(state.notify.dedupe)) {
    if (now - Date.parse(v) > DEDUPE_TTL_MS) delete state.notify.dedupe[k];
  }

  return { configured: true, ok, skipped: false, httpStatus, durationMs, error, at, payload };
}

/** Agent 查询时发现阻塞/逾期任务 → 逐个推送（受防重复约束），返回已发送条数 */
async function notifyDiscoveries(state, classified, kind, dashboardUrl) {
  if (!webhookConfigured()) return { sent: 0 };
  const event = kind === 'blocked' ? 'task_blocked' : 'task_overdue';
  const label = kind === 'blocked' ? '阻塞任务' : '逾期任务';
  let sent = 0;
  for (const c of classified.slice(0, 3)) {
    const r = await sendWebhook(state, {
      event,
      task: c.task,
      previousStatus: c.task.status,
      newStatus: c.task.status,
      operator: 'agent',
      message: `PIP 助手发现${label}：${c.task.id}｜${c.task.title}（${c.task.status}，负责人 ${c.task.owner}）`,
      dashboardUrl,
    });
    if (r.ok && !r.skipped) sent += 1;
  }
  return { sent };
}

module.exports = { webhookConfigured, buildPayload, sendWebhook, notifyDiscoveries };
