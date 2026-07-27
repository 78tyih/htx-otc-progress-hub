/**
 * /api/status — Agent / Webhook 在线状态 + 通知控制
 *
 * GET  /api/status          → 状态 + 通知队列/暂停状态（含 lazy flush）
 * POST /api/status           → 通知控制动作
 *   body: { action: 'flush'|'pause'|'resume'|'git-hook', minutes?, dryRun?, commitSha?, commitMsg?, branch?, project? }
 *
 * 安全：不暴露 webhook URL 或 token；线上由 Vercel Authentication 保护。
 */
'use strict';

const { sendJson, methodGuard, dashboardUrl, readBody } = require('./_lib/http');
const { loadState, saveState, recentAgentUpdates, useKv } = require('./_lib/store');
const { wecomConfigured } = require('./_lib/wecom');
const { feishuConfigured } = require('./_lib/feishu');
const { llmConfigured, aiConfig } = require('./_lib/llm');
const { tokenConfigured } = require('./_lib/security');
const { classifyAll, byClass } = require('../agent/classify');
const notifyBus = require('./_lib/notify-bus');
const { sendDirect } = require('./_lib/dual');

/** 全部统计从执行层任务数据动态计算，不写死 */
function computeStats(tasks) {
  const classified = classifyAll(tasks, Date.now());
  const done = byClass(classified, 'done').length;
  const total = classified.length;
  return {
    total,
    done,
    inProgress: byClass(classified, 'in_progress').length,
    blocked: byClass(classified, 'blocked').length,
    overdue: byClass(classified, 'overdue').length,
    pending: byClass(classified, 'pending').length,
    needsConfirmation: byClass(classified, 'needs_confirmation').length,
    unfinished: total - done,
    completionRate: total ? Math.round((done / total) * 100) : 0,
  };
}

/** GET：状态 + 通知队列/暂停状态 */
async function getStatus(req, res) {
  const state = await loadState();

  // lazy flush：读触发时检查 30 分钟窗口是否到期，到期则发送上一轮汇总
  try {
    const flushResult = await notifyBus.maybeFlush(state, {
      sender: sendDirect,
      linkBase: dashboardUrl(req),
    });
    if (flushResult.sent) {
      try { await saveState(state); } catch { /* flush 失败不阻断 status 响应 */ }
    }
  } catch { /* flush 失败不阻断 status 响应 */ }

  const cs = state.notify.channelStatus || {};
  const llm = aiConfig();
  const kv = useKv();
  const tier = notifyBus.tierStatus(state);

  sendJson(res, 200, {
    ok: true,
    at: new Date().toISOString(),
    // 当前部署来源（Vercel 自动注入；本地为 null）
    deploy: {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ? String(process.env.VERCEL_GIT_COMMIT_SHA).slice(0, 12) : null,
      commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      ref: process.env.VERCEL_GIT_COMMIT_REF || null,
      env: process.env.VERCEL_ENV || (process.env.VERCEL ? 'production' : 'development'),
    },
    agent: {
      online: true,
      llmConfigured: llmConfigured(),
      model: llm ? llm.model : null,
      provider: llm ? llm.provider : null,
      mode: llmConfigured() ? 'copilot+llm' : 'copilot',
      // 结构化 Agent（v2）：本地解析永远可用，模型只提高理解质量
      structured: true,
    },
    api: {
      // 只暴露布尔配置状态，永不暴露 Token 值
      tokenConfigured: tokenConfigured(),
    },
    storage: {
      backend: kv ? 'kv' : 'fs',
      kvConfigured: kv,
      // 线上未配置 KV 时只读：写入按钮应禁用
      writeEnabled: !(process.env.VERCEL && !kv),
    },
    revision: typeof state.revision === 'number' ? state.revision : 1,
    webhook: {
      configured: wecomConfigured(),
      lastSuccessAt: state.notify.lastSuccessAt || null,
      lastTest: state.notify.lastTest || null,
    },
    // 双通道独立状态：企业微信（Sera）/ 飞书（Simon）
    channels: {
      wecom: {
        configured: wecomConfigured(),
        lastSuccessAt: (cs.wecom && cs.wecom.lastSuccessAt) || state.notify.lastSuccessAt || null,
        lastTest: (cs.wecom && cs.wecom.lastTest) || state.notify.lastTest || null,
        lastSummary: (state.notify.lastSummary && state.notify.lastSummary.wecom) || null,
      },
      feishu: {
        configured: feishuConfigured(),
        lastSuccessAt: (cs.feishu && cs.feishu.lastSuccessAt) || null,
        lastTest: (cs.feishu && cs.feishu.lastTest) || null,
        lastSummary: (state.notify.lastSummary && state.notify.lastSummary.feishu) || null,
      },
    },
    // 通知总线状态
    notifyTier: {
      pending: tier.pending,
      paused: tier.paused,
      pausedUntil: tier.pausedUntil,
      windowEndsAt: tier.windowEndsAt,
      lastFlush: tier.lastFlush,
      windowMin: tier.windowMin,
      silentCount: tier.silentCount,
    },
    stats: computeStats(state.tasks.tasks),
    recentUpdates: recentAgentUpdates(state, 8),
  });
}

