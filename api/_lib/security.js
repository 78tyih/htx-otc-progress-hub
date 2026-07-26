/**
 * PIP Agent API 访问控制（服务端专用）
 *
 * 规则：
 *   - 外部 Agent 调用：必须 `Authorization: Bearer <PIP_AGENT_API_TOKEN>`，命中 401/403；
 *   - 看板前端（同源浏览器请求，由部署平台访问控制保护）：不带 Token 也放行；
 *   - 跨源请求：Origin 必须列入 PIP_ALLOWED_ORIGINS 且 Bearer 有效，否则 403/401；
 *   - Token 只允许放在 Authorization 头，禁止 URL Query 传递；
 *   - 每请求生成 requestId；基础限流（单实例内存滑动窗口）+ 请求体大小限制；
 *   - 任何响应/日志永不输出 Token、Webhook 或环境变量值。
 */
'use strict';

const { newRequestId } = require('./agent-protocol');

const RATE_LIMIT = Number(process.env.PIP_AGENT_RATE_LIMIT || 60); // 次/分钟/IP
const RATE_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = Number(process.env.PIP_AGENT_MAX_BODY || 64 * 1024); // 64KB

/** 单实例内存滑动窗口限流（serverless 多实例不共享，仅作基础防护） */
const buckets = new Map();
function rateLimitOk(key) {
  const now = Date.now();
  let hits = buckets.get(key);
  if (!hits || now - hits.start > RATE_WINDOW_MS) {
    hits = { start: now, count: 0 };
    buckets.set(key, hits);
  }
  hits.count += 1;
  if (buckets.size > 5000) buckets.clear(); // 防内存膨胀
  return hits.count <= RATE_LIMIT;
}

function clientIp(req) {
  const fwd = String((req.headers && req.headers['x-forwarded-for']) || '');
  return (fwd.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
}

/** Origin host 与请求 host 一致视为同源（看板前端） */
function isSameOrigin(req) {
  const origin = String((req.headers && req.headers.origin) || '');
  if (!origin) return false;
  let originHost = '';
  try { originHost = new URL(origin).host; } catch { return false; }
  const host = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '');
  return !!host && originHost.toLowerCase() === host.toLowerCase();
}

function originAllowed(req) {
  const origin = String((req.headers && req.headers.origin) || '').trim();
  if (!origin) return false;
  const list = String(process.env.PIP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin);
}

function bearerToken(req) {
  const auth = String((req.headers && req.headers.authorization) || '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function tokenConfigured() {
  return !!process.env.PIP_AGENT_API_TOKEN;
}

function tokenValid(req) {
  const configured = process.env.PIP_AGENT_API_TOKEN;
  if (!configured) return false;
  const provided = bearerToken(req);
  // 恒定时间比较，避免时序侧信道
  if (!provided || provided.length !== configured.length) return false;
  return require('crypto').timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
}

/**
 * 访问守卫。返回 { ok, requestId } 或 { ok:false, status, error }。
 *   - 401：提供了 Authorization 但 Token 无效/未配置；或线上匿名跨源调用
 *   - 403：跨源 Origin 未列入白名单
 *   - 429：触发限流
 */
function guardAgentAccess(req) {
  const requestId = newRequestId();
  const ip = clientIp(req);
  if (!rateLimitOk(ip)) {
    return { ok: false, status: 429, error: '请求过于频繁，请稍后再试', requestId };
  }

  const hasAuth = !!bearerToken(req);
  const origin = String((req.headers && req.headers.origin) || '');

  if (hasAuth) {
    if (!tokenConfigured()) {
      return { ok: false, status: 401, error: '服务端未配置 PIP_AGENT_API_TOKEN', requestId };
    }
    if (!tokenValid(req)) {
      return { ok: false, status: 401, error: 'Unauthorized：Token 无效', requestId };
    }
    if (origin && !isSameOrigin(req) && !originAllowed(req)) {
      return { ok: false, status: 403, error: 'Forbidden：Origin 未在 PIP_ALLOWED_ORIGINS 白名单', requestId };
    }
    return { ok: true, requestId, via: 'token' };
  }

  // 无 Token：同源浏览器请求放行（由平台访问控制保护）；跨源必须白名单 + Token
  if (origin && isSameOrigin(req)) {
    return { ok: true, requestId, via: 'same-origin' };
  }
  // 无 Origin 的非浏览器调用（curl / server-to-server）：已配置 Token 时必须鉴权
  if (!origin) {
    if (tokenConfigured()) {
      return { ok: false, status: 401, error: 'Unauthorized：外部调用必须携带 Bearer Token', requestId };
    }
    return { ok: true, requestId, via: 'no-origin' };
  }
  if (originAllowed(req)) {
    // 白名单 Origin 但未带 Token：外部 Agent 必须携带 Token
    return { ok: false, status: 401, error: 'Unauthorized：跨源调用必须携带 Bearer Token', requestId };
  }
  return { ok: false, status: 403, error: 'Forbidden：Origin 未在 PIP_ALLOWED_ORIGINS 白名单', requestId };
}

/** CORS 响应头（仅白名单 Origin 回显；不含凭据） */
function corsHeaders(req) {
  const origin = String((req.headers && req.headers.origin) || '');
  if (origin && (isSameOrigin(req) || originAllowed(req))) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '600',
      vary: 'Origin',
    };
  }
  return {};
}

/** 读取受限大小的 JSON body（超限抛错 → 413） */
async function readLimitedBody(req, readBody) {
  // Vercel 已解析 req.body 时无法测量原始字节，用序列化长度兜底
  if (req.body && typeof req.body === 'object') {
    const size = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    if (size > MAX_BODY_BYTES) {
      const err = new Error('请求体过大（上限 64KB）');
      err.status = 413;
      throw err;
    }
    return req.body;
  }
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error('请求体过大（上限 64KB）');
      err.status = 413;
      throw err;
    }
    chunks.push(c);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

module.exports = {
  RATE_LIMIT,
  MAX_BODY_BYTES,
  guardAgentAccess,
  corsHeaders,
  readLimitedBody,
  tokenConfigured,
};
