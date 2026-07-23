/**
 * 任务七态判定（纯函数，零依赖，供 Web Agent / API / 测试共用）
 *
 * 判定规则（优先级从高到低，命中即返回）：
 *   0. Archived：已归档（completedAt/archivedAt 置位即退出活跃判定）
 *   1. Needs Confirmation：状态与完成证据冲突（已完成缺完成时间/证据；或未完成却有完成证据）
 *   2. Done：状态为已完成，且存在完成时间或交付证据
 *   3. Blocked：状态被明确标记为阻塞，或存在未完成的前置依赖
 *   4. Overdue：截止时间早于当前时间，且任务未完成
 *   5. In Progress：状态为进行中 / 已提醒 / 待输出
 *   6. Pending：尚未开始（待启动 / 已延期）
 *
 * 每个判定返回：class（英文码）、label（中文）、basis（判定依据数组）、suggestion（建议下一步）、blockers（阻塞来源任务）
 */
'use strict';

const CLASSES = ['done', 'in_progress', 'blocked', 'overdue', 'pending', 'needs_confirmation', 'archived'];

const CLASS_LABELS = {
  done: '已完成',
  in_progress: '进行中',
  blocked: '阻塞',
  overdue: '已逾期',
  pending: '待启动',
  needs_confirmation: '待人工确认',
  archived: '已归档',
};

/** 执行层七态 → Webhook 英文状态码 */
const STATUS_EN = {
  已完成: 'done',
  进行中: 'in_progress',
  已提醒: 'in_progress',
  待输出: 'in_progress',
  阻塞: 'blocked',
  已延期: 'overdue',
  待启动: 'pending',
};

function fmtTs(iso) {
  return String(iso || '').slice(0, 16).replace('T', ' ');
}

function result(cls, basis, suggestion, blockers = []) {
  return { class: cls, label: CLASS_LABELS[cls], basis, suggestion, blockers };
}

/** 判定单个任务（now 为毫秒时间戳，便于测试注入） */
function classifyTask(task, allTasks = [], now = Date.now()) {
  const due = Date.parse(task.dueAt);

  // 0. 已归档：退出活跃判定（已完成归档 / 未完成归档均视为尘埃落定）
  if (task.archivedAt) {
    const basis = [`归档时间 ${fmtTs(task.archivedAt)}`];
    if (task.archiveReason) basis.push(`归档原因：${task.archiveReason}`);
    if (task.status === '已完成') basis.unshift('任务完成后归档');
    return result('archived', basis, '无需操作');
  }

  // 1. 状态与完成证据冲突 → 待人工确认
  if (task.status === '已完成' && !task.completedAt && !task.completionEvidence) {
    return result(
      'needs_confirmation',
      ['状态为「已完成」，但缺少完成时间与交付证据'],
      '人工核对：补齐完成时间/交付证据，或把状态回退'
    );
  }
  if (task.status !== '已完成' && (task.completedAt || task.completionEvidence)) {
    const ev = task.completionEvidence ? `交付证据「${task.completionEvidence}」` : `完成时间 ${fmtTs(task.completedAt)}`;
    return result(
      'needs_confirmation',
      [`存在${ev}，但状态仍为「${task.status}」`],
      '人工确认：是否应改为已完成（经确认卡执行）'
    );
  }

  // 2. 已完成
  if (task.status === '已完成') {
    const basis = [];
    if (task.completedAt) basis.push(`完成时间 ${fmtTs(task.completedAt)}`);
    if (task.completionEvidence) basis.push(`交付证据：${task.completionEvidence}`);
    if (!basis.length && task.result) basis.push(`结果：${task.result}`);
    return result('done', basis, '无需操作');
  }

  // 3. 阻塞（显式标记 或 前置依赖未完成；阻塞优先于逾期，依据中会合并说明）
  const blockers = (Array.isArray(task.dependencies) ? task.dependencies : [])
    .map((id) => allTasks.find((t) => t.id === id))
    .filter((dep) => dep && dep.status !== '已完成');
  const basis = [];
  if (task.status === '阻塞') basis.push('状态被明确标记为「阻塞」');
  if (blockers.length) basis.push(`前置依赖未完成：${blockers.map((b) => `${b.id}「${b.title}」（${b.status}）`).join('、')}`);
  if (basis.length) {
    if (due < now) basis.push(`另：截止 ${fmtTs(task.dueAt)} 已过，解除阻塞后需重排时间`);
    const suggestion = blockers.length
      ? `先推进依赖任务 ${blockers[0].id}「${blockers[0].title}」`
      : `解除阻塞：${task.nextAction}`;
    return result('blocked', basis, suggestion, blockers);
  }

  // 4. 逾期
  if (due < now) {
    return result(
      'overdue',
      [`截止 ${fmtTs(task.dueAt)} 早于当前时间，且任务未完成（当前「${task.status}」）`],
      '尽快完成，或申请延期并更新截止时间'
    );
  }

  // 5. 进行中
  if (task.status === '进行中' || task.status === '已提醒' || task.status === '待输出') {
    return result('in_progress', [`状态为「${task.status}」，进度 ${task.progress}%`], task.nextAction);
  }

  // 6. 待启动
  return result('pending', [`状态为「${task.status}」，尚未开始`], task.nextAction);
}

/** 批量判定，返回 [{ task, class, label, basis, suggestion, blockers }] */
function classifyAll(tasks, now = Date.now()) {
  return (Array.isArray(tasks) ? tasks : []).map((t) => ({ task: t, ...classifyTask(t, tasks, now) }));
}

/** 按类别过滤 */
function byClass(classified, cls) {
  return classified.filter((c) => c.class === cls);
}

module.exports = { CLASSES, CLASS_LABELS, STATUS_EN, classifyTask, classifyAll, byClass };
