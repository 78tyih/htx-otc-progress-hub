/**
 * 统一数据访问层（serverless 唯一读写入口）
 *
 * 两种后端：
 *   - KV（线上）：Vercel KV / Upstash REST，环境变量 KV_REST_API_URL + KV_REST_API_TOKEN，
 *     整份状态存于单个 key（hub:state），首次访问自动用随部署打包的 data/*.json 播种
 *   - FS（本地 dev）：直接读写 data/*.json（与 CLI 共用同一真相源），
 *     通知状态额外落在 data/.hub-notify.json（不入库）
 *
 * 状态结构：{ version, seededAt, tasks, pipeline, weeklyLog, audit, notify:{ dedupe, lastTest, lastSuccessAt } }
 * 写操作复用 agent/schema 校验，非法数据永不落盘。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validateTasksFile, validateAuditFile } = require('../../agent/schema');

const KV_KEY = 'hub:state';
const DATA_DIR = process.env.HUB_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const NOTIFY_FILE = path.join(DATA_DIR, '.hub-notify.json');

const useKv = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/** 随部署打包的种子数据（require 会被 Vercel nft 追踪打包） */
function seedState() {
  return {
    version: 1,
    seededAt: new Date().toISOString(),
    tasks: require('../../data/tasks.json'),
    pipeline: require('../../data/pipeline.json'),
    weeklyLog: require('../../data/weekly-log.json'),
    audit: require('../../data/audit-log.json'),
    notify: { dedupe: {}, lastTest: null, lastSuccessAt: null },
  };
}

/* ---------------- KV 后端 ---------------- */

async function kvGet() {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(KV_KEY)}`, {
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV GET 失败：HTTP ${res.status}`);
  const body = await res.json();
  return body && body.result ? JSON.parse(body.result) : null;
}

async function kvSet(value) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(KV_KEY)}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
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
    if (!state.notify) state.notify = { dedupe: {}, lastTest: null, lastSuccessAt: null };
    if (!state.notify.dedupe) state.notify.dedupe = {};
    return state;
  }
  let notify = { dedupe: {}, lastTest: null, lastSuccessAt: null };
  try {
    notify = JSON.parse(fs.readFileSync(NOTIFY_FILE, 'utf8'));
  } catch { /* 首次运行无通知状态 */ }
  return {
    version: 1,
    seededAt: null,
    tasks: fsRead('tasks.json'),
    pipeline: fsRead('pipeline.json'),
    weeklyLog: fsRead('weekly-log.json'),
    audit: fsRead('audit-log.json'),
    notify,
  };
}

/** 保存状态（先过 schema 校验，非法抛错不落盘） */
async function saveState(state) {
  const taskErrors = validateTasksFile(state.tasks);
  if (taskErrors.length) throw new Error(`tasks 校验未通过：\n${taskErrors.join('\n')}`);
  const auditErrors = validateAuditFile(state.audit);
  if (auditErrors.length) throw new Error(`audit 校验未通过：\n${auditErrors.join('\n')}`);

  if (useKv()) {
    await kvSet(state);
    return;
  }
  fsWriteAtomic('tasks.json', state.tasks);
  fsWriteAtomic('pipeline.json', state.pipeline);
  fsWriteAtomic('weekly-log.json', state.weeklyLog);
  fsWriteAtomic('audit-log.json', state.audit);
  fs.writeFileSync(NOTIFY_FILE, JSON.stringify(state.notify, null, 2) + '\n', 'utf8');
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

/** 最近的 Agent 修改记录（最近 N 条，新→旧） */
function recentAgentUpdates(state, limit = 8) {
  const entries = (state.audit && Array.isArray(state.audit.entries)) ? state.audit.entries : [];
  return entries
    .filter((e) => e.action === 'agent-update')
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

module.exports = { useKv, loadState, saveState, appendAuditEntry, recentAgentUpdates };
