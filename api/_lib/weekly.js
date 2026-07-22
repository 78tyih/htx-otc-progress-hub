/**
 * 每周总结与复盘 — 生成与校验（纯逻辑，无副作用）
 *
 * 原则：
 *   - 只从真实数据派生（tasks / audit-log），不编造未发生的工作；
 *   - 无法从数据推导的栏目（如改进空间）留空，由前端显示「该项缺少记录，待人工补充。」；
 *   - 自然周 = 周一 00:00 ～ 周日 23:59:59（Asia/Shanghai）；
 *   - 生成物恒为草稿（status: draft），用户确认后才归档（confirmed）。
 */
'use strict';

const DAY_MS = 24 * 3600 * 1000;
const MISSING = '该项缺少记录，待人工补充。';

const pad = (n) => String(n).padStart(2, '0');

/** 当前北京时间（Date 对象，其 UTC 字段 = 上海墙钟；与系统时区无关） */
function shanghaiNow() {
  return new Date(Date.now() + 8 * 3600000);
}

function toIsoDate(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 北京时间 +08:00 ISO 秒级时间戳 */
function nowIso() {
  const d = shanghaiNow();
  return `${toIsoDate(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+08:00`;
}

/** 包含某个上海日期的自然周（周一~周日） */
function weekRangeOf(shDate) {
  const offset = (shDate.getUTCDay() + 6) % 7; // 周一=0
  const start = new Date(shDate.getTime() - offset * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return { weekStart: toIsoDate(start), weekEnd: toIsoDate(end) };
}

/** 上一自然周 */
function previousWeekRange() {
  return weekRangeOf(new Date(shanghaiNow().getTime() - 7 * DAY_MS));
}

/** 本自然周 */
function currentWeekRange() {
  return weekRangeOf(shanghaiNow());
}

/** 由 weekStart 推导 weekEnd（weekStart 按上海墙钟日期处理，与 toIsoDate 约定一致） */
function weekEndOf(weekStart) {
  const [y, m, d] = String(weekStart).split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  return toIsoDate(new Date(start.getTime() + 6 * DAY_MS));
}

const inRange = (ts, startMs, endMs) => {
  const ms = Date.parse(ts);
  return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
};

/** 从审计 detail 中提取 postpone 原因（detail 可能是纯文本或 JSON） */
function extractReason(detail) {
  if (!detail) return null;
  try {
    const j = JSON.parse(detail);
    return j.reason || j.note || null;
  } catch {
    const m = String(detail).match(/原因[:：]\s*(.+)/);
    return m ? m[1] : String(detail).slice(0, 80);
  }
}

/** 审计条目是否为「进入阻塞」 */
function entersBlocked(e) {
  if (e.action === 'block') return true;
  if (e.action !== 'agent-update' && e.action !== 'manual-update') return false;
  try {
    const j = JSON.parse(e.detail);
    return j.newStatus === '阻塞' && j.previousStatus !== '阻塞';
  } catch { return false; }
}

/** 审计条目是否为「解除阻塞」 */
function leavesBlocked(e) {
  if (e.action !== 'agent-update' && e.action !== 'manual-update') return false;
  try {
    const j = JSON.parse(e.detail);
    return j.previousStatus === '阻塞' && j.newStatus && j.newStatus !== '阻塞';
  } catch { return false; }
}

const WRITE_ACTIONS = new Set(['add', 'done', 'postpone', 'block', 'progress', 'next', 'agent-update', 'manual-update']);

/**
 * 生成周复盘草稿。
 * @param state  store.js 的完整状态（tasks / audit / weeklyReviews …）
 * @param weekStart 'YYYY-MM-DD'（周一）
 */
function generateReview(state, weekStart) {
  const weekEnd = weekEndOf(weekStart);
  const startMs = Date.parse(`${weekStart}T00:00:00+08:00`);
  const endMs = Date.parse(`${weekEnd}T23:59:59.999+08:00`);
  const tasks = (state.tasks && state.tasks.tasks) || [];
  const entries = (state.audit && state.audit.entries) || [];
  const inWeek = (ts) => inRange(ts, startMs, endMs);

  /* ---- 2. 已完成任务（completedAt 落在周内） ---- */
  const completed = tasks.filter((t) => t.completedAt && inWeek(t.completedAt));
  const completedTasks = completed.map((t) => ({
    taskId: t.id,
    title: t.title,
    owner: t.owner || '—',
    completedAt: t.completedAt,
    result: t.result || null,
    completionEvidence: t.completionEvidence || null,
  }));

  /* ---- 3. 未完成及顺延（本周 postpone 记录 + 当前已延期任务） ---- */
  const deferredTasks = [];
  for (const e of entries) {
    if (!inWeek(e.ts) || e.action !== 'postpone') continue;
    const t = tasks.find((x) => x.id === e.taskId);
    deferredTasks.push({
      taskId: e.taskId || null,
      title: t ? t.title : '（任务已删除）',
      reason: extractReason(e.detail),
      progress: t ? t.progress : null,
      carriedOver: true,
      newDueAt: t ? t.dueAt : null,
    });
  }
  for (const t of tasks) {
    if (t.status === '已延期' && !deferredTasks.some((d) => d.taskId === t.id)) {
      deferredTasks.push({
        taskId: t.id,
        title: t.title,
        reason: null,
        progress: t.progress,
        carriedOver: true,
        newDueAt: t.dueAt,
      });
    }
  }

  /* ---- 4. 遇到的问题（当前阻塞任务 + 本周新增阻塞记录） ---- */
  const problems = [];
  for (const t of tasks) {
    if (t.status !== '阻塞') continue;
    problems.push({
      description: `${t.title}：${t.nextAction || '待解决'}`,
      scope: t.workstream || '—',
      status: '阻塞中',
      needsSimon: /simon/i.test(`${t.owner} ${t.nextAction || ''}`),
    });
  }
  for (const e of entries) {
    if (!inWeek(e.ts) || e.action !== 'block' || e.taskId) continue;
    // 纯文本阻塞（未关联任务）
    problems.push({
      description: extractReason(e.detail) || String(e.detail || '').slice(0, 80),
      scope: '—',
      status: '已记录',
      needsSimon: /simon/i.test(String(e.detail || '')),
    });
  }

  /* ---- 5. 改进空间：数据无法推导，留空待人工补充 ---- */
  const improvements = [];

  /* ---- 6. 下周重点（下周到期或 P0 未完成任务，最多 5 项） ---- */
  const nwStart = endMs + 1;
  const nwEnd = nwStart + 7 * DAY_MS - 1;
  const nextWeekPriorities = tasks
    .filter((t) => t.status !== '已完成')
    .map((t) => ({ t, due: Date.parse(t.dueAt) }))
    .filter(({ t, due }) => (due >= nwStart && due <= nwEnd) || t.priority === 'P0')
    .sort((a, b) => (a.t.priority < b.t.priority ? -1 : a.t.priority > b.t.priority ? 1 : a.due - b.due))
    .slice(0, 5)
    .map(({ t }) => ({
      taskId: t.id,
      title: t.title,
      owner: t.owner || '—',
      dueAt: t.dueAt,
      expected: t.outputCondition || null,
    }));

  /* ---- 7. 数据变化（全部从真实数据计算） ---- */
  const touchedIds = new Set(
    entries.filter((e) => inWeek(e.ts) && e.taskId && WRITE_ACTIONS.has(e.action)).map((e) => e.taskId)
  );
  const touched = tasks.filter((t) => touchedIds.has(t.id));
  const countTouch = (re) =>
    touched.filter((t) => re.test([t.title, t.workstream, t.nextAction, t.result].filter(Boolean).join(' '))).length;
  const metricSnapshot = {
    completedThisWeek: completed.length,
    uncompleted: tasks.filter((t) => t.status !== '已完成').length,
    newBlocked: entries.filter((e) => inWeek(e.ts) && entersBlocked(e)).length,
    unblocked: entries.filter((e) => inWeek(e.ts) && leavesBlocked(e)).length,
    highValueCustomer: countTouch(/高价值|客户/),
    registration: countTouch(/注册/),
    kyc: countTouch(/kyc/i),
    firstOrder: countTouch(/首单/),
  };

  /* ---- 1. 上周工作概览（基于真实数据组句） ---- */
  const rangeText = `${weekStart.slice(5).replace('-', '/')} ~ ${weekEnd.slice(5).replace('-', '/')}`;
  const donePct = tasks.length ? Math.round((tasks.filter((t) => t.status === '已完成').length / tasks.length) * 100) : 0;
  const parts = [];
  if (completed.length) {
    parts.push(`上一周（${rangeText}）共完成 ${completed.length} 项任务：${completed.map((t) => `「${t.title}」`).join('、')}。`);
    const wsSet = [...new Set(completed.map((t) => t.workstream).filter(Boolean))];
    if (wsSet.length) parts.push(`涉及业务主线：${wsSet.join('、')}。`);
  } else {
    parts.push(`上一周（${rangeText}）无任务完成记录。${MISSING}`);
  }
  const blockedN = tasks.filter((t) => t.status === '阻塞').length;
  const doingN = tasks.filter((t) => !['已完成', '阻塞'].includes(t.status)).length;
  parts.push(
    `当前整体进展：${tasks.length} 项任务中已完成 ${tasks.filter((t) => t.status === '已完成').length} 项（${donePct}%），` +
    `未完成 ${doingN} 项，阻塞 ${blockedN} 项。`
  );
  const summary = parts.join('\n');

  return {
    id: `WR-${weekStart}`,
    weekStart,
    weekEnd,
    summary,
    completedTaskIds: completed.map((t) => t.id),
    completedTasks,
    deferredTasks,
    problems,
    improvements,
    nextWeekPriorities,
    metricSnapshot,
    status: 'draft',
    generatedBy: 'pip-assistant',
    generatedAt: nowIso(),
    confirmedAt: null,
  };
}

/** 复盘文件整体校验，返回错误数组（空 = 合法） */
function validateReviewsFile(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['weekly-reviews.json 必须是对象'];
  if (!Array.isArray(data.reviews)) return ['reviews 必须是数组'];
  const REQ = ['id', 'weekStart', 'weekEnd', 'summary', 'status', 'generatedBy', 'generatedAt'];
  data.reviews.forEach((r, i) => {
    for (const k of REQ) if (r[k] === undefined || r[k] === null) errors.push(`reviews[${i}] 缺少字段 ${k}`);
    if (r.status && !['draft', 'confirmed'].includes(r.status)) errors.push(`reviews[${i}].status 非法：${r.status}`);
    if (r.generatedBy && !['pip-assistant', 'manual'].includes(r.generatedBy)) errors.push(`reviews[${i}].generatedBy 非法：${r.generatedBy}`);
    for (const k of ['completedTaskIds', 'completedTasks', 'deferredTasks', 'problems', 'improvements', 'nextWeekPriorities']) {
      if (r[k] !== undefined && !Array.isArray(r[k])) errors.push(`reviews[${i}].${k} 必须是数组`);
    }
    if (r.metricSnapshot !== undefined && (typeof r.metricSnapshot !== 'object' || r.metricSnapshot === null)) {
      errors.push(`reviews[${i}].metricSnapshot 必须是对象`);
    }
  });
  return errors;
}

module.exports = {
  MISSING,
  nowIso,
  shanghaiNow,
  weekRangeOf,
  previousWeekRange,
  currentWeekRange,
  weekEndOf,
  generateReview,
  validateReviewsFile,
};
