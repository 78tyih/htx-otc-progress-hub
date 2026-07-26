/**
 * /api/agent/chat — PIP 助手对话入口（v2 结构化协议）
 *
 *   POST { message, sessionId?, contextTaskId?（旧版兼容）, operator? }
 *     本地对话解析优先；未命中时依次回退：规则路由（intent.js）→ LLM 结构化协议兜底。
 *     所有候选变更只返回确认卡/待选方案，真正写入由 /api/agent/confirm 完成。
 *   GET  ?proposalId=P-xxxx
 *     查询待确认方案（供外部 Agent 轮询方案状态）。
 *
 * 统一响应：结构化 Agent 协议（version/intent/reply/requiresConfirmation/contextTaskIds/
 *   operations/taskOptions/warnings/missingFields）+ requestId + revision + sessionId，
 *   同时保留旧字段（kind/tasks/confirm/contextTaskId）兼容旧前端。
 *
 * 访问控制：同源浏览器请求直接放行（由部署平台访问控制保护）；
 *   跨源/外部 Agent 必须 Authorization: Bearer <PIP_AGENT_API_TOKEN>。
 */
'use strict';

const { sendJson, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, useKv } = require('../_lib/store');
const { route } = require('../_lib/intent');
const { routeConversation, buildProposal, buildPlan, planCount, resolveTask } = require('../_lib/copilot');
const { llmStructured, llmConfigured } = require('../_lib/llm');
const { notifyDiscoveries } = require('../_lib/dual');
const { byClass, classifyAll } = require('../../agent/classify');
const { sanitizeProtocol, protocolResponse } = require('../_lib/agent-protocol');
const { guardAgentAccess, corsHeaders, readLimitedBody } = require('../_lib/security');
const { touchSession, pushMessages, updateSession, isValidSessionId } = require('../_lib/session');
const { addProposal, getProposal } = require('../_lib/proposals');

/** 线上（Vercel）未配置 KV 时禁止一切写操作；查询仍可用部署时的只读数据 */
function writeEnabled() {
  return !(process.env.VERCEL && !useKv());
}

/** 旧前端任务卡：分类 + 判定依据 + 建议 */
function toCards(tasks, allTasks, now) {
  if (!Array.isArray(tasks) || !tasks.length) return [];
  const classified = classifyAll(allTasks, now);
  const cards = new Map(classified.map((item) => [item.task.id, {
    id: item.task.id,
    title: item.task.title,
    status: item.task.status,
    owner: item.task.owner,
    dueAt: item.task.dueAt,
    progress: item.task.progress,
    class: item.class,
    label: item.label,
    basis: item.basis,
    suggestion: item.suggestion,
  }]));
  return tasks.map((task) => cards.get(task.id)).filter(Boolean);
}

/** 会话上下文 → copilot 的 context 形态 */
function contextOf(session, legacyContextTaskId, operator) {
  const ids = session && Array.isArray(session.activeTaskIds) ? session.activeTaskIds : [];
  if (ids.length) return { taskIds: ids, operator };
  if (legacyContextTaskId) return { taskIds: [legacyContextTaskId], operator };
  return { taskIds: [], operator };
}

/** 把 copilot/LLM 产出的候选方案固化为服务端 proposal（返回 proposal 或 null） */
function persistProposal(state, result, operator) {
  if (!Array.isArray(result.taskOptions) || !result.taskOptions.length) return null;
  const kind = result.intent === 'decompose_task' ? 'decompose' : 'create';
  return addProposal(state, {
    kind,
    options: result.taskOptions,
    parentTaskId: result.parentTaskId || null,
    operator,
  });
}

