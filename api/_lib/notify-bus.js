/**
 * 通知总线（服务端专用）—— 自包含实现
 *
 * 双层通知机制的唯一入口：所有任务 / 提交 / 部署 / 风险事件都走 enqueue。
 *   - critical：即时推送（部署异常 / 任务阻塞 / 逾期 / 已交付 / 风险）；
 *   - normal / important：进入 30 分钟汇总队列，由 cron 或手动 flush 批量发送；
 *   - silent：仅写 silentLog，不发送飞书 / 企微（test / chore / Hook 调试日志）。
 *
 * 去重与合并：
 *   - seen 表（SEEN_TTL_MS=30min）按 idempotencyKey 幂等；
 *   - 同一任务（mergeKey=task:<id>）在窗口内的 create/update/decompose 合并为一条；
 *   - 同一 commitSha 的 webhook 重试直接去重；
 *   - critical 已即时推过后，30 分钟内重复 → deduped，不再二次推送。
 *
 * 本模块自包含所有分级规则与常量，不依赖 notify-config.js 的内部结构（该文件由历史版本
 * 提供 LEVEL 即可）。永不抛异常；通知失败不得回滚业务数据；永不把 Webhook URL / Token 写入日志或消息。
 */
'use strict';

/* ================= 常量与分级映射（自包含） ================= */

const LEVEL = Object.freeze({
  CRITICAL: 'critical',
  IMPORTANT: 'important',
  NORMAL: 'normal',
  SILENT: 'silent',
});

const WINDOW_MIN = 30;
const WINDOW_MS = WINDOW_MIN * 60 * 1000;
const SEEN_TTL_MS = WINDOW_MS;
const MAX_SUMMARY_ITEMS = 5;

const COMMIT_PREFIX_LEVEL = Object.freeze({
  test: LEVEL.SILENT,
  chore: LEVEL.SILENT,
  build: LEVEL.SILENT,
  ci: LEVEL.SILENT,
  docs: LEVEL.NORMAL,
  style: LEVEL.NORMAL,
  refactor: LEVEL.NORMAL,
  perf: LEVEL.NORMAL,
  fix: LEVEL.NORMAL,
  feat: LEVEL.NORMAL,
  merge: LEVEL.NORMAL,
  revert: LEVEL.NORMAL,
});

const TASK_OP_LEVEL = Object.freeze({
  create: LEVEL.NORMAL,
  update: LEVEL.NORMAL,
  decompose: LEVEL.NORMAL,
  archive: LEVEL.NORMAL,
  weekly: LEVEL.NORMAL,
  blocked: LEVEL.CRITICAL,
  overdue: LEVEL.CRITICAL,
  delivered: LEVEL.CRITICAL,
});

const STATUS_ESCALATE = Object.freeze({
  阻塞: 'blocked',
  已交付: 'delivered',
  已完成: 'delivered',
});

const IMMEDIATE_TITLE = '【PIP｜需要你处理】';
const SUMMARY_TITLE = '【PIP｜30 分钟工作摘要】';
const OPS_LABEL = { create: '已创建', update: '已更新', decompose: '已拆解', archive: '已归档', weekly: '周报更新', blocked: '阻塞', overdue: '逾期', delivered: '已交付' };

const nowMs = () => Date.now();

/** 轻量字符串 hash（无 commitSha 时用作幂等键，非加密用途） */
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** 北京时间（Asia/Shanghai）日期 / 时间分量；与系统时区无关 */
function shanghaiParts(ms) {
  const d = new Date((ms || nowMs()) + 8 * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    Y: d.getUTCFullYear(),
    M: pad(d.getUTCMonth() + 1),
    D: pad(d.getUTCDate()),
    h: pad(d.getUTCHours()),
    m: pad(d.getUTCMinutes()),
  };
}

function formatWindow(window) {
  if (!window || !window.startedAt || !window.endsAt) return '—';
  const s = shanghaiParts(window.startedAt);
  const e = shanghaiParts(window.endsAt);
  return `${s.Y}-${s.M}-${s.D} ${s.h}:${s.m}–${e.h}:${e.m}`;
}