/** POST：通知控制动作 */
async function postControl(req, res) {
  try {
    const body = await readBody(req);
    const action = String(body.action || '').trim();
    const state = await loadState();

    switch (action) {
      /* ---- 立即发送本轮汇总 ---- */
      case 'flush': {
        const result = await notifyBus.flush(state, {
          sender: sendDirect,
          linkBase: dashboardUrl(req),
          force: true,
          dryRun: !!body.dryRun,
        });
        try { await saveState(state); } catch { /* 状态持久化失败不阻断 */ }
        return sendJson(res, 200, {
          ok: true,
          action: 'flush',
          sent: result.sent,
          dryRun: result.dryRun,
          items: result.items,
          reason: result.reason || null,
          summary: result.summary || null,
          dual: result.dual
            ? {
                ok: result.dual.ok,
                partial: result.dual.partial,
                wecom: { success: result.dual.wecom.success, httpStatus: result.dual.wecom.httpStatus, error: result.dual.wecom.error },
                feishu: { success: result.dual.feishu.success, httpStatus: result.dual.feishu.httpStatus, error: result.dual.feishu.error },
              }
            : null,
        });
      }

      /* ---- 暂停通知 N 分钟 ---- */
      case 'pause': {
        const minutes = Math.max(1, Number(body.minutes) || 60);
        const pausedUntil = notifyBus.pause(state, minutes);
        try { await saveState(state); } catch { /* 状态持久化失败不阻断 */ }
        return sendJson(res, 200, {
          ok: true,
          action: 'pause',
          paused: true,
          pausedUntil,
          minutes,
          message: `飞书/企微通知已暂停 ${minutes} 分钟（critical 事件暂停期间入队，恢复后随汇总带出）`,
        });
      }

      /* ---- 恢复通知 ---- */
      case 'resume': {
        notifyBus.resume(state);
        try { await saveState(state); } catch { /* 状态持久化失败不阻断 */ }
        return sendJson(res, 200, {
          ok: true,
          action: 'resume',
          paused: false,
          message: '通知已恢复，暂停期间入队的事件将在下次汇总时发送',
        });
      }

      /* ---- Git Hook 事件接入 ---- */
      case 'git-hook': {
        const commitSha = String(body.commitSha || body.sha || '').trim().slice(0, 40);
        if (!commitSha) {
          return sendJson(res, 400, { ok: false, error: 'commitSha 为必填字段（用于幂等去重）' });
        }
        const commitMsg = String(body.commitMsg || body.message || '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500);
        const branch = String(body.branch || body.ref || '').trim().slice(0, 100);
        const project = String(body.project || 'pip').trim().slice(0, 50);
        const author = String(body.author || '').trim().slice(0, 50);

        // 通过 notify-bus 分级去重（commitSha 幂等 + commitMsg 前缀分级 + 项目合并）
        const result = await notifyBus.enqueue(state, {
          type: 'commit',
          commitSha,
          commitMsg,
          project,
          branch,
          author,
        }, {
          sender: sendDirect,
          linkBase: dashboardUrl(req),
        });

        // lazy flush：如果窗口到期，顺便发送上一轮汇总
        await notifyBus.maybeFlush(state, {
          sender: sendDirect,
          linkBase: dashboardUrl(req),
        });

        try { await saveState(state); } catch { /* 状态持久化失败不阻断 */ }

        const level = result.classification ? result.classification.level : null;
        return sendJson(res, 200, {
          ok: true,
          action: 'git-hook',
          commitSha,
          level,
          result: result.action,
          queuedCount: result.queuedCount,
          message: result.action === 'silenced'
            ? `提交 ${commitSha.slice(0, 8)} 被识别为 silent（test/chore/build/ci），仅记录日志`
            : result.action === 'deduped'
              ? `提交 ${commitSha.slice(0, 8)} 已处理过，跳过重复`
              : result.action === 'queued'
                ? `提交 ${commitSha.slice(0, 8)} 已加入 30 分钟汇总队列（当前待发 ${result.queuedCount} 项）`
                : result.action === 'sent-immediate'
                  ? `提交 ${commitSha.slice(0, 8)} 触发即时推送`
                  : `提交 ${commitSha.slice(0, 8)} 处理完成: ${result.action}`,
        });
      }

      default:
        return sendJson(res, 400, {
          ok: false,
          error: `未知 action: "${action}"（支持: flush | pause | resume | git-hook）`,
        });
    }
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      return await getStatus(req, res);
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
  }
  if (req.method === 'POST') {
    return await postControl(req, res);
  }
  // 其他方法
  if (!methodGuard(req, res, 'GET')) return;
};
