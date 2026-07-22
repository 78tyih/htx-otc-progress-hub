/**
 * GET /api/status — Agent / Webhook 在线状态 + 最近更新
 */
'use strict';

const { sendJson, methodGuard } = require('./_lib/http');
const { loadState, recentAgentUpdates, useKv } = require('./_lib/store');
const { webhookConfigured } = require('./_lib/notify');
const { llmConfigured } = require('./_lib/llm');

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
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