/* ================= 状态结构 ================= */

function ensureNotify(state) {
  if (!state.notify) state.notify = {};
  const n = state.notify;
  if (!n.seen || typeof n.seen !== 'object') n.seen = {};
  if (!Array.isArray(n.queue)) n.queue = [];
  if (!n.window || typeof n.window !== 'object') n.window = { startedAt: null, endsAt: null };
  if (!n.pausedUntil) n.pausedUntil = null;
  if (!n.lastFlush) n.lastFlush = null;
  if (!Array.isArray(n.silentLog)) n.silentLog = [];
  if (!n.dualDedupe) n.dualDedupe = {};
  if (!n.channelStatus) n.channelStatus = {};
  return n;
}

function gcSeen(n) {
  const now = nowMs();
  for (const [k, t] of Object.entries(n.seen || {})) {
    if (typeof t === 'number' && now - t > SEEN_TTL_MS) delete n.seen[k];
  }
}

function appendSilentLog(n, event, c, reason) {
  n.silentLog.push({
    at: new Date().toISOString(),
    type: c.type,
    op: c.op,
    level: c.level,
    reason: reason || 'prefix-silent',
    taskId: event.taskId || null,
    commitSha: (event.commitSha || '').slice(0, 12) || null,
    commitMsg: String(event.commitMsg || '').slice(0, 80) || null,
  });
  if (n.silentLog.length > 200) n.silentLog.splice(0, n.silentLog.length - 200);
}

/* ================= 事件分类 ================= */

function classify(event) {
  const type = String((event && event.type) || '').toLowerCase();

  if (type === 'commit') {
    const msg = String((event && event.commitMsg) || '');
    const m = msg.match(/^\s*([A-Za-z]+)/);
    const prefix = m ? m[1].toLowerCase() : '';
    const level = COMMIT_PREFIX_LEVEL[prefix] || LEVEL.NORMAL;
    const sha = String((event && event.commitSha) || '').slice(0, 40);
    return {
      type, level, op: 'commit',
      commitPrefix: prefix || null,
      commitSha: sha || null,
      idempotencyKey: sha ? `commit:${sha}` : `commit:${hash(msg)}`,
      mergeKey: null,
    };
  }
  if (type === 'deploy') return { type, level: LEVEL.CRITICAL, op: 'deploy', idempotencyKey: `deploy:${event.deploymentId || event.commitSha || hash(JSON.stringify(event))}`, mergeKey: null };
  if (type === 'incident') return { type, level: LEVEL.CRITICAL, op: 'incident', idempotencyKey: `incident:${event.incidentId || hash(JSON.stringify(event))}`, mergeKey: null };
  if (type === 'risk') return { type, level: LEVEL.CRITICAL, op: 'risk', idempotencyKey: `risk:${event.riskId || hash(JSON.stringify(event))}`, mergeKey: null };
  if (type === 'hook' || type === 'notification-test') return { type, level: LEVEL.SILENT, op: type, idempotencyKey: `hook:${event.commitSha || event.hookId || hash(JSON.stringify(event))}`, mergeKey: null };
  if (type === 'branch' || type === 'refactor' || type === 'docs') {
    return { type, level: LEVEL.NORMAL, op: type, idempotencyKey: `${type}:${event.id || event.commitSha || hash(JSON.stringify(event))}`, mergeKey: null };
  }

  if (type === 'task') {
    let op = String((event && event.op) || 'update').toLowerCase();
    let level = TASK_OP_LEVEL[op] || LEVEL.NORMAL;
    // 状态升级：update 时 statusBecame 命中 阻塞/已交付/已完成 → critical
    if (op === 'update' && event.statusBecame && STATUS_ESCALATE[event.statusBecame]) {
      op = STATUS_ESCALATE[event.statusBecame];
      level = LEVEL.CRITICAL;
    }
    // archive 已完成 → 已交付 → critical
    if (op === 'archive' && event.completed) {
      op = 'delivered';
      level = LEVEL.CRITICAL;
    }
    const taskId = String((event && event.taskId) || '').toUpperCase();
    return {
      type, level, op, taskId,
      idempotencyKey: taskId ? `task:${taskId}:${level}` : `task:${op}:${hash(JSON.stringify(event))}`,
      mergeKey: taskId ? `task:${taskId}` : null,
    };
  }

  return { type, level: LEVEL.NORMAL, op: type || 'unknown', idempotencyKey: `${type}:${event.id || hash(JSON.stringify(event))}`, mergeKey: null };
}

