/**
 * 统一数据访问层（serverless 唯一读写入口）
 *
 * 两种后端：
 *   - KV（线上）：Vercel KV / Upstash REST，环境变量 KV_REST_API_URL + KV_REST_API_TOKEN，
 *     整份状态存于单个 key（hub:state），首次访问自动用随部署打包的 data/*.json 播种
 *   - FS（本地 dev）：直接读写 data/*.json（与 CLI 共用同一真相源），
 *     通知状态额外落在 data/.hub-notify.json（不入库）
 *
 * 状态结构：{ version, revision, seededAt, tasks, pipeline, weeklyLog, weeklyReviews, audit,
 *             notify:{ dedupe, ... }, sessions:{}, proposals:{ items:[] } }
 * 写操作复用 agent/schema 校验，非法数据永不落盘。
 * revision 为任务数据乐观锁版本号：confirm/proposals 等写操作 +1，客户端带回不一致返回 409。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validateTasksFile, validateAuditFile, validateProjectsFile, PROJECT_ID_RE } = require('../../agent/schema');
const { projectTodoRows } = require('../../agent/presenter');
const { validateReviewsFile } = require('./weekly');

const KV_KEY = 'hub:state';
const DATA_DIR = process.env.HUB_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const NOTIFY_FILE = path.join(DATA_DIR, '.hub-notify.json');

const useKv = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** 随部署打包的种子数据（require 会被 Vercel nft 追踪打包） */
function seedState() {
  return {
    version: 1,
    revision: 1, // 任务数据乐观锁版本号：每次任务写操作 +1，冲突返回 409
    seededAt: new Date().toISOString(),
    tasks: require('../../data/tasks.json'),
    projects: require('../../data/projects.json'),
    pipeline: require('../../data/pipeline.json'),
    weeklyLog: require('../../data/weekly-log.json'),
    weeklyReviews: require('../../data/weekly-reviews.json'),
    audit: require('../../data/audit-log.json'),
    notify: { dedupe: {}, dualDedupe: {}, channelStatus: {}, lastTest: null, lastSuccessAt: null, lastSummary: null, queue: [], window: { startedAt: null, endsAt: null }, seen: {}, silentLog: [], pausedUntil: null, lastFlush: null },
    sessions: {}, // PIP 助手短期会话上下文（sessionId → 上下文，含过期时间）
    proposals: { items: [] }, // 待确认任务方案（创建/拆解/项目创建），服务端统一生成 ID
  };
}

/** 空 projects 容器（兼容旧 KV 状态：首次访问补齐，不破坏既有任务） */
function emptyProjects() {
  return { version: 1, updatedAt: new Date().toISOString(), projects: [] };
}

/** 兼容旧状态：补齐 v2/v3 新增顶层字段 */
function ensureV2Shape(state) {
  if (typeof state.revision !== 'number' || !Number.isInteger(state.revision) || state.revision < 1) state.revision = 1;
  if (!state.sessions || typeof state.sessions !== 'object' || Array.isArray(state.sessions)) state.sessions = {};
  if (!state.proposals || typeof state.proposals !== 'object' || !Array.isArray(state.proposals.items)) {
    state.proposals = { items: [] };
  }
  // v3：补齐 projects 一级实体（旧 KV 状态可能缺失，视为空项目集，不破坏既有任务）
  if (!state.projects || typeof state.projects !== 'object' || !Array.isArray(state.projects.projects)) {
    state.projects = emptyProjects();
  }
  return state;
}

/** 任务数据写操作后调用：版本号 +1（通知状态保存不 bump） */
function bumpRevision(state) {
  state.revision = (typeof state.revision === 'number' ? state.revision : 1) + 1;
  return state.revision;
}

/* ---------------- KV 后端 ---------------- */

async function kvGet() {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(KV_KEY)}`, {
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV GET 失败：HTTP ${res.status}`);
  const body = await res.json();
  if (!body || !body.result) return null;
  let result = JSON.parse(body.result);
  // 兼容历史双重 stringify 的值：parse 后仍为 string 则再 parse 一次
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch { /* 非 JSON 字符串，原样返回 */ }
  }
  return result;
}

async function kvSet(value) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(KV_KEY)}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`KV SET 失败：HTTP ${res.status}`);
}

/* ---------------- FS 后端 ---------------- */

