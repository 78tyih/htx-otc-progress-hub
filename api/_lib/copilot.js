/**
 * PIP 对话助手的本地意图解析与结构化变更校验。
 * 对话内容不离开 PIP 服务端；任何写入都必须再经过确认接口。
 */
'use strict';

const { TASK_STATUSES, STATUS_TRANSITIONS } = require('../../agent/schema');

const EDITABLE_FIELDS = ['status', 'progress', 'nextAction'];
const FIELD_LABELS = {
  status: '状态',
  progress: '进度',
  nextAction: '下一步',
};

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[\s，,。.!！?？:：()（）【】\[\]]+/g, '');
}

function resolveTask(message, tasks, contextTaskId) {
  const text = String(message || '');
  const idMatch = text.toUpperCase().match(/T-\d{4}/);
  if (idMatch) return (tasks || []).find((task) => task.id === idMatch[0]) || null;

  const normalized = normalizeText(text);
  const matches = (tasks || [])
    .filter((task) => !task.archivedAt && normalizeText(task.title) && normalized.includes(normalizeText(task.title)))
    .sort((a, b) => normalizeText(b.title).length - normalizeText(a.title).length);
  if (matches.length) return matches[0];

  if (contextTaskId) {
    return (tasks || []).find((task) => task.id === String(contextTaskId).toUpperCase()) || null;
  }
  return null;
}

