/**
 * HTTP 小工具：JSON 响应、请求体读取、方法守卫（Vercel Functions 与本地 dev-server 共用）
 */
'use strict';

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(body);
}

/** 读取 JSON 请求体（Vercel 会自动解析 req.body；本地 dev-server 会预填 req.body） */
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function methodGuard(req, res, method) {
  if (req.method === method) return true;
  sendJson(res, 405, { ok: false, error: `Method Not Allowed（应为 ${method}）` });
  return false;
}

/** 主机名是否为本机/局域网（通知链接禁止出现此类地址） */
function isLocalHost(host) {
  const h = String(host || '').trim().toLowerCase();
  if (!h) return true;
  const name = h.split(':')[0].replace(/^\[|\]$/g, '');
  if (name === 'localhost' || name.endsWith('.localhost')) return true;
  if (name === '0.0.0.0' || /^127\./.test(name)) return true;
  if (/^10\./.test(name) || /^192\.168\./.test(name)) return true;
  const m = name.match(/^172\.(\d{1,3})\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

/** 环境变量来源清洗：去首尾空白与末尾斜杠，本机/局域网地址视为非法返回空 */
function safeEnvUrl(value) {
  const v = String(value || '').trim().replace(/\/+$/, '');
  if (!v) return '';
  let host = '';
  try { host = new URL(v).host; } catch { host = v.replace(/^https?:\/\//i, '').split('/')[0]; }
  return isLocalHost(host) ? '' : v;
}

/** 线上看板地址：PIP_DASHBOARD_URL 优先，其次 APP_URL，其次请求推导；本机/局域网来源一律跳过 */
function dashboardUrl(req) {
  const fromEnv = safeEnvUrl(process.env.PIP_DASHBOARD_URL) || safeEnvUrl(process.env.APP_URL);
  if (fromEnv) return fromEnv;
  const host = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  if (!host || isLocalHost(host)) return '';
  return `https://${host}`;
}

/** 看板深链：dashboardUrl + 查询参数（值为字符串化并 URL 编码；空对象返回裸地址） */
function sectionUrl(req, params) {
  const base = dashboardUrl(req);
  if (!base) return '';
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.set(k, String(v));
  return `${base}?${qs.toString()}`;
}

module.exports = { sendJson, readBody, methodGuard, dashboardUrl, sectionUrl };
