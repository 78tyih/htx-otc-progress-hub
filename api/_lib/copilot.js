/**
 * PIP 对话助手的结构化变更校验。
 * LLM 只负责提出候选变更；本模块负责白名单、状态机和差异计算。
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

  // 与 CLI 语义保持一致：开始推进自动进入进行中；100% 进入待输出。
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

module.exports = {
  EDITABLE_FIELDS,
  FIELD_LABELS,
  normalizePatch,
  diffTask,
  buildProposal,
  patchFromRequest,
};