/** 统一包装返回（含会话与 proposal 落库，best-effort） */
async function respond(res, state, req, { proto, extras, session, sessionId, userMessage, guard, status }) {
  if (session) {
    updateSession(state, sessionId, {
      activeTaskIds: proto.contextTaskIds,
      lastIntent: proto.intent,
      ...(extras && extras.proposalId ? { pendingProposalId: extras.proposalId } : {}),
    });
    pushMessages(state, sessionId, [
      ...(userMessage ? [{ role: 'user', text: userMessage }] : []),
      { role: 'agent', text: proto.reply || '' },
    ]);
  }
  if (writeEnabled()) {
    try { await saveState(state); } catch { /* 会话落库失败不阻断对话 */ }
  }
  const headers = corsHeaders(req);
  const body = protocolResponse(proto, Object.assign({
    requestId: guard.requestId,
    revision: state.revision,
    writeEnabled: writeEnabled(),
  }, extras || {}));
  if (sessionId) body.sessionId = sessionId;
  res.statusCode = status || 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [k, v] of Object.entries(corsHeaders(req))) res.setHeader(k, v);
    res.end();
    return;
  }

  const guard = guardAgentAccess(req);
  if (!guard.ok) return sendJson(res, guard.status, { ok: false, error: guard.error, requestId: guard.requestId });

  try {
    /* -------- GET：查询待确认方案 -------- */
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const proposalId = String(url.searchParams.get('proposalId') || '');
      if (!proposalId) return sendJson(res, 400, { ok: false, error: '缺少 proposalId', requestId: guard.requestId });
      const state = await loadState();
      const p = getProposal(state, proposalId);
      if (!p) return sendJson(res, 404, { ok: false, error: '方案不存在或已过期（有效期 2 小时）', requestId: guard.requestId });
      return sendJson(res, 200, {
        ok: true,
        requestId: guard.requestId,
        proposal: {
          id: p.id,
          kind: p.kind,
          status: p.status,
          parentTaskId: p.parentTaskId,
          options: p.options,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt,
        },
      });
    }

    if (!methodGuard(req, res, 'POST')) return;

    const body = await readLimitedBody(req);
    const message = String(body.message || '').trim();
    const operator = String(body.operator || '').trim() || 'Sera';
    const legacyContextTaskId = String(body.contextTaskId || '').toUpperCase();
    const sessionId = isValidSessionId(body.sessionId) ? String(body.sessionId) : null;
    if (!message) return sendJson(res, 400, { ok: false, error: '缺少 message', requestId: guard.requestId });

    const state = await loadState();
    const now = Date.now();
    const tasks = state.tasks.tasks;

    // 会话上下文（可选）：无 sessionId 时回退旧版 contextTaskId
    const session = sessionId ? touchSession(state, sessionId, operator) : null;
    const context = contextOf(session, /^T-\d{4}$/.test(legacyContextTaskId) ? legacyContextTaskId : null, operator);

    /* -------- 1. 本地对话解析（copilot，零外部依赖） -------- */
    const conversational = routeConversation(message, tasks, context, now);
    if (conversational) {
      const proposal = writeEnabled() ? persistProposal(state, conversational, operator) : null;
      const warnings = Array.isArray(conversational.warnings) ? conversational.warnings.slice() : [];
      if (conversational.requiresConfirmation && !writeEnabled()) {
        warnings.push('线上持久化存储尚未配置（KV），当前为只读模式，确认按钮已禁用');
      }
      const cards = toCards(conversational.tasks, tasks, now);
      return respond(res, state, req, {
        proto: {
          intent: conversational.intent || 'no_action',
          reply: conversational.reply || '',
          requiresConfirmation: conversational.requiresConfirmation === true,
          contextTaskIds: conversational.contextTaskIds || (conversational.contextTaskId ? [conversational.contextTaskId] : []),
          operations: conversational.operations || [],
          taskOptions: conversational.taskOptions || [],
          warnings,
          missingFields: conversational.missingFields || [],
        },
        extras: {
          source: 'copilot',
          kind: conversational.kind,
          tasks: cards,
          confirm: conversational.confirm || null,
          contextTaskId: conversational.contextTaskId || (cards.length === 1 ? cards[0].id : null),
          proposalId: proposal ? proposal.id : null,
          parentTaskId: conversational.parentTaskId || null,
        },
        session,
        sessionId,
        userMessage: message,
        guard,
      });
    }

    /* -------- 2. 规则路由（查询/逾期/阻塞/帮助等，PR#1 既有能力） -------- */
    const routed = route(message, { tasks, now });
    if (routed) {
      if (routed.discover && routed.tasks && routed.tasks.length) {
        try {
          const classified = byClass(classifyAll(tasks, now), routed.discover);
          const r = await notifyDiscoveries(state, classified, routed.discover, dashboardUrl(req));
          if (r.sent > 0) {
            routed.reply += '\n\n_（已推送 ' + r.sent + ' 条手机提醒）_';
          }
        } catch { /* 通知失败不影响查询 */ }
      }
      const routedContext = routed.confirm && routed.confirm.taskId
        ? routed.confirm.taskId
        : (routed.tasks && routed.tasks.length === 1 ? routed.tasks[0].id : null);
      return respond(res, state, req, {
        proto: {
          intent: routed.confirm ? 'update_task' : 'query_tasks',
          reply: routed.reply || '',
          requiresConfirmation: !!routed.confirm,
          contextTaskIds: routedContext ? [routedContext] : [],
          operations: [],
          taskOptions: [],
          warnings: [],
          missingFields: [],
        },
        extras: {
          source: 'rules',
          kind: routed.kind,
          tasks: routed.tasks || [],
          confirm: routed.confirm || null,
          contextTaskId: routedContext,
          notifyTest: routed.notifyTest,
        },
        session,
        sessionId,
        userMessage: message,
        guard,
      });
    }

    /* -------- 3. LLM 结构化协议兜底（仅提高理解质量，不直接写入） -------- */
    if (llmConfigured()) {
      const raw = await llmStructured(message, tasks, session);
      const proto = raw ? sanitizeProtocol(raw) : null;
      if (proto && proto.intent !== 'no_action') {
        // 模型规划不可信 ID → 统一改用本地规划（只读，引用真实任务）
        if (proto.intent === 'plan_tasks') {
          const plan = buildPlan(tasks, now, { count: planCount(message) });
          return respond(res, state, req, {
            proto: {
              intent: 'plan_tasks',
              reply: plan.reply,
              requiresConfirmation: false,
              contextTaskIds: plan.contextTaskIds || [],
              operations: [],
              taskOptions: [],
              warnings: proto.warnings,
              missingFields: [],
            },
            extras: { source: 'llm', kind: 'plan', tasks: toCards(plan.tasks, tasks, now), contextTaskId: null },
            session, sessionId, userMessage: message, guard,
          });
        }

        // update 操作：逐条走服务端校验（normalizePatch + 状态机 + diff），只接受通过的
        let confirm = null;
        let contextTaskId = null;
        const cards = [];
        if (proto.operations.length) {
          for (const op of proto.operations) {
            if (op.operation !== 'update') continue;
            const result = buildProposal({ taskId: op.taskId, patch: op.patch }, tasks);
            if (result.error) {
              proto.warnings.push(`${op.taskId}：${result.error}`);
              continue;
            }
            if (!confirm) {
              confirm = result.confirm;
              contextTaskId = result.task.id;
              cards.push(result.task);
            }
          }
        }

        // create / decompose：模型产出的 taskOptions 一律标记为 AI 建议，交服务端生成 ID
        let proposal = null;
        if (!confirm && proto.taskOptions.length && (proto.intent === 'create_task' || proto.intent === 'decompose_task')) {
          let parentTaskId = null;
          if (proto.intent === 'decompose_task') {
            const parent = resolveTask(message, tasks, context) ||
              (proto.contextTaskIds.length ? tasks.find((t) => t.id === proto.contextTaskIds[0]) : null);
            if (!parent) {
              proto.warnings.push('无法确认要拆解的父任务，已按普通任务创建处理');
            } else {
              parentTaskId = parent.id;
              cards.push(parent);
              proto.taskOptions.forEach((opt, i) => {
                if (!Array.isArray(opt.dependsOnOptions) || !opt.dependsOnOptions.length) {
                  opt.dependsOnOptions = i > 0 ? [i - 1] : []; // 未指定时默认串行
                }
                opt.parentTaskId = parent.id;
                if (opt.priority == null) opt.priority = parent.priority;
                if (!opt.owner) opt.owner = parent.owner;
                if (!opt.dueAt) opt.dueAt = parent.dueAt;
                if (!opt.remindAt) opt.remindAt = String(opt.dueAt).slice(0, 11) + '09:00:00+08:00';
              });
            }
          }
          proto.taskOptions.forEach((opt) => {
            opt.suggested = Object.assign({ title: true, priority: true, owner: true, dueAt: true, remindAt: true, nextAction: true, outputCondition: true }, opt.suggested || {});
            if (opt.priority == null) opt.priority = 3;
            if (!opt.owner) opt.owner = operator;
            if (!opt.dueAt) {
              const d = new Date(now + 7 * 86400000 + 8 * 3600 * 1000);
              const pad = (n) => String(n).padStart(2, '0');
              opt.dueAt = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T18:00:00+08:00`;
            }
            if (!opt.remindAt) opt.remindAt = String(opt.dueAt).slice(0, 11) + '09:00:00+08:00';
            if (!opt.nextAction) opt.nextAction = `推进「${opt.title.slice(0, 60)}」`;
            if (!opt.outputCondition) opt.outputCondition = `完成「${opt.title.slice(0, 60)}」并同步结果`;
          });
          proposal = writeEnabled()
            ? persistProposal(state, { intent: proto.intent, taskOptions: proto.taskOptions, parentTaskId }, operator)
            : null;
          if (!writeEnabled()) proto.warnings.push('线上持久化存储尚未配置（KV），当前为只读模式，确认按钮已禁用');
        }

        const requiresConfirmation = !!confirm || !!proposal;
        return respond(res, state, req, {
          proto: {
            intent: confirm ? 'update_task' : proto.intent,
            reply: proto.reply || (confirm ? '我已整理出变更，请核对后确认写入。' : ''),
            requiresConfirmation,
            contextTaskIds: contextTaskId ? [contextTaskId] : proto.contextTaskIds,
            operations: confirm ? [{ operation: 'update', taskId: contextTaskId, patch: confirm.patch }] : [],
            taskOptions: proposal ? proto.taskOptions : [],
            warnings: proto.warnings,
            missingFields: proto.missingFields,
          },
          extras: {
            source: 'llm',
            kind: confirm ? 'update' : (proposal ? (proto.intent === 'decompose_task' ? 'decompose' : 'create') : 'answer'),
            tasks: toCards(cards, tasks, now),
            confirm,
            contextTaskId,
            proposalId: proposal ? proposal.id : null,
            parentTaskId: proposal ? proposal.parentTaskId : null,
          },
          session, sessionId, userMessage: message, guard,
        });
      }
    }

    /* -------- 4. 帮助 -------- */
    const { HELP } = require('../_lib/intent');
    return respond(res, state, req, {
      proto: {
        intent: 'no_action',
        reply: '这个问题超出了当前可执行范围，试试这些：\n' + HELP,
        requiresConfirmation: false,
        contextTaskIds: [],
        operations: [],
        taskOptions: [],
        warnings: [],
        missingFields: [],
      },
      extras: { source: 'rules', kind: 'help', contextTaskId: null },
      session, sessionId, userMessage: message, guard,
    });
  } catch (e) {
    const status = (e && e.status) || 500;
    sendJson(res, status, { ok: false, error: String((e && e.message) || e) });
  }
};
