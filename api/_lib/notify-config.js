/**
 * 通知分级配置（服务端专用）
 *
 * 四级通知体系：
 *   critical  → 即时推送（生产异常 / 阻塞 / 逾期 / 已交付 / 风险）
 *   important → 即时或进入下一次汇总（预留，当前等同 normal）
 *   normal    → 30 分钟汇总（普通任务变更 / 普通代码提交）
 *   silent    → 仅记录日志，不发送飞书/企微（test/chore/重复/空提交）
 *
 * 安全约定：本模块不含任何 webhook URL 或 token，仅做纯逻辑分类。
 */
'use strict';

const LEVEL = Object.freeze({
  CRITICAL: 'critical',
  IMPORTANT: 'important',
  NORMAL: 'normal',
  SILENT: 'silent',
});

/** 汇总窗口：30 分钟 */
const WINDOW_MS = 30 * 60 * 1000;
const WINDOW_MIN = 30;
/** 幂等记忆 TTL：30 分钟（同 idempotencyKey 在窗口内不重复处理） */
const SEEN_TTL_MS = 30 * 60 * 1000;
/** 汇总最多展示的重点项数 */
const MAX_SUMMARY_ITEMS = 5;

/** Conventional Commits 前缀 → 通知级别 */
const COMMIT_PREFIX_LEVEL = Object.freeze({
  feat: LEVEL.NORMAL,
  fix: LEVEL.NORMAL,
  docs: LEVEL.NORMAL,
  perf: LEVEL.NORMAL,
  improve: LEVEL.NORMAL,
  wip: LEVEL.NORMAL,
  test: LEVEL.SILENT,
  chore: LEVEL.SILENT,
  build: LEVEL.SILENT,
  ci: LEVEL.SILENT,
  style: LEVEL.SILENT,
  lint: LEVEL.SILENT,
  refactor: LEVEL.SILENT,
});

/** 任务操作 → 通知级别 */
const TASK_OP_LEVEL = Object.freeze({
  create: LEVEL.NORMAL,
  update: LEVEL.NORMAL,
  decompose: LEVEL.NORMAL,
  archive: LEVEL.NORMAL,
  blocked: LEVEL.CRITICAL,
  overdue: LEVEL.CRITICAL,
  delivered: LEVEL.CRITICAL,
  complete: LEVEL.CRITICAL,
});

/** 状态升级：update 时 statusBecame 命中这些状态 → 升级为对应 op（critical） */
const STATUS_ESCALATE = Object.freeze({
  阻塞: 'blocked',
  已交付: 'delivered',
  已完成: 'delivered',
});

/** 即时推送标题（critical 事件） */
const IMMEDIATE_TITLE = '【PIP｜需要你处理】';
/** 30 分钟汇总标题 */
const SUMMARY_TITLE = '【PIP｜30 分钟工作摘要】';

/** Conventional Commits 前缀 → silent 的正则（test/chore/build/ci/style/lint） */
const SILENT_COMMIT_RE = /^(test|chore|build|ci|style|lint|refactor)(\(.+\))?!?:/;

/** 普通提交前缀（feat/fix/docs/perf/improve）→ normal */
const NORMAL_COMMIT_RE = /^(feat|fix|docs|perf|improve|wip)(\(.+\))?!?:/;

/**
 * 对事件进行分级。
 * event: { type, op, taskId, commitMsg, commitSha, completed, ... }
 * 返回 { level, reason }
 */
