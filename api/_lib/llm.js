/**
 * LLM 兜底（可选）：OpenAI-compatible Chat Completions
 *
 * 环境变量（仅服务端）：LLM_API_KEY / LLM_BASE_URL / LLM_MODEL
 * 未配置 API Key 时返回 null（调用方回退到帮助文本）；任何错误静默降级，不影响主流程。
 */
'use strict';

function llmConfigured() {
  return !!process.env.LLM_API_KEY;
}

async function llmReply(message, tasks) {
  const key = process.env.LLM_API_KEY;
  if (!key) return null;
  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const system = [
    '你是「HTX OTC 执行看板」的任务 Agent。只允许根据给定任务数据回答，禁止编造数据。',
    '回答使用简体中文，简洁；列出任务时必须包含：任务 ID、任务名称、当前状态、负责人、截止时间。',
    '不要执行任何状态修改；涉及修改时提示用户使用「把 T-xxxx 标记为已完成」这类指令并等待确认卡。',
    '任务数据（JSON）：',
    JSON.stringify(tasks),
  ].join('\n');

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: String(message || '') },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

module.exports = { llmConfigured, llmReply };