/* ================= 队列合并 ================= */

function makeItem(event, c, linkBase, linkParams, now) {
  return {
    mergeKey: c.mergeKey,
    type: c.type,
    level: c.level,
    op: c.op,
    taskId: event.taskId || null,
    title: event.title || null,
    ops: [c.op],
    progress: typeof event.progress === 'number' ? event.progress : null,
    status: event.status || null,
    decomposedTo: Array.isArray(event.decomposedTo) ? [...event.decomposedTo] : [],
    changeText: event.changeText || null,
    owner: event.owner || null,
    commitSha: event.commitSha || null,
    commitMsg: event.commitMsg || null,
    commitPrefix: c.commitPrefix || null,
    project: event.project || null,
    reason: event.reason || null,
    suggestedAction: event.suggestedAction || null,
    linkBase: linkBase || event.linkBase || null,
    linkParams: event.linkParams || null,
    firstAt: now,
    lastAt: now,
  };
}

function mergeInto(existing, event, c, now) {
  if (c.op && !existing.ops.includes(c.op)) existing.ops.push(c.op);
  if (typeof event.progress === 'number') existing.progress = event.progress;
  if (Array.isArray(event.decomposedTo)) {
    existing.decomposedTo = [...new Set([...(existing.decomposedTo || []), ...event.decomposedTo])];
  }
  if (event.title) existing.title = event.title;
  if (event.status) existing.status = event.status;
  if (event.changeText) existing.changeText = event.changeText;
  if (event.reason) existing.reason = event.reason;
  if (event.suggestedAction) existing.suggestedAction = event.suggestedAction;
  if (event.owner) existing.owner = event.owner;
  existing.lastAt = now;
  return existing;
}

function enqueueCoalesced(n, event, c, linkBase, linkParams) {
  const now = nowMs();
  if (c.mergeKey) {
    const existing = n.queue.find((q) => q.mergeKey === c.mergeKey);
    if (existing) return mergeInto(existing, event, c, now);
  }
  const item = makeItem(event, c, linkBase, linkParams, now);
  n.queue.push(item);
  return item;
}

/* ================= 即时推送 / 汇总构建 ================= */

function defaultReason(c) {
  if (c.op === 'blocked') return '任务已阻塞，等待确认';
  if (c.op === 'overdue') return '任务已逾期';
  if (c.op === 'delivered') return '任务已交付';
  if (c.op === 'deploy') return 'Production 部署状态变化';
  if (c.op === 'incident') return '线上服务异常';
  if (c.op === 'risk') return '风险 / 合规 / 资金安全';
  return '需要你处理';
}

function buildImmediateLines(event, c) {
  const lines = [];
  const subject = event.taskId ? `${event.taskId} ${event.title || ''}`.trim() : (event.title || c.type);
  lines.push(`事项：${subject}`);
  lines.push(`原因：${event.reason || defaultReason(c)}`);
  if (event.suggestedAction) lines.push(`建议动作：${event.suggestedAction}`);
  return lines;
}

function describeOps(ops) {
  return (ops || []).map((o) => OPS_LABEL[o] || o).join('、') || '更新';
}