function classify(event) {
  if (!event || typeof event !== 'object') return { level: LEVEL.NORMAL, reason: '未知事件类型' };

  /* ---- 部署 / 线上异常 / 风险 → critical ---- */
  if (event.type === 'deploy') {
    return { level: LEVEL.CRITICAL, reason: 'Production 部署事件' };
  }
  if (event.type === 'incident') {
    return { level: LEVEL.CRITICAL, reason: '线上服务/API/数据库异常' };
  }
  if (event.type === 'risk') {
    return { level: LEVEL.CRITICAL, reason: '风险/合规/资金安全事件' };
  }

  /* ---- 任务事件 ---- */
  if (event.type === 'task') {
    const op = String(event.op || '');

    // 阻塞 / 逾期 / 已交付 → critical
    if (op === 'blocked' || op === 'block') {
      return { level: LEVEL.CRITICAL, reason: '任务被阻塞，需要负责人确认' };
    }
    if (op === 'overdue') {
      return { level: LEVEL.CRITICAL, reason: '高优先级任务逾期' };
    }
    if (op === 'archive' && event.completed) {
      return { level: LEVEL.CRITICAL, reason: '任务已交付归档' };
    }
    if (op === 'complete' || op === 'delivered') {
      return { level: LEVEL.CRITICAL, reason: '任务被标记为已交付' };
    }

    // 新建 / 更新 / 拆解 → normal（进入 30 分钟汇总）
    if (op === 'create' || op === 'update' || op === 'decompose' || op === 'archive') {
      return { level: LEVEL.NORMAL, reason: '普通任务变更' };
    }

    // 其他任务操作 → normal
    return { level: LEVEL.NORMAL, reason: '任务操作' };
  }

  /* ---- Git 提交事件 ---- */
  if (event.type === 'commit') {
    const msg = String(event.commitMsg || '');

    // test/chore/build/ci/style/lint/refactor → silent
    if (SILENT_COMMIT_RE.test(msg)) {
      const prefix = msg.match(/^(\w+)/);
      return { level: LEVEL.SILENT, reason: `${prefix ? prefix[1] : 'test/chore'} 提交，默认静默` };
    }

    // feat/fix/docs/perf → normal（进入汇总）
    if (NORMAL_COMMIT_RE.test(msg)) {
      return { level: LEVEL.NORMAL, reason: '普通代码提交' };
    }

    // 无前缀或未知前缀 → normal
    return { level: LEVEL.NORMAL, reason: '代码提交' };
  }

  /* ---- 通知链路测试 → silent ---- */
  if (event.type === 'notification-test') {
    return { level: LEVEL.SILENT, reason: '通知链路验证，默认静默' };
  }

  /* ---- 默认 → normal ---- */
  return { level: LEVEL.NORMAL, reason: '未分类事件' };
}

/**
 * 构建幂等去重键。
 * - commit 事件：commitSha（同 commit 多次 webhook 只处理一次）
 * - task 事件：taskId + opGroup（同任务同类操作合并）
 * - 其他：eventId
 */
function dedupeKey(event) {
  if (!event) return '';
  if (event.type === 'commit' && event.commitSha) {
    return `commit:${event.commitSha}`;
  }
  if (event.type === 'task' && event.taskId) {
    // 同任务的操作合并为一个去重组（30 分钟内只保留最终状态）
    return `task:${event.taskId}`;
  }
  return String(event.eventId || event.commitSha || '');
}

/**
 * 构建合并键（用于"同项目+同任务+同操作类型在 30 分钟内只保留一条最终状态"）。
 * - task 事件：taskId（新建→更新→拆解 合并为一条任务动态）
 * - commit 事件：project（同项目多次提交合并计数）
 */
function mergeKey(event) {
  if (!event) return '';
  if (event.type === 'task' && event.taskId) {
    return `task:${event.taskId}`;
  }
  if (event.type === 'commit') {
    return `commit:${event.project || 'pip'}`;
  }
  return '';
}

module.exports = {
  LEVEL,
  WINDOW_MS,
  WINDOW_MIN,
  SEEN_TTL_MS,
  MAX_SUMMARY_ITEMS,
  COMMIT_PREFIX_LEVEL,
  TASK_OP_LEVEL,
  STATUS_ESCALATE,
  IMMEDIATE_TITLE,
  SUMMARY_TITLE,
  SILENT_COMMIT_RE,
  NORMAL_COMMIT_RE,
  classify,
  dedupeKey,
  mergeKey,
};
