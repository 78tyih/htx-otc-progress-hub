/**
 * POST /api/agent/chat — Agent 对话（只读，不产生任何写操作）
 *
 * body: { message: string }
 * 规则路由优先；查询命中阻塞/逾期时按场景触发发现通知（受防重复约束）；
 * 未命中规则且配置了 LLM 时由 LLM 兜底，否则返回帮助文本。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState } = require('../_lib/store');
const { route } = require('../_lib/intent');
const { llmReply, llmConfigured } = require('../_lib/llm');
const { notifyDiscoveries } = require('../_lib/notify');
const { byClass, classifyAll } = require('../../agent/classify');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    if (!message) return sendJson(res, 400, { ok: false, error: '缺少 message' });

    const state = await loadState();
    const ctx = { tasks: state.tasks.tasks, now: Date.now() };
    const routed = route(message, ctx);

    if (routed) {
      // Agent 发现阻塞 / 逾期 → 推送手机通知（best-effort，失败静默）
      if (routed.discover && routed.tasks && routed.tasks.length) {
        try {
          const classified = byClass(classifyAll(ctx.tasks, ctx.now), routed.discover);
          const r = await notifyDiscoveries(state, classified, routed.discover, dashboardUrl(req));
          if (r.sent > 0) {
            await saveState(state);
            routed.reply += `\n\n_（已推送 ${r.sent} 条手机提醒）_`;
          }
        } catch { /* 通知失败不影响查询 */ }
      }
      return sendJson(res, 200, { ok: true, source: 'rules', ...routed });
    }

    // LLM 兜底
    if (llmConfigured()) {
      const text = await llmReply(message, ctx.tasks);
      if (text) return sendJson(res, 200, { ok: true, source: 'llm', reply: text });
    }
    const { HELP } = require('../_lib/intent');
    return sendJson(res, 200, { ok: true, source: 'rules', reply: `这个问题超出了我的规则范围，试试这些：\n${HELP}`, kind: 'help' });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
