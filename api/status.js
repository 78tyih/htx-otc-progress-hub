/**
 * GET /api/status — Agent / Webhook 在线状态 + 最近更新
 */
'use strict';

const { sendJson, methodGuard } = require('./_lib/http');
const { loadState, recentAgentUpdates, useKv } = require('./_lib/store');
const { wecomConfigured } = require('./_lib/wecom');
const { feishuConfigured } = require('./_lib/feishu');
const { llmConfigured, aiConfig } = require('./_lib/llm');
const { tokenConfigured } = require('./_lib/security');
const { classifyAll, byClass } = require('../agent/classify');

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

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const state = await loadState();
    const cs = state.notify.channelStatus || {};
    const llm = aiConfig();
    const kv = useKv();
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
      stats: computeStats(state.tasks.tasks),
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
