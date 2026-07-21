/**
 * 动作路由层：把 intent 落到数据层，返回人类可读结果。
 * 所有变更先过状态机与 schema 校验，成功后写审计日志。
 */
'use strict';

const { STATUS_TRANSITIONS, TASK_STATUSES } = require('./schema');
const {
  loadTasks,
  saveTasks,
  appendAudit,
  nextTaskId,
  addBlocker,
  nowIso,
  todayStr,
  syncFallbackQuiet,
} = require('./data-writer');

const TERMINAL = ['已完成'];
const ACTIVE_FOR_DUE = ['待启动', '进行中', '已提醒', '待输出', '阻塞'];

function findTask(data, id) {
  if (!id) throw new Error('缺少任务 ID（形如 T-0001）');
  const task = data.tasks.find((t) => t.id === id.toUpperCase());
  if (!task) throw new Error(`未找到任务 ${id}`);
  return task;
}

function transition(task, to) {
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  if (task.status !== to && !allowed.includes(to)) {
    throw new Error(`不允许从「${task.status}」迁移到「${to}」`);
  }
  task.status = to;
}

function fmtLine(t) {
  const due = t.dueAt.slice(0, 16).replace('T', ' ');
  return `${t.id}  [${t.priority}] ${t.title} ｜ ${t.status} ｜ 进度 ${t.progress}% ｜ 截止 ${due} ｜ 下一步：${t.nextAction}`;
}

/** 任务变更统一收尾：保存 → 审计 → FALLBACK 同步 */
function finalize(data, actor, action, taskId, detail) {
  saveTasks(data);
  appendAudit(actor, action, taskId, detail);
  syncFallbackQuiet();
}

function buildTask(fields, id, source) {
  return {
    id,
    title: fields.title,
    status: '待启动',
    priority: fields.priority || 'P1',
    workstream: fields.workstream || null,
    owner: fields.owner || 'Sera',
    createdAt: nowIso(),
    dueAt: fields.dueAt,
    remindAt: fields.remindAt,
    remindedAt: null,
    completedAt: null,
    progress: 0,
    nextAction: fields.nextAction || '待明确下一步',
    outputCondition: fields.outputCondition || '产出可交付结果并确认',
    result: null,
    source,
  };
}

