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

/** 从请求推导线上看板地址（零配置） */
function dashboardUrl(req) {
  const host = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  return host ? `https://${host}` : '';
}

module.exports = { sendJson, readBody, methodGuard, dashboardUrl };
