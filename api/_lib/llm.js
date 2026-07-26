/**
 * LLM 兜底（可选）：OpenAI-compatible Chat Completions
 *
 * 环境变量（仅服务端）：
 *   优先读取 AI_API_KEY / AI_BASE_URL / AI_MODEL / AI_PROVIDER / AI_DATA_POLICY；
 *   缺失时回退旧版 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL（兼容现有部署）。
 *
 * 数据最小化（默认 AI_DATA_POLICY=minimal）：
 *   发送给外部模型的任务数据只包含当前请求必需字段
 *   （id/title/status/progress/priority/dueAt/nextAction/owner/workstream/dependencies），
 *   永不包含 Webhook / API Key / KV Token / 登录信息 / 审计日志 / SharePoint 链接 / 环境变量。
 *
 * 未配置 API Key 时返回 null（调用方回退本地解析）；任何错误静默降级，不影响主流程。
 */
'use strict';

/** 统一配置读取：AI_* 优先，LLM_* 兜底 */
function aiConfig() {
  const key = process.env.AI_API_KEY || process.env.LLM_API_KEY || '';
  if (!key) return null;
  return {
    provider: process.env.AI_PROVIDER || 'openai-compatible',
    key,
    base: (process.env.AI_BASE_URL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || process.env.LLM_MODEL || 'gpt-4o-mini',
    dataPolicy: process.env.AI_DATA_POLICY || 'minimal',
  };
}

function llmConfigured() {
  return !!aiConfig();
}

/** 数据最小化投影：仅保留对话理解所需字段（AI_DATA_POLICY=minimal 默认） */
function minimizeTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((t) => t && !t.archivedAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      progress: t.progress,
      priority: t.priority,
      owner: t.owner,
      workstream: t.workstream || null,
      dueAt: t.dueAt,
      nextAction: t.nextAction,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
    }));
}

async function chatCompletions(cfg, messages, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), (opts && opts.timeoutMs) || 12000);
  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: (opts && opts.temperature) != null ? opts.temperature : 0.2,
        max_tokens: (opts && opts.maxTokens) || 1200,
        ...(opts && opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 旧版自由文本兜底（保留兼容） */
async function llmReply(message, tasks) {
  const cfg = aiConfig();
  if (!cfg) return null;
  const system = [
    '你是「HTX OTC 执行看板」的任务 Agent。只允许根据给定任务数据回答，禁止编造数据。',
    '回答使用简体中文，简洁；列出任务时必须包含：任务 ID、任务名称、当前状态、负责人、截止时间。',
    '不要执行任何状态修改；涉及修改时提示用户使用「把 T-xxxx 标记为已完成」这类指令并等待确认卡。',
    '任务数据（JSON）：',
    JSON.stringify(minimizeTasks(tasks)),
  ].join('\n');
  return chatCompletions(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: String(message || '') },
  ]);
}

/**
 * 结构化协议兜底：让模型直接产出 PIP Agent 协议 JSON（服务端再做白名单校验）。
 * 返回解析后的对象；解析失败/未配置/网络错误返回 null。
 * 注意：返回值不可信，调用方必须经 agent-protocol.sanitizeProtocol + copilot 校验后才能使用。
 */
async function llmStructured(message, tasks, context) {
  const cfg = aiConfig();
  if (!cfg) return null;
  const system = [
    '你是「HTX OTC 执行看板」的结构化任务 Agent。只输出 JSON，不要输出任何额外文字。',
    '你只能根据给定任务数据推理，禁止编造任务 ID 或数据。',
    '输出 JSON 结构：',
    '{',
    '  "intent": "query_tasks | update_task | create_task | decompose_task | plan_tasks | clarify | no_action",',
    '  "reply": "给用户看的简体中文回复",',
    '  "requiresConfirmation": true/false,',
    '  "contextTaskIds": ["T-0001"],',
    '  "operations": [{"operation":"update","taskId":"T-0001","patch":{...}}],',
    '  "taskOptions": [],',
    '  "missingFields": []',
    '}',
    'update 的 patch 只允许这些字段：status（待启动/进行中/待输出/已提醒/已完成/已延期/阻塞）、progress（0-100 整数）、',
    'nextAction、dueAt（ISO 时间，+08:00）、remindAt、priority（1-4 整数）、blockedReason、result。',
    '任何修改类 intent 都必须设 requiresConfirmation=true；无法确定任务时 intent=clarify 并在 missingFields 里说明缺什么。',
    '任务数据（JSON）：',
    JSON.stringify(minimizeTasks(tasks)),
  ].join('\n');
  const messages = [{ role: 'system', content: system }];
  if (context && Array.isArray(context.recentMessages)) {
    for (const m of context.recentMessages.slice(-6)) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text || '').slice(0, 500) });
    }
  }
  messages.push({ role: 'user', content: String(message || '') });
  const text = await chatCompletions(cfg, messages, { json: true, maxTokens: 1500 });
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // 部分模型会把 JSON 包在 ```json 代码块里
    const m = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
  }
}

module.exports = { aiConfig, llmConfigured, llmReply, llmStructured, minimizeTasks };
