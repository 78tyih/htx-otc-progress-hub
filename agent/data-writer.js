/**
 * 数据写入层：tasks / audit-log / blockers 的读取、校验、原子写入与审计。
 *
 * 约定：
 *   - 所有写操作先过 schema 校验再落盘，非法数据永不写入；
 *   - 写文件采用「临时文件 + rename」原子替换，避免半截 JSON；
 *   - 每次变更追加一条 audit-log；
 *   - 落盘后尽力触发 FALLBACK 同步（失败仅警告，不阻断操作）；
 *   - HUB_DATA_DIR 环境变量可切换数据目录（测试隔离用）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateTasksFile, validateAuditFile } = require('./schema');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.HUB_DATA_DIR || path.join(ROOT, 'data');

const pad = (n) => String(n).padStart(2, '0');

/** 当前时间（Asia/Shanghai，+08:00 ISO） */
function nowIso() {
  const d = new Date();
  const sh = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
  return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}T${pad(sh.getHours())}:${pad(sh.getMinutes())}:${pad(sh.getSeconds())}+08:00`;
}

function todayStr() {
  return nowIso().slice(0, 10);
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function writeJsonAtomic(name, data) {
  const file = path.join(DATA_DIR, name);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

function loadTasks() {
  return readJson('tasks.json');
}

/** 校验并保存 tasks.json（自动刷新 updatedAt），非法时抛错不写盘 */
function saveTasks(data) {
  data.updatedAt = nowIso();
  const errors = validateTasksFile(data);
  if (errors.length) {
    throw new Error(`tasks.json 校验未通过，已放弃写入：\n${errors.join('\n')}`);
  }
  writeJsonAtomic('tasks.json', data);
}

/** 追加一条审计日志 */
function appendAudit(actor, action, taskId, detail) {
  let audit;
  try {
    audit = readJson('audit-log.json');
  } catch {
    audit = { version: 1, entries: [] };
  }
  audit.entries.push({ ts: nowIso(), actor, action, taskId, detail });
  const errors = validateAuditFile(audit);
  if (errors.length) {
    throw new Error(`audit-log.json 校验未通过：\n${errors.join('\n')}`);
  }
  writeJsonAtomic('audit-log.json', audit);
}

/** 生成下一个任务 ID（T-0001 递增） */
function nextTaskId(tasks) {
  const max = tasks.reduce((m, t) => {
    const n = parseInt(String(t.id).replace(/^T-/, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `T-${String(max + 1).padStart(4, '0')}`;
}

/** 新增阻塞项到展示层 blockers.json（current 栏，去重，刷新 updatedAt） */
function addBlocker(text) {
  const file = 'blockers.json';
  const blockers = readJson(file);
  if (!Array.isArray(blockers.current)) blockers.current = [];
  if (!blockers.current.includes(text)) blockers.current.push(text);
  blockers.updatedAt = todayStr();
  writeJsonAtomic(file, blockers);
  return blockers.current.length;
}

/** 落盘后尽力同步 FALLBACK（tasks 纳入页面数据集后才有实际变化；失败仅警告） */
function syncFallbackQuiet() {
  try {
    execFileSync('python3', [path.join(ROOT, '.dev-scripts', 'sync_fallback.py')], { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    console.warn('⚠️  FALLBACK 同步未执行或失败（不影响本次操作）：请稍后运行 npm run sync');
  }
}

module.exports = {
  DATA_DIR,
  nowIso,
  todayStr,
  readJson,
  writeJsonAtomic,
  loadTasks,
  saveTasks,
  appendAudit,
  nextTaskId,
  addBlocker,
  syncFallbackQuiet,
};
