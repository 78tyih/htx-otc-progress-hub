/**
 * 展示层投影层：执行层 tasks.json 每次变更后，最小镜像到展示层文件。
 *
 * 投影规则（幂等，可重复执行）：
 *   - todo.json       全量投影：所有任务按状态映射重写（本周待办随执行层实时收敛）
 *   - pipeline.json   增量镜像：仅 source=cli 的任务生成镜像卡片（mirrorOf=任务ID），
 *                     人工维护的策展条目永不改动；任务删除时镜像卡片一并移除
 *   - weekly-log.json 完成追加：任务首次进入「已完成」时追加一条 done 记录（按标题去重），
 *                     无新完成时不触碰文件
 *
 * 展示层只读镜像、不回写执行层；FALLBACK 由调用方在投影后统一同步。
 */
'use strict';

const { readJson, writeJsonAtomic, todayStr } = require('./data-writer');

/** 执行层七态 → 展示层四态（Doing/Next/Blocked/Done） */
const STATUS_MAP = {
  待启动: 'Next',
  进行中: 'Doing',
  已提醒: 'Doing',
  待输出: 'Doing',
  阻塞: 'Blocked',
  已延期: 'Next',
  已完成: 'Done',
};

/** 镜像卡片的 progress 文案（页面卡片不渲染该字段，仅保持数据结构完整） */
function progressText(t) {
  switch (t.status) {
    case '进行中':
    case '已提醒':
      return `${t.status} ${t.progress}%`;
    case '待输出':
      return '已具备结果输出条件';
    case '已完成':
      return '已完成';
    default:
      return t.status;
  }
}

/** todo.json：全量投影（纯函数，字段序与原文件一致：task/owner/due/priority/status） */
function projectTodoRows(tasks) {
  return tasks.map((t) => ({
    task: t.title,
    owner: t.owner,
    due: t.dueAt.slice(0, 10),
    priority: t.priority,
    status: STATUS_MAP[t.status],
  }));
}

/** pipeline.json：仅镜像 CLI/Agent 来源任务（纯函数）；删除任务时移除对应镜像；策展条目不动 */
function mirrorPipelineEntries(tasks, pipe) {
  const ids = new Set(tasks.map((t) => t.id));
  const next = (Array.isArray(pipe) ? pipe : []).filter((p) => !p.mirrorOf || ids.has(p.mirrorOf));
  for (const t of tasks) {
    if (t.source !== 'cli' && t.source !== 'web') continue;
    const fields = {
      module: t.title,
      pipGoal: t.workstream || null,
      progress: progressText(t),
      output: t.outputCondition,
      next: t.status === '已完成' && t.result ? t.result : t.nextAction,
      owner: t.owner,
      priority: t.priority,
      status: STATUS_MAP[t.status],
      workstream: t.workstream || null,
      due: t.dueAt.slice(0, 10),
      mirrorOf: t.id,
    };
    const entry = next.find((p) => p.mirrorOf === t.id);
    if (entry) Object.assign(entry, fields);
    else next.push(fields);
  }
  return next;
}

/** weekly-log.json：新完成任务追加 done 记录（纯函数，按「标题」去重） */
function weeklyDoneEntries(tasks, log) {
  const next = { ...(log || {}) };
  if (!Array.isArray(next.done)) next.done = [];
  let changed = false;
  for (const t of tasks) {
    if (t.status !== '已完成') continue;
    if (next.done.some((d) => d.includes(`「${t.title}」`))) continue;
    next.done = [...next.done, t.result ? `完成「${t.title}」：${t.result}` : `完成「${t.title}」`];
    changed = true;
  }
  if (changed) next.updatedAt = todayStr();
  return { log: next, changed };
}

/**
 * 展示层统一投影（纯函数，供 serverless 复用）：
 * 输入执行层 tasks + 现有展示层文件内容，返回投影后的完整展示层对象。
 */
function projectPresentation({ tasks, pipeline, weeklyLog }) {
  const list = Array.isArray(tasks) ? tasks : [];
  const weekly = weeklyDoneEntries(list, weeklyLog);
  return {
    todo: projectTodoRows(list),
    pipeline: mirrorPipelineEntries(list, pipeline),
    weeklyLog: weekly.log,
    weeklyChanged: weekly.changed,
  };
}

/** 执行层变更后的展示层统一投影（幂等，fs 包装，供 CLI / Scheduler 使用） */
function syncPresentation(data) {
  const tasks = (data && Array.isArray(data.tasks)) ? data.tasks : [];
  const projected = projectPresentation({
    tasks,
    pipeline: readJson('pipeline.json'),
    weeklyLog: readJson('weekly-log.json'),
  });
  writeJsonAtomic('todo.json', projected.todo);
  writeJsonAtomic('pipeline.json', projected.pipeline);
  if (projected.weeklyChanged) writeJsonAtomic('weekly-log.json', projected.weeklyLog);
}

module.exports = { STATUS_MAP, syncPresentation, projectTodoRows, mirrorPipelineEntries, weeklyDoneEntries, projectPresentation };
