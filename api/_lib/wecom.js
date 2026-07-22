/**
 * 企业微信群机器人通知模块（服务端专用）
 *
 * 协议：POST {"msgtype":"markdown","markdown":{"content":"..."}}
 * 成功判定：响应 JSON 必须为 {"errcode":0,"errmsg":"ok"}（企微恒返回 HTTP 200，仅看 HTTP 状态会误判）。
 *
 * 安全约定：
 *   - Webhook URL 只从服务端环境变量 WECHAT_WEBHOOK_URL 读取；
 *     永不进入客户端源码、构建产物、浏览器响应、日志或仓库；
 *   - 错误信息经过 sanitize 处理，即使底层异常携带 URL 也会被脱敏；
 *   - sendWecomMarkdown 永不抛异常，结果通过返回值表达（失败不阻断主流程）。
 */
'use strict';

const TIMEOUT_MS = 8000;

function wecomConfigured() {
  return !!process.env.WECHAT_WEBHOOK_URL;
}

/** 脱敏后的 URL 形态（仅供服务端日志排障）：协议+主机+路径，key 永不出现 */
function maskUrl(url) {
  try {
    const u = new URL(String(url || ''));
    return `${u.protocol}//${u.host}${u.pathname}?key=***`;
  } catch {
    return '(invalid-url)';
  }
}

/** 错误文本脱敏：剔除完整 URL 与 key 参数 */
function sanitize(text, url) {
  let s = String(text || '');
  if (url) s = s.split(url).join(maskUrl(url));
  s = s.replace(/key=[0-9a-fA-F-]{8,}/g, 'key=***');
  return s;
}

/** 当前北京时间（UTC+8），格式 YYYY-MM-DD HH:mm:ss */
function beijingNow(d = new Date()) {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return t.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 发送企微 markdown 消息。
 * 返回 { configured, ok, httpStatus, errcode, errmsg, error, durationMs, at }，永不抛异常。
 */
async function sendWecomMarkdown(content) {
  const url = process.env.WECHAT_WEBHOOK_URL;
  const at = new Date().toISOString();
  if (!url) {
    return { configured: false, ok: false, httpStatus: null, errcode: null, errmsg: null, error: 'WECHAT_WEBHOOK_URL 未配置', durationMs: null, at };
  }
  const started = Date.now();
  let httpStatus = null;
  let errcode = null;
  let errmsg = null;
  let ok = false;
  let error = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: String(content) } }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    httpStatus = res.status;
    if (!res.ok) {
      error = `企业微信接口返回 HTTP ${res.status}（请确认请求为 POST、Content-Type 为 application/json、URL 完整且由服务端发出）`;
    } else {
      const data = await res.json().catch(() => null);
      errcode = data && typeof data.errcode === 'number' ? data.errcode : null;
      errmsg = data && typeof data.errmsg === 'string' ? data.errmsg : null;
      if (errcode === 0 && errmsg === 'ok') {
        ok = true;
      } else {
        error = `企业微信返回错误：errcode=${errcode == null ? '—' : errcode} errmsg=${errmsg || '—'}`;
      }
    }
  } catch (e) {
    error = e && e.name === 'AbortError'
      ? `请求超时（${TIMEOUT_MS / 1000}s，请检查服务端网络/代理）`
      : sanitize((e && e.message) || e, url);
  }
  return { configured: true, ok, httpStatus, errcode, errmsg, error, durationMs: Date.now() - started, at };
}

module.exports = { wecomConfigured, maskUrl, beijingNow, sendWecomMarkdown };
