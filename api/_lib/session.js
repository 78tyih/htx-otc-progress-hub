/**
 * PIP 助手短期会话上下文（服务端持久化，随 hub state 存 KV / 本地侧边文件）
 *
 * 约定：
 *   - sessionId 由前端生成（UUID 存 localStorage），不携带任何身份信息；
 *   - 上下文含 activeTaskIds / lastIntent / pendingProposalId / recentMessages / operator；
 *   - TTL 2 小时，过期即失效；recentMessages 只保留最近 10 轮（20 条），超出自动裁剪；
 *   - 永不永久保留完整聊天内容；上下文只用于连续对话理解（如「刚才那项任务」）。
 */
'use strict';

const SESSION_TTL_MS = 2 * 3600 * 1000;
const MAX_ROUNDS = 10; // 10 轮 = 20 条消息
const MAX_SESSIONS = 200; // 防膨胀

function isValidSessionId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

/** 读取会话（过期返回 null 并清理）；state 需已经 ensureV2Shape */
function getSession(state, sessionId) {
  if (!isValidSessionId(sessionId)) return null;
  gcSessions(state);
  const s = state.sessions[sessionId];
  if (!s) return null;
  if (Date.parse(s.expiresAt) < Date.now()) {
    delete state.sessions[sessionId];
    return null;
  }
  return s;
}

/** 创建或刷新会话（延长过期时间，更新 operator） */
function touchSession(state, sessionId, operator) {
  if (!isValidSessionId(sessionId)) return null;
  gcSessions(state);
  const now = Date.now();
  let s = state.sessions[sessionId];
  if (!s || Date.parse(s.expiresAt) < now) {
    s = {
      activeTaskIds: [],
      lastIntent: null,
      pendingProposalId: null,
      recentMessages: [],
      operator: operator || 'Sera',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    };
    state.sessions[sessionId] = s;
  } else {
    s.expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
    if (operator) s.operator = operator;
  }
  return s;
}

/** 追加一轮消息并裁剪到最近 10 轮 */
function pushMessages(state, sessionId, messages) {
  const s = touchSession(state, sessionId);
  if (!s) return;
  for (const m of messages) {
    s.recentMessages.push({ role: m.role === 'user' ? 'user' : 'agent', text: String(m.text || '').slice(0, 500), ts: new Date().toISOString() });
  }
  if (s.recentMessages.length > MAX_ROUNDS * 2) {
    s.recentMessages = s.recentMessages.slice(-MAX_ROUNDS * 2);
  }
}

/** 更新上下文字段（activeTaskIds 去重保序，最多 10 个） */
function updateSession(state, sessionId, patch) {
  const s = touchSession(state, sessionId);
  if (!s) return;
  if (Array.isArray(patch.activeTaskIds)) {
    const ids = [];
    for (const id of patch.activeTaskIds) {
      const norm = String(id || '').toUpperCase();
      if (/^T-\d{4}$/.test(norm) && !ids.includes(norm)) ids.push(norm);
    }
    s.activeTaskIds = ids.slice(0, 10);
  }
  if (typeof patch.lastIntent === 'string') s.lastIntent = patch.lastIntent.slice(0, 40);
  if (patch.pendingProposalId === null || typeof patch.pendingProposalId === 'string') {
    s.pendingProposalId = patch.pendingProposalId;
  }
}

/** 清理过期会话 + 总量上限（最旧的先删） */
function gcSessions(state) {
  if (!state.sessions || typeof state.sessions !== 'object') { state.sessions = {}; return; }
  const now = Date.now();
  for (const [id, s] of Object.entries(state.sessions)) {
    if (!s || Date.parse(s.expiresAt) < now) delete state.sessions[id];
  }
  const ids = Object.keys(state.sessions);
  if (ids.length > MAX_SESSIONS) {
    ids
      .sort((a, b) => Date.parse(state.sessions[a].expiresAt) - Date.parse(state.sessions[b].expiresAt))
      .slice(0, ids.length - MAX_SESSIONS)
      .forEach((id) => delete state.sessions[id]);
  }
}

module.exports = { SESSION_TTL_MS, MAX_ROUNDS, isValidSessionId, getSession, touchSession, pushMessages, updateSession, gcSessions };
