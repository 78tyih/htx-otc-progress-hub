/**
 * tasks / audit-log 数据结构定义与校验（唯一真相源）
 *
 * 数据分层约定：
 *   - data/tasks.json     执行层：闭环系统的真相源（Agent CLI / Scheduler 读写）
 *   - data/audit-log.json 审计层：全部变更与提醒动作的追加式日志
 *   - data/todo.json 等    展示层：每周五节奏人工维护，Agent 只做最小镜像同步
 *
 * 状态机（七态，页面与推送统一使用）：
 *   待启动 → 进行中 → 已提醒（Scheduler 推送后置位）→ 待输出（到期/满足输出条件）
 *   任意非终态 → 阻塞 / 已延期；进行中·待输出·已提醒 → 已完成（终态）
 *
 * 本文件零依赖，供 agent/validate.js、agent/data-writer.js、scheduler/ 共同引用。
 */
'use strict';

const TASK_STATUSES = ['待启动', '进行中', '待输出', '已提醒', '已完成', '已延期', '阻塞'];
const TASK_PRIORITIES = ['P0', 'P1'];
const AUDIT_ACTORS = ['cli', 'scheduler', 'seed', 'web'];
// 允许的状态迁移：key → 可迁移到的状态集合（终态 已完成 不可再迁出）
const STATUS_TRANSITIONS = {
  待启动: ['进行中', '阻塞', '已延期'],
  进行中: ['待输出', '已提醒', '已完成', '阻塞', '已延期'],
  已提醒: ['进行中', '待输出', '已完成', '阻塞', '已延期'],
  待输出: ['已完成', '进行中', '已延期', '阻塞'],
  阻塞: ['待启动', '进行中', '已延期'],
  已延期: ['待启动', '进行中', '阻塞'],
  已完成: [],
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/;
const TASK_ID_RE = /^T-\d{4}$/;

function isIso(v) {
  return typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}

function isIsoOrNull(v) {
  return v === null || isIso(v);
}

/** 校验单个任务对象，返回错误数组（空数组 = 通过） */
function validateTask(task, index) {
  const where = `tasks[${index}]${task && task.id ? `(${task.id})` : ''}`;
  const errors = [];
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
      return [`${where}: 必须是对象`];
  }
  if (typeof task.id !== 'string' || !TASK_ID_RE.test(task.id)) errors.push(`${where}.id: 须形如 T-0001`);
  if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 100) errors.push(`${where}.title: 必填且 ≤100 字`);
  if (!TASK_STATUSES.includes(task.status)) errors.push(`${where}.status: 非法状态 "${task.status}"，允许值：${TASK_STATUSES.join('/')}`);
  if (!TASK_PRIORITIES.includes(task.priority)) errors.push(`${where}.priority: 须为 P0/P1`);
  if (task.workstream !== null && typeof task.workstream !== 'string') errors.push(`${where}.workstream: 须为字符串或 null`);
  if (typeof task.owner !== 'string' || !task.owner.trim()) errors.push(`${where}.owner: 必填`);
  if (!isIso(task.createdAt)) errors.push(`${where}.createdAt: 须为 ISO 时间`);
  if (!isIso(task.dueAt)) errors.push(`${where}.dueAt: 必填且须为 ISO 时间`);
  if (!isIso(task.remindAt)) errors.push(`${where}.remindAt: 必填且须为 ISO 时间`);
  if (!isIsoOrNull(task.remindedAt)) errors.push(`${where}.remindedAt: 须为 ISO 时间或 null`);
  if (!isIsoOrNull(task.completedAt)) errors.push(`${where}.completedAt: 须为 ISO 时间或 null`);
  if (!Number.isInteger(task.progress) || task.progress < 0 || task.progress > 100) errors.push(`${where}.progress: 须为 0-100 整数`);
  if (typeof task.nextAction !== 'string' || !task.nextAction.trim()) errors.push(`${where}.nextAction: 必填`);
  if (typeof task.outputCondition !== 'string' || !task.outputCondition.trim()) errors.push(`${where}.outputCondition: 必填`);
  if (task.result !== null && typeof task.result !== 'string') errors.push(`${where}.result: 须为字符串或 null`);
  if (typeof task.source !== 'string' || !task.source.trim()) errors.push(`${where}.source: 必填`);
  if (isIso(task.dueAt) && isIso(task.remindAt) && Date.parse(task.remindAt) > Date.parse(task.dueAt)) {
    errors.push(`${where}: remindAt 不得晚于 dueAt`);
  }
  if (task.status === '已完成' && task.completedAt === null) errors.push(`${where}: 已完成任务必须有 completedAt`);
  return errors;
}

/** 校验 tasks.json 整体结构，返回错误数组 */
function validateTasksFile(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['tasks.json: 顶层必须是对象'];
  if (data.version !== 1) errors.push('tasks.json.version: 当前仅支持 1');
  if (!isIso(data.updatedAt)) errors.push('tasks.json.updatedAt: 须为 ISO 时间');
  if (!Array.isArray(data.tasks)) {
    errors.push('tasks.json.tasks: 必须是数组');
    return errors;
  }
  const seen = new Set();
  data.tasks.forEach((t, i) => {
    errors.push(...validateTask(t, i));
    if (t && typeof t.id === 'string') {
      if (seen.has(t.id)) errors.push(`tasks[${i}].id: ${t.id} 重复`);
      seen.add(t.id);
    }
  });
  return errors;
}

/** 校验 audit-log.json 整体结构，返回错误数组 */
function validateAuditFile(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['audit-log.json: 顶层必须是对象'];
  if (data.version !== 1) errors.push('audit-log.json.version: 当前仅支持 1');
  if (!Array.isArray(data.entries)) {
    errors.push('audit-log.json.entries: 必须是数组');
    return errors;
  }
  data.entries.forEach((e, i) => {
    const where = `entries[${i}]`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(`${where}: 必须是对象`); return; }
    if (!isIso(e.ts)) errors.push(`${where}.ts: 须为 ISO 时间`);
    if (!AUDIT_ACTORS.includes(e.actor)) errors.push(`${where}.actor: 允许值：${AUDIT_ACTORS.join('/')}`);
    if (typeof e.action !== 'string' || !e.action.trim()) errors.push(`${where}.action: 必填`);
    if (e.taskId !== null && typeof e.taskId !== 'string') errors.push(`${where}.taskId: 须为字符串或 null`);
    if (typeof e.detail !== 'string') errors.push(`${where}.detail: 必须是字符串`);
  });
  return errors;
}

module.exports = {
  TASK_STATUSES,
  TASK_PRIORITIES,
  AUDIT_ACTORS,
  STATUS_TRANSITIONS,
  TASK_ID_RE,
  isIso,
  validateTask,
  validateTasksFile,
  validateAuditFile,
};