function extractProgress(message) {
  const text = String(message || '');
  let match = text.match(/(?:进度(?:到|为|是|更新为|调整为)?\s*)?(\d{1,3})\s*%/i);
  if (!match) match = text.match(/进度(?:到|为|是|更新为|调整为)?\s*(\d{1,3})(?!\d)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

function extractNextAction(message) {
  const text = String(message || '').trim();
  const match = text.match(/(?:下一步|接下来|后续)(?:行动)?(?:是|为|要|需要|准备|计划)?\s*[：:，,]?\s*(.+)$/i);
  if (!match) return null;
  const value = match[1].trim().replace(/[。.!！]+$/, '');
  if (!value || /^(?:做什么|该做什么|怎么做|怎么安排|如何安排)$/.test(value)) return null;
  return value.slice(0, 500);
}

function inferStatus(message) {
  const text = String(message || '');
  if (/(?:已完成|已经完成|完成了|已交付|已经交付|交付完成|搞定了?)/.test(text)) return '已完成';
  if (/(?:阻塞|被卡住|卡住了?|卡点|无法推进)/.test(text)) return '阻塞';
  if (/(?:已延期|需要延期|延后|推迟)/.test(text)) return '已延期';
  if (/(?:待输出|待交付|等待输出)/.test(text)) return '待输出';
  if (/(?:已启动|开始推进|正在推进|进行中)/.test(text)) return '进行中';
  return null;
}

function normalizePatch(raw, task) {
  const patch = {};
  const errors = [];
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  if (hasOwn(source, 'status') && source.status != null && source.status !== '') {
    const status = String(source.status).trim();
    if (!TASK_STATUSES.includes(status)) errors.push('非法任务状态');
    else patch.status = status;
  }

  if (hasOwn(source, 'progress') && source.progress != null && source.progress !== '') {
    const progress = Number(source.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      errors.push('进度必须是 0-100 的整数');
    } else {
      patch.progress = progress;
    }
  }

  if (hasOwn(source, 'nextAction') && source.nextAction != null) {
    const nextAction = String(source.nextAction).trim();
    if (!nextAction) errors.push('下一步行动不能为空');
    else if (nextAction.length > 500) errors.push('下一步行动不能超过 500 字');
    else patch.nextAction = nextAction;
  }

  if (!hasOwn(patch, 'status') && hasOwn(patch, 'progress')) {
    if (patch.progress > 0 && patch.progress < 100 && task.status === '待启动') {
      patch.status = '进行中';
    } else if (
      patch.progress === 100 &&
      (STATUS_TRANSITIONS[task.status] || []).includes('待输出')
    ) {
      patch.status = '待输出';
    }
  }
  if (patch.status === '已完成') patch.progress = 100;

  return { patch, errors };
}

function diffTask(task, patch) {
  const clean = {};
  const changes = [];
  for (const field of EDITABLE_FIELDS) {
    if (!hasOwn(patch, field) || task[field] === patch[field]) continue;
    clean[field] = patch[field];
    changes.push({
      field,
      label: FIELD_LABELS[field],
      previousValue: task[field],
      newValue: patch[field],
    });
  }
  return { patch: clean, changes };
}

function validateTransition(task, patch) {
  if (!hasOwn(patch, 'status') || patch.status === task.status) return null;
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  if (!allowed.includes(patch.status)) {
    return '不允许从「' + task.status + '」迁移到「' + patch.status + '」';
  }
  return null;
}

function buildProposal(turn, tasks) {
  const taskId = String((turn && turn.taskId) || '').toUpperCase();
  const task = (tasks || []).find((item) => item.id === taskId);
  if (!task) return { error: taskId ? '未找到任务 ' + taskId : '没有识别到需要更新的任务 ID' };

  const normalized = normalizePatch(turn.patch, task);
  if (normalized.errors.length) return { error: normalized.errors.join('；') };

  const transitionError = validateTransition(task, normalized.patch);
  if (transitionError) return { error: transitionError };

  const diff = diffTask(task, normalized.patch);
  if (!diff.changes.length) return { error: '识别到的内容与当前任务一致，无需更新' };

  return {
    task,
    patch: diff.patch,
    changes: diff.changes,
    confirm: {
      taskId: task.id,
      title: task.title,
      owner: task.owner,
      previousStatus: task.status,
      newStatus: diff.patch.status || task.status,
      patch: diff.patch,
      changes: diff.changes,
      needsEvidence: diff.patch.status === '已完成',
    },
  };
}

function patchFromRequest(body, task) {
  const raw = body && body.patch && typeof body.patch === 'object' ? { ...body.patch } : {};
  if (body && body.newStatus) raw.status = body.newStatus;
  const normalized = normalizePatch(raw, task);
  if (normalized.errors.length) return { error: normalized.errors.join('；') };
  const transitionError = validateTransition(task, normalized.patch);
  if (transitionError) return { error: transitionError };
  return diffTask(task, normalized.patch);
}

function isPlanningRequest(message) {
  const text = String(message || '');
  return /(?:接下来|下一步).*(?:做什么|该做|怎么安排|如何安排)|(?:帮我)?(?:规划|安排|排一下).*(?:任务|工作|明天|今天|本周)|优先.*(?:做|推进)/.test(text);
}

function buildPlan(tasks, now) {
  const all = (tasks || []).filter((task) => !task.archivedAt && task.status !== '已完成');
  const doneIds = new Set((tasks || []).filter((task) => task.status === '已完成').map((task) => task.id));
  const current = Number(now) || Date.now();
  const score = (task) => {
    const overdue = Date.parse(task.dueAt) < current ? 1 : 0;
    const blocked = task.status === '阻塞' ? 1 : 0;
    return { overdue, blocked, priority: Number(task.priority) || 0, due: Date.parse(task.dueAt) || Number.MAX_SAFE_INTEGER };
  };
  all.sort((a, b) => {
    const x = score(a);
    const y = score(b);
    return y.overdue - x.overdue || x.blocked - y.blocked || y.priority - x.priority || x.due - y.due;
  });
  const selected = all.slice(0, 5);
  if (!selected.length) {
    return { kind: 'plan', reply: '当前没有未完成任务，可以先确认是否需要新增下一阶段任务。', tasks: [], taskIds: [] };
  }
  const lines = selected.map((task, index) => {
    const waiting = (task.dependencies || []).filter((id) => !doneIds.has(id));
    const due = String(task.dueAt || '').slice(0, 10);
    const note = waiting.length ? '；先解决依赖 ' + waiting.join('、') : '';
    return (index + 1) + '. **' + task.id + '｜' + task.title + '** — ' + task.nextAction + '（' + task.priority + '星，截止 ' + due + note + '）';
  });
  return {
    kind: 'plan',
    reply: '建议按下面顺序推进：\n' + lines.join('\n'),
    tasks: selected,
    taskIds: selected.map((task) => task.id),
  };
}

function routeConversation(message, tasks, contextTaskId, now) {
  if (isPlanningRequest(message)) return buildPlan(tasks, now);

  const progress = extractProgress(message);
  const nextAction = extractNextAction(message);
  const status = inferStatus(message);
  if (progress == null && !nextAction && !status) return null;

  const task = resolveTask(message, tasks, contextTaskId);
  if (!task) {
    return {
      kind: 'clarify',
      reply: '我识别到你要同步任务，但还不知道是哪一项。请补充任务 ID（例如 T-0006）或完整任务名称。',
    };
  }

  const patch = {};
  if (status) patch.status = status;
  if (progress != null) patch.progress = progress;
  if (nextAction) patch.nextAction = nextAction;
  const proposal = buildProposal({ taskId: task.id, patch }, tasks);
  if (proposal.error) {
    return {
      kind: 'answer',
      reply: task.id + '｜' + task.title + '：' + proposal.error + '。',
      tasks: [task],
      contextTaskId: task.id,
    };
  }
  return {
    kind: 'update',
    reply: '我已整理出 ' + task.id + '｜' + task.title + ' 的变更，请核对后确认写入。',
    tasks: [task],
    contextTaskId: task.id,
    confirm: proposal.confirm,
  };
}

module.exports = {
  EDITABLE_FIELDS,
  FIELD_LABELS,
  normalizePatch,
  diffTask,
  buildProposal,
  patchFromRequest,
  resolveTask,
  extractProgress,
  extractNextAction,
  inferStatus,
  buildPlan,
  routeConversation,
};
