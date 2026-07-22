/**
 * 飞书群机器人通知模块（服务端专用）
 *
 * 协议：POST 富文本消息 {"msg_type":"post","content":{"post":{"zh_cn":{title,content}}}}
 * 成功判定（必须解析业务返回值，不得只看 HTTP 200）：
 *   新版：{"code":0,"msg":"success"}  或  旧版：{"StatusCode":0,"StatusMessage":"success"}
 *
 * 安全约定：
 *   - Webhook URL 只从服务端环境变量 FEISHU_WEBHOOK_URL 读取；
 *     永不进入客户端源码、构建产物、浏览器响应、日志或仓库；
 *   - 错误信息经过 sanitize 处理（脱敏完整 URL 与 key）；
 *   - sendFeishuPost 永不抛异常，结果通过返回值表达（失败不阻断主流程、不影响企微渠道）。
 */
'use strict';

const TIMEOUT_MS = 8000;

function feishuConfigured() {
  return !!process.env.FEISHU_WEBHOOK_URL;
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

/** 错误文本脱敏：剔除完整 URL 与常见 key/token 参数 */
function sanitize(text, url) {
  let s = String(text || '');
  if (url) s = s.split(url).join(maskUrl(url));
  s = s.replace(/(key|token)=[0-9a-zA-Z-]{8,}/g, '$1=***');
  return s;
}

/**
 * 组装飞书富文本消息体。
 * lines: string[]（每个元素一行）；href 存在时追加一行可点击链接。
 */
function buildFeishuPost({ title, lines, linkText, href }) {
  const content = (lines || []).filter(Boolean).map((line) => [{ tag: 'text', text: String(line) }]);
  if (href) content.push([{ tag: 'a', text: linkText || '打开 PIP 绩效看板', href: String(href) }]);
  return { msg_type: 'post', content: { post: { zh_cn: { title: String(title || 'PIP 项目更新'), content } } } };
}

/**
 * 发送飞书富文本消息。
 * 返回 { configured, ok, httpStatus, code, message, error, durationMs, at }，永不抛异常。
 */
async function sendFeishuPost({ title, lines, linkText, href }) {
  const url = process.env.FEISHU_WEBHOOK_URL;
  const at = new Date().toISOString();
  if (!url) {
    return { configured: false, ok: false, httpStatus: null, code: null, message: null, error: 'FEISHU_WEBHOOK_URL 未配置', durationMs: null, at };
  }
  const started = Date.now();
  let httpStatus = null;
  let code = null;
  let message = null;
  let ok = false;
  let error = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildFeishuPost({ title, lines, linkText, href })),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    httpStatus = res.status;
    if (!res.ok) {
      error = `飞书接口返回 HTTP ${res.status}（请确认请求为 POST、Content-Type 为 application/json、URL 完整且由服务端发出）`;
    } else {
      const data = await res.json().catch(() => null);
      // 兼容两种成功结构：{code:0} 或 {StatusCode:0}
      const bizCode = data && typeof data.code === 'number' ? data.code
        : data && typeof data.StatusCode === 'number' ? data.StatusCode : null;
      const bizMsg = data && typeof data.msg === 'string' ? data.msg
        : data && typeof data.StatusMessage === 'string' ? data.StatusMessage : null;
      code = bizCode;
      message = bizMsg;
      if (bizCode === 0) {
        ok = true;
      } else {
        error = `飞书返回错误：code=${bizCode == null ? '—' : bizCode} msg=${bizMsg || '—'}`;
      }
    }
  } catch (e) {
    error = e && e.name === 'AbortError'
      ? `请求超时（${TIMEOUT_MS / 1000}s，请检查服务端网络/代理）`
      : sanitize((e && e.message) || e, url);
  }
  return { configured: true, ok, httpStatus, code, message, error, durationMs: Date.now() - started, at };
}

module.exports = { feishuConfigured, maskUrl, buildFeishuPost, sendFeishuPost };