function buildSummary(state, window) {
  const n = ensureNotify(state);
  const queue = n.queue;
  const normalTasks = queue.filter((q) => q.type === 'task' && q.level !== LEVEL.CRITICAL);
  const criticals = queue.filter((q) => q.level === LEVEL.CRITICAL);
  const commits = queue.filter((q) => q.type === 'commit');
  const deploys = queue.filter((q) => q.type === 'deploy' || q.type === 'incident' || q.type === 'risk');

  const lines = [];
  lines.push('时间：' + formatWindow(window) + '（北京时间）');
  lines.push('');

  // 1. 任务进展（普通任务，受 MAX_SUMMARY_ITEMS 约束）
  lines.push('1. 任务进展');
  const focusTotal = normalTasks.length + criticals.length;
  const taskBudget = Math.max(0, MAX_SUMMARY_ITEMS - criticals.length);
  const shownTasks = normalTasks.slice(0, taskBudget);
  for (const item of shownTasks) {
    const head = item.taskId ? `${item.taskId}｜${item.title || ''}` : (item.title || '任务');
    let line = `* ${head}：${describeOps(item.ops)}`;
    if (typeof item.progress === 'number') line += `，当前进度 ${item.progress}%`;
    lines.push(line);
    if (item.decomposedTo && item.decomposedTo.length) {
      lines.push(`* 已拆解为：${item.decomposedTo.join('、')}`);
    }
  }
  const overflow = focusTotal - MAX_SUMMARY_ITEMS;
  if (overflow > 0) lines.push(`* 另有 ${overflow} 项常规更新`);
  if (focusTotal === 0) lines.push('* 无');
  lines.push('');

  // 2. 代码与部署
  lines.push('2. 代码与部署');
  if (commits.length) {
    const groups = {};
    for (const c of commits) {
      const k = c.project || '代码库';
      groups[k] = (groups[k] || 0) + 1;
    }
    for (const [proj, cnt] of Object.entries(groups)) {
      lines.push(`* ${proj}：合并 ${cnt} 项正常更新`);
    }
  }
  if (deploys.length) {
    for (const d of deploys) lines.push(`* Production：${d.reason || d.detail || '有异常，请关注'}`);
  } else {
    lines.push('* Production：无异常');
  }
  lines.push('');

  // 3. 需要关注
  lines.push('3. 需要关注');
  if (criticals.length) {
    for (const c of criticals) {
      const head = c.taskId ? `${c.taskId}｜${c.title || ''}` : (c.title || c.type);
      lines.push(`* ${head}：${c.reason || defaultReason(c)}`);
    }
  } else {
    lines.push('* 无');
  }

  return { title: SUMMARY_TITLE, lines };
}

/* ================= flush / maybeFlush ================= */

async function maybeFlush(state, opts = {}) {
  const n = ensureNotify(state);
  if (n.queue.length === 0) return { sent: false };
  const now = nowMs();
  if (!n.window.startedAt) return { sent: false };
  if (now >= n.window.endsAt) {
    return await flush(state, { sender: opts.sender, linkBase: opts.linkBase });
  }
  return { sent: false };
}

async function flush(state, opts = {}) {
  const n = ensureNotify(state);
  if (n.queue.length === 0) {
    return { sent: false, items: 0, summary: null, dual: null };
  }
  const summary = buildSummary(state, n.window);
  if (opts.dryRun) {
    return { sent: false, items: n.queue.length, summary, dual: null };
  }
  let dual = null;
  if (opts.sender) {
    const eventId = `summary:${nowMs()}`;
    try {
      dual = await opts.sender(state, { eventId, title: summary.title, lines: summary.lines, linkBase: opts.linkBase, linkParams: {} });
    } catch { /* sender 永不抛异常；防御性吞错，不阻断汇总 */ }
  }
  n.lastSummary = {
    at: new Date().toISOString(),
    wecom: dual && dual.wecom ? { ok: !!dual.wecom.success } : null,
    feishu: dual && dual.feishu ? { ok: !!dual.feishu.success } : null,
  };
  n.queue = [];
  n.window = { startedAt: null, endsAt: null };
  n.lastFlush = nowMs();
  // sent：至少一个渠道成功发送即视为成功（兼容只配置单渠道的场景）
  const sent = !!(dual && (dual.ok || dual.partial));
  return { sent, items: summary.items || 0, summary, dual };
}

/* ================= 对外入口 ================= */

