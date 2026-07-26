/**
 * POST /api/agent/chat — PIP 助手对话（只读，不产生写操作）
 *
 * body: { message: string, contextTaskId?: string }
 * 本地对话解析优先，可理解进度、状态、下一步和任务规划；
 * 所有候选变更只返回确认卡，真正写入由 /api/agent/confirm 完成。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState } = require('../_lib/store');
const { route } = require('../_lib/intent');
const { routeConversation } = require('../_lib/copilot');
const { llmReply, llmConfigured } = require('../_lib/llm');
const { notifyDiscoveries } = require('../_lib/dual');
const { byClass, classifyAll } = require('../../agent/classify');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    const contextTaskId = String(body.contextTaskId || '').toUpperCase();
    if (!message) return sendJson(res, 400, { ok: false, error: '缺少 message' });

    const state = await loadState();
    const ctx = { tasks: state.tasks.tasks, now: Date.now() };

    // 本地完成对话式任务同步与规划，不把新增上下文发送到外部服务。
    const conversational = routeConversation(message, ctx.tasks, contextTaskId, ctx.now);
    if (conversational) {
      return sendJson(res, 200, { ok: true, source: 'copilot', ...conversational });
    }

    const routed = route(message, ctx);
    if (routed) {
      // Agent 发现阻塞 / 逾期 → 推送手机通知（best-effort，失败静默）
      if (routed.discover && routed.tasks && routed.tasks.length) {
        try {
          const classified = byClass(classifyAll(ctx.tasks, ctx.now), routed.discover);
          const r = await notifyDiscoveries(state, classified, routed.discover, dashboardUrl(req));
          if (r.sent > 0) {
            await saveState(state);
            routed.reply += '\n\n_（已推送 ' + r.sent + ' 条手机提醒）_';
          }
        } catch { /* 通知失败不影响查询 */ }
      }
      const routedContext = routed.confirm && routed.confirm.taskId
        ? routed.confirm.taskId
        : (routed.tasks && routed.tasks.length === 1 ? routed.tasks[0].id : null);
      return sendJson(res, 200, { ok: true, source: 'rules', contextTaskId: routedContext, ...routed });
    }

    // 保留既有 LLM 兜底，不扩大原有数据发送范围。
    if (llmConfigured()) {
      const text = await llmReply(message, ctx.tasks);
      if (text) return sendJson(res, 200, { ok: true, source: 'llm', reply: text });
    }
    const { HELP } = require('../_lib/intent');
    return sendJson(res, 200, {
      ok: true,
      source: 'rules',
      reply: '这个问题超出了当前可执行范围，试试这些：\n' + HELP,
      kind: 'help',
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
