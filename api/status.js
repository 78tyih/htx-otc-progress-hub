/**
 * GET /api/status — Agent / Webhook 在线状态 + 最近更新
 */
'use strict';

const { sendJson, methodGuard } = require('./_lib/http');
const { loadState, recentAgentUpdates, useKv } = require('./_lib/store');
const { webhookConfigured } = require('./_lib/notify');
const { llmConfigured } = require('./_lib/llm');
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
    sendJson(res, 200, {
      ok: true,
      at: new Date().toISOString(),
      agent: {
        online: true,
        llmConfigured: llmConfigured(),
        model: llmConfigured() ? (process.env.LLM_MODEL || 'gpt-4o-mini') : null,
        mode: llmConfigured() ? 'rules+llm' : 'rules',
      },
      webhook: {
        configured: webhookConfigured(),
        lastSuccessAt: state.notify.lastSuccessAt || null,
        lastTest: state.notify.lastTest || null,
      },
      storage: useKv() ? 'kv' : 'fs',
      stats: computeStats(state.tasks.tasks),
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