function fsRead(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function fsWriteAtomic(name, data) {
  const file = path.join(DATA_DIR, name);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

/* ---------------- 对外 API ---------------- */

async function loadState() {
  if (useKv()) {
    let state = await kvGet();
    if (!state) {
      state = seedState();
      await kvSet(state);
    }
    if (!state.notify) state.notify = { dedupe: {}, dualDedupe: {}, channelStatus: {}, lastTest: null, lastSuccessAt: null, queue: [], window: { startedAt: null, endsAt: null }, seen: {}, silentLog: [], pausedUntil: null, lastFlush: null };
    if (!state.notify.dedupe) state.notify.dedupe = {};
    if (!state.notify.dualDedupe) state.notify.dualDedupe = {};
    if (!state.notify.channelStatus) state.notify.channelStatus = {};
    if (!Array.isArray(state.notify.queue)) state.notify.queue = [];
    if (!state.notify.window) state.notify.window = { startedAt: null, endsAt: null };
    if (!state.notify.seen) state.notify.seen = {};
    if (!Array.isArray(state.notify.silentLog)) state.notify.silentLog = [];
    if (state.notify.pausedUntil === undefined) state.notify.pausedUntil = null;
    if (state.notify.lastFlush === undefined) state.notify.lastFlush = null;
    if (!state.weeklyReviews || !Array.isArray(state.weeklyReviews.reviews)) {
      state.weeklyReviews = { version: 1, reviews: [] };
    }
    return ensureV2Shape(state);
  }
  let sidecar = null; // .hub-notify.json：通知状态 + 会话上下文 + 待确认方案（均不入库）
  try {
    sidecar = JSON.parse(fs.readFileSync(NOTIFY_FILE, 'utf8'));
  } catch { /* 首次运行无侧边状态 */ }
  let notify = sidecar && sidecar.notify ? sidecar.notify : { dedupe: {}, dualDedupe: {}, channelStatus: {}, lastTest: null, lastSuccessAt: null, lastSummary: null, queue: [], window: { startedAt: null, endsAt: null }, seen: {}, silentLog: [], pausedUntil: null, lastFlush: null };
  // 兼容旧格式（notify 字段直接平铺在文件顶层）
  if (!sidecar || (!sidecar.notify && (sidecar.dedupe || sidecar.dualDedupe))) notify = sidecar || notify;
  if (!notify.dedupe) notify.dedupe = {};
  if (!notify.dualDedupe) notify.dualDedupe = {};
  if (!notify.channelStatus) notify.channelStatus = {};
  if (!Array.isArray(notify.queue)) notify.queue = [];
  if (!notify.window) notify.window = { startedAt: null, endsAt: null };
  if (!notify.seen) notify.seen = {};
  if (!Array.isArray(notify.silentLog)) notify.silentLog = [];
  if (notify.pausedUntil === undefined) notify.pausedUntil = null;
  if (notify.lastFlush === undefined) notify.lastFlush = null;
  let weeklyReviews = { version: 1, reviews: [] };
  try {
    weeklyReviews = fsRead('weekly-reviews.json');
  } catch { /* 首次运行无复盘数据 */ }
  let projects = emptyProjects();
  try {
    projects = fsRead('projects.json');
  } catch { /* 首次运行无项目数据 */ }
  return ensureV2Shape({
    version: 1,
    revision: sidecar && Number.isInteger(sidecar.revision) ? sidecar.revision : 1,
    seededAt: null,
    tasks: fsRead('tasks.json'),
    projects,
    pipeline: fsRead('pipeline.json'),
    weeklyLog: fsRead('weekly-log.json'),
    weeklyReviews,
    audit: fsRead('audit-log.json'),
    notify,
    sessions: sidecar && sidecar.sessions && typeof sidecar.sessions === 'object' ? sidecar.sessions : {},
    proposals: sidecar && sidecar.proposals && Array.isArray(sidecar.proposals.items) ? sidecar.proposals : { items: [] },
  });
}

/** 保存状态（先过 schema 校验，非法抛错不落盘） */
async function saveState(state) {
  const taskErrors = validateTasksFile(state.tasks);
  if (taskErrors.length) throw new Error(`tasks 校验未通过：\n${taskErrors.join('\n')}`);
  ensureV2Shape(state);
  const projectErrors = validateProjectsFile(state.projects);
  if (projectErrors.length) throw new Error(`projects 校验未通过：\n${projectErrors.join('\n')}`);
  // 交叉引用校验：task.projectId 必须指向已存在项目；project.taskIds 必须指向已存在任务
  const projectIds = new Set((state.projects.projects || []).map((p) => p.id));
  const taskIds = new Set((state.tasks.tasks || []).map((t) => t.id));
  for (const t of state.tasks.tasks || []) {
    if (t.projectId && PROJECT_ID_RE.test(t.projectId) && !projectIds.has(t.projectId)) {
      throw new Error(`tasks 校验未通过：\n${t.id}.projectId 引用了不存在的项目 ${t.projectId}`);
    }
  }
  for (const p of state.projects.projects || []) {
    for (const tid of p.taskIds || []) {
      if (!taskIds.has(tid)) {
        throw new Error(`projects 校验未通过：\n${p.id}.taskIds 引用了不存在的任务 ${tid}`);
      }
    }
  }
  const auditErrors = validateAuditFile(state.audit);
  if (auditErrors.length) throw new Error(`audit 校验未通过：\n${auditErrors.join('\n')}`);
  const reviewErrors = validateReviewsFile(state.weeklyReviews || { version: 1, reviews: [] });
  if (reviewErrors.length) throw new Error(`weeklyReviews 校验未通过：\n${reviewErrors.join('\n')}`);

  if (useKv()) {
    await kvSet(state);
    return;
  }
  fsWriteAtomic('tasks.json', state.tasks);
  fsWriteAtomic('projects.json', state.projects);
  fsWriteAtomic('pipeline.json', state.pipeline);
  fsWriteAtomic('weekly-log.json', state.weeklyLog);
  fsWriteAtomic('weekly-reviews.json', state.weeklyReviews || { version: 1, reviews: [] });
  fsWriteAtomic('audit-log.json', state.audit);
  // 展示层 todo.json 全量投影（与 CLI 的 syncPresentation 行为一致）
  fsWriteAtomic('todo.json', projectTodoRows(state.tasks.tasks));
  fs.writeFileSync(NOTIFY_FILE, JSON.stringify({
    notify: state.notify,
    revision: state.revision,
    sessions: state.sessions,
    proposals: state.proposals,
  }, null, 2) + '\n', 'utf8');
  syncFallbackQuiet();
}

/** 本地开发写盘后尽力同步 app.js FALLBACK（测试隔离目录 / 无 python3 时静默跳过） */
function syncFallbackQuiet() {
  if (process.env.HUB_DATA_DIR) return;
  try {
    const { execFileSync } = require('child_process');
    execFileSync('python3', [path.join(__dirname, '..', '..', '.dev-scripts', 'sync_fallback.py')], { stdio: 'pipe' });
  } catch { /* 同步失败不阻断操作 */ }
}

/** 追加审计条目（内存操作，需随后 saveState） */
function appendAuditEntry(state, { actor, action, taskId, detail }) {
  if (!state.audit || !Array.isArray(state.audit.entries)) state.audit = { version: 1, entries: [] };
  state.audit.entries.push({ ts: new Date().toISOString(), actor, action, taskId: taskId || null, detail: String(detail || '') });
}

/** 最近的任务修改记录（PIP 助手 + 人工，最近 N 条，新→旧） */
function recentAgentUpdates(state, limit = 8) {
  const entries = (state.audit && Array.isArray(state.audit.entries)) ? state.audit.entries : [];
  return entries
    .filter((e) => (e.action === 'agent-update' || e.action === 'manual-update') && e.taskId)
    .slice(-limit)
    .reverse()
    .map((e) => {
      let detail = {};
      try { detail = JSON.parse(e.detail); } catch { /* 非 JSON 详情忽略 */ }
      return {
        ts: e.ts,
        taskId: e.taskId,
        operator: detail.operator || e.actor,
        previousStatus: detail.previousStatus || null,
        newStatus: detail.newStatus || null,
        completionEvidence: detail.completionEvidence || null,
        changeSource: detail.changeSource || 'agent',
      };
    });
}

module.exports = { useKv, loadState, saveState, appendAuditEntry, recentAgentUpdates, bumpRevision, ensureV2Shape };