async function enqueue(state, event, opts = {}) {
  const n = ensureNotify(state);
  gcSeen(n);
  const c = classify(event);
  const linkBase = event.linkBase || opts.linkBase;
  const linkParams = event.linkParams || opts.linkParams || {};

  // 幂等去重：seen 命中后，critical 已即时推过 → deduped；普通任务同 taskId → 合并；其余 → deduped
  if (n.seen[c.idempotencyKey]) {
    if (c.level === LEVEL.CRITICAL) {
      return { level: c.level, action: 'deduped', deduped: true, queuedCount: n.queue.length, classification: c };
    }
    if (c.mergeKey) {
      const existing = n.queue.find((q) => q.mergeKey === c.mergeKey);
      if (existing) {
        mergeInto(existing, event, c, nowMs());
        return { level: c.level, action: 'queued', merged: true, queuedCount: n.queue.length, classification: c };
      }
    }
    return { level: c.level, action: 'deduped', deduped: true, queuedCount: n.queue.length, classification: c };
  }
  n.seen[c.idempotencyKey] = nowMs();

  // 静默：仅写日志，不发送
  if (c.level === LEVEL.SILENT) {
    appendSilentLog(n, event, c, 'prefix-silent');
    return { level: c.level, action: 'silenced', queuedCount: n.queue.length, classification: c };
  }

  // critical：即时推送（暂停期改为入队，恢复后随汇总带出）
  if (c.level === LEVEL.CRITICAL) {
    if (!isPaused(n)) {
      const lines = buildImmediateLines(event, c);
      let dual = null;
      if (opts.sender) {
        try {
          dual = await opts.sender(state, { eventId: c.idempotencyKey, title: IMMEDIATE_TITLE, lines, linkBase, linkParams });
        } catch { /* sender 永不抛异常；防御性吞错 */ }
      }
      return { level: c.level, action: 'sent-immediate', dual, queuedCount: n.queue.length, classification: c };
    }
    await maybeFlush(state, { sender: opts.sender, linkBase });
    ensureNotify(state);
    enqueueCoalesced(n, event, c, linkBase, linkParams);
    if (!n.window.startedAt) n.window = { startedAt: nowMs(), endsAt: nowMs() + WINDOW_MS };
    return { level: c.level, action: 'queued-paused', queued: true, queuedCount: n.queue.length, classification: c };
  }

  // normal / important：先尝试窗口到期自动汇总，再入队合并
  await maybeFlush(state, { sender: opts.sender, linkBase });
  ensureNotify(state);
  enqueueCoalesced(n, event, c, linkBase, linkParams);
  if (!n.window.startedAt) n.window = { startedAt: nowMs(), endsAt: nowMs() + WINDOW_MS };
  return {
    level: c.level,
    action: isPaused(n) ? 'queued-paused' : 'queued',
    queued: true,
    queuedCount: n.queue.length,
    classification: c,
  };
}

/* ================= 手动控制 / 状态查询 ================= */

function pendingCount(state) {
  return ensureNotify(state).queue.length;
}

function isPaused(notify) {
  const n = notify || {};
  return !!(n.pausedUntil && nowMs() < n.pausedUntil);
}

function pause(state, minutes) {
  const n = ensureNotify(state);
  const mins = Number(minutes) > 0 ? Number(minutes) : 60;
  n.pausedUntil = nowMs() + mins * 60 * 1000;
  return n.pausedUntil;
}

function resume(state) {
  const n = ensureNotify(state);
  n.pausedUntil = null;
  return n.pausedUntil;
}

function tierStatus(state) {
  const n = ensureNotify(state);
  return {
    pending: n.queue.length,
    paused: isPaused(n),
    pausedUntil: n.pausedUntil || null,
    windowMin: WINDOW_MIN,
    windowEndsAt: n.window.endsAt || null,
    lastFlush: n.lastFlush || null,
    silent: n.silentLog.length,
  };
}

module.exports = {
  LEVEL,
  WINDOW_MIN,
  WINDOW_MS,
  MAX_SUMMARY_ITEMS,
  classify,
  enqueue,
  flush,
  maybeFlush,
  buildSummary,
  buildImmediateLines,
  pendingCount,
  isPaused,
  pause,
  resume,
  tierStatus,
  ensureNotify,
};