async function run(intent, hooks = {}) {
  switch (intent.action) {
    case 'add': {
      const data = loadTasks();
      const task = buildTask(intent, nextTaskId(data.tasks), 'cli');
      data.tasks.push(task);
      finalize(data, 'cli', 'create', task.id, `新增任务「${task.title}」，截止 ${task.dueAt}，提醒 ${task.remindAt}`);
      return `✅ 已新增 ${fmtLine(task)}`;
    }

    case 'done': {
      const data = loadTasks();
      const task = findTask(data, intent.id);
      transition(task, '已完成');
      task.progress = 100;
      task.completedAt = nowIso();
      if (intent.result) task.result = intent.result;
      let detail = `完成任务「${task.title}」${intent.result ? `，结果：${intent.result}` : ''}`;
      finalize(data, 'cli', 'complete', task.id, detail);

      let followMsg = '';
      if (intent.follow) {
        const fresh = loadTasks();
        const followDue = intent.followDueAt || (() => {
          const d = new Date(Date.now() + 2 * 24 * 3600 * 1000);
          const sh = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
          return `${sh.getFullYear()}-${String(sh.getMonth() + 1).padStart(2, '0')}-${String(sh.getDate()).padStart(2, '0')}T18:00:00+08:00`;
        })();
        const follow = buildTask({
          title: intent.follow,
          priority: task.priority,
          workstream: task.workstream,
          owner: task.owner,
          dueAt: followDue,
          remindAt: intent.followRemindAt || (() => {
            const d = new Date(Date.parse(followDue) - 24 * 3600 * 1000);
            const sh = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
            return `${sh.getFullYear()}-${String(sh.getMonth() + 1).padStart(2, '0')}-${String(sh.getDate()).padStart(2, '0')}T09:00:00+08:00`;
          })(),
        }, nextTaskId(fresh.tasks), 'cli');
        fresh.tasks.push(follow);
        finalize(fresh, 'cli', 'create', follow.id, `由 ${task.id} 结果输出创建后续任务「${follow.title}」`);
        followMsg = `\n🔗 后续任务 ${fmtLine(follow)}`;
      }
      return `✅ 已完成 ${task.id}「${task.title}」${followMsg}`;
    }

    case 'postpone': {
      const data = loadTasks();
      const task = findTask(data, intent.id);
      const oldDue = task.dueAt;
      transition(task, '已延期');
      task.dueAt = intent.to;
      task.remindAt = intent.remindAt || task.remindAt;
      task.remindedAt = null;
      finalize(data, 'cli', 'postpone', task.id, `「${task.title}」截止 ${oldDue} → ${intent.to}${intent.reason ? `，原因：${intent.reason}` : ''}`);
      return `⏸️  已延期 ${fmtLine(task)}`;
    }

    case 'delete': {
      const data = loadTasks();
      const task = findTask(data, intent.id);
      if (!intent.yes) {
        if (!hooks.confirm) throw new Error('删除需要二次确认');
        const ok = await hooks.confirm(task);
        if (!ok) return `🚫 已取消删除 ${task.id}`;
      } else {
        console.warn('⚠️  --yes 已跳过交互确认，操作将记入审计日志');
      }
      data.tasks = data.tasks.filter((t) => t.id !== task.id);
      finalize(data, 'cli', 'delete', task.id, `删除任务「${task.title}」，删除前快照：${JSON.stringify(task)}`);
      return `🗑️  已删除 ${task.id}「${task.title}」`;
    }

    case 'progress': {
      const data = loadTasks();
      const task = findTask(data, intent.id);
      if (TERMINAL.includes(task.status)) throw new Error(`${task.id} 已完成，不能再更新进度`);
      task.progress = intent.value;
      if (intent.value > 0 && ['待启动', '已提醒'].includes(task.status)) transition(task, '进行中');
      if (intent.value >= 100 && task.status === '进行中') transition(task, '待输出');
      finalize(data, 'cli', 'progress', task.id, `「${task.title}」进度更新为 ${intent.value}%`);
      return `📈 已更新 ${fmtLine(task)}`;
    }

    case 'next': {
      if (!intent.text) throw new Error('缺少下一步内容');
      const data = loadTasks();
      const task = findTask(data, intent.id);
      if (TERMINAL.includes(task.status)) throw new Error(`${task.id} 已完成，不能再更新下一步`);
      const old = task.nextAction;
      task.nextAction = intent.text;
      if (task.status === '已提醒') transition(task, '进行中');
      finalize(data, 'cli', 'next', task.id, `「${task.title}」下一步：${old} → ${intent.text}`);
      return `👉 已更新 ${fmtLine(task)}`;
    }

    case 'block': {
      if (!intent.text) throw new Error('缺少阻塞描述');
      const total = addBlocker(intent.text);
      let taskMsg = '';
      if (intent.id) {
        const data = loadTasks();
        const task = findTask(data, intent.id);
        transition(task, '阻塞');
        finalize(data, 'cli', 'block', task.id, `「${task.title}」标记阻塞：${intent.text}`);
        taskMsg = `，${task.id} 已标记阻塞`;
      } else {
        appendAudit('cli', 'block', null, `新增阻塞项：${intent.text}`);
        syncFallbackQuiet();
      }
      return `⛔ 阻塞已记录（当前共 ${total} 项）${taskMsg}`;
    }

    case 'today': {
      const data = loadTasks();
      const today = todayStr();
      const due = data.tasks.filter((t) => t.dueAt.slice(0, 10) === today && !TERMINAL.includes(t.status));
      if (!due.length) return `📭 今日（${today}）无到期任务`;
      return `📌 今日（${today}）到期 ${due.length} 项：\n${due.map(fmtLine).join('\n')}`;
    }

    case 'pendingOutput': {
      const data = loadTasks();
      const now = Date.now();
      const dayMs = 24 * 3600 * 1000;
      const monday = (() => {
        const d = new Date(now + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
        const dow = (d.getDay() + 6) % 7;
        return new Date(Date.parse(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00+08:00`) - dow * dayMs);
      })();
      const sunday = monday.getTime() + 7 * dayMs;
      const pending = data.tasks.filter((t) => t.status === '待输出');
      const dueThisWeek = data.tasks.filter((t) => {
        const due = Date.parse(t.dueAt);
        return !TERMINAL.includes(t.status) && t.status !== '待输出' && due >= monday.getTime() && due < sunday;
      });
      const lines = [];
      if (pending.length) lines.push(`🟡 待输出 ${pending.length} 项：\n${pending.map(fmtLine).join('\n')}`);
      if (dueThisWeek.length) lines.push(`🗓️  本周其他到期 ${dueThisWeek.length} 项：\n${dueThisWeek.map(fmtLine).join('\n')}`);
      return lines.length ? lines.join('\n\n') : '📭 本周暂无待输出任务';
    }

    case 'list': {
      const data = loadTasks();
      if (!data.tasks.length) return '📭 暂无任务';
      const groups = TASK_STATUSES.map((s) => [s, data.tasks.filter((t) => t.status === s)]).filter(([, arr]) => arr.length);
      return groups.map(([s, arr]) => `【${s}】\n${arr.map(fmtLine).join('\n')}`).join('\n\n');
    }

    default:
      throw new Error(`action-router 未处理的 action: ${intent.action}`);
  }
}

module.exports = { run, ACTIVE_FOR_DUE, TERMINAL };
