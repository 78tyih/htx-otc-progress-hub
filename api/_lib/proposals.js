/**
 * 待确认任务方案（创建/拆解）的服务端管理
 *
 * 约定：
 *   - 方案由 chat.js 生成、confirm.js 执行；服务端统一生成任务 ID（T-0001 递增），模型/前端不得自行指定；
 *   - 方案随 hub state 持久化（KV / 本地侧边文件），TTL 2 小时，过期自动失效；
 *   - 执行时重新完整校验每个选项（不信任前端回传的字段值）；
 *   - 子任务串行依赖用 dependsOnOptions（选项下标）表达，执行时映射为真实任务 ID。
 */
'use strict';

const { TASK_PRIORITIES, TASK_ID_RE, isIso } = require('../../agent/schema');
const { newProposalId } = require('./agent-protocol');

const PROPOSAL_TTL_MS = 2 * 3600 * 1000;
const MAX_PROPOSALS = 50;

/** 清理过期/已执行方案 + 总量上限（最旧的先删） */
function gcProposals(state) {
  if (!state.proposals || !Array.isArray(state.proposals.items)) state.proposals = { items: [] };
  const now = Date.now();
  state.proposals.items = state.proposals.items.filter((p) => {
    if (!p || p.status !== 'pending') return false; // 已执行/取消的即刻移除（审计里已有记录）
    return Date.parse(p.expiresAt) > now;
  });
  if (state.proposals.items.length > MAX_PROPOSALS) {
    state.proposals.items = state.proposals.items.slice(-MAX_PROPOSALS);
  }
  return state.proposals;
}

/**
 * 新增待确认方案。kind: 'create' | 'decompose'
 * options 为 copilot/LLM 生成的候选任务（含 suggested 标记；decompose 含 dependsOnOptions）。
 */
function addProposal(state, { kind, options, parentTaskId, operator }) {
  gcProposals(state);
  const now = Date.now();
  const proposal = {
    id: newProposalId(),
    kind: kind === 'decompose' ? 'decompose' : 'create',
    status: 'pending',
    parentTaskId: parentTaskId || null,
    options: (options || []).slice(0, 12),
    operator: operator || 'Sera',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PROPOSAL_TTL_MS).toISOString(),
  };
  state.proposals.items.push(proposal);
  return proposal;
}

/** 读取待确认方案（过期/不存在返回 null） */
function getProposal(state, id) {
  gcProposals(state);
  const p = state.proposals.items.find((item) => item.id === id);
  if (!p || p.status !== 'pending') return null;
  if (Date.parse(p.expiresAt) < Date.now()) return null;
  return p;
}

/** 生成 n 个新的任务 ID（基于现有最大编号递增，服务端唯一来源） */
function nextTaskIds(tasks, n) {
  let max = 0;
  for (const t of tasks || []) {
    const m = /^T-(\d{4})$/.exec(String((t && t.id) || ''));
    if (m) max = Math.max(max, Number(m[1]));
  }
  const ids = [];
  for (let i = 0; i < n; i += 1) ids.push(`T-${String(max + i + 1).padStart(4, '0')}`);
  return ids;
}

/** 单个任务选项的服务端校验（执行前的最后一道关卡），返回错误数组 */
function validateOption(option, { tasks, parentTaskId }) {
  const errors = [];
  const label = option && option.title ? `「${String(option.title).slice(0, 30)}」` : '（未命名任务）';
  if (!option || typeof option !== 'object') return [`${label}: 必须是对象`];
  if (typeof option.title !== 'string' || !option.title.trim() || option.title.length > 100) {
    errors.push(`${label}: 任务名称必填且 ≤100 字`);
  }
  if (!TASK_PRIORITIES.includes(Number(option.priority))) errors.push(`${label}: 优先级必须是 1-4 的整数星`);
  if (typeof option.owner !== 'string' || !option.owner.trim()) errors.push(`${label}: 负责人必填`);
  if (!isIso(option.dueAt)) errors.push(`${label}: 截止时间无法识别`);
  if (!isIso(option.remindAt)) errors.push(`${label}: 提醒时间无法识别`);
  if (isIso(option.dueAt) && isIso(option.remindAt) && Date.parse(option.remindAt) > Date.parse(option.dueAt)) {
    errors.push(`${label}: 提醒时间不得晚于截止时间`);
  }
  if (typeof option.nextAction !== 'string' || !option.nextAction.trim()) errors.push(`${label}: 下一步必填`);
  if (typeof option.outputCondition !== 'string' || !option.outputCondition.trim()) errors.push(`${label}: 输出条件必填`);
  if (option.workstream != null && typeof option.workstream !== 'string') errors.push(`${label}: 工作流须为字符串或 null`);
  if (parentTaskId) {
    const parent = (tasks || []).find((t) => t.id === parentTaskId);
    if (!parent) errors.push(`${label}: 父任务 ${parentTaskId} 不存在`);
    else if (parent.archivedAt) errors.push(`${label}: 父任务 ${parentTaskId} 已归档，不能拆解`);
  }
  // 显式依赖（真实任务 ID）必须存在
  if (Array.isArray(option.dependencies)) {
    const ids = new Set((tasks || []).map((t) => t.id));
    for (const dep of option.dependencies) {
      if (!TASK_ID_RE.test(String(dep))) errors.push(`${label}: 依赖 ${dep} 不是合法任务 ID`);
      else if (!ids.has(dep)) errors.push(`${label}: 依赖了不存在的任务 ${dep}`);
    }
  }
  return errors;
}

/**
 * 把校验通过的选项物化为完整任务对象（补齐 schema 全部字段）。
 * dependencies 已在此前的映射步骤把 dependsOnOptions 转成真实任务 ID。
 */
function buildTaskFromOption(option, { id, operator, nowIso, proposalId, parentTaskId }) {
  return {
    id,
    title: String(option.title).trim().slice(0, 100),
    status: '待启动',
    priority: Number(option.priority),
    workstream: option.workstream || null,
    owner: String(option.owner).trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
    dueAt: option.dueAt,
    remindAt: option.remindAt,
    remindedAt: null,
    completedAt: null,
    progress: 0,
    nextAction: String(option.nextAction).trim().slice(0, 500),
    outputCondition: String(option.outputCondition).trim().slice(0, 500),
    result: null,
    source: 'web',
    dependencies: Array.isArray(option.dependencies) ? option.dependencies.slice(0, 10) : [],
    updatedBy: operator,
    completionEvidence: null,
    changeSource: 'agent',
    archivedAt: null,
    archiveReason: null,
    parentTaskId: parentTaskId || null,
    createdFromConversation: true,
    proposalId: proposalId || null,
  };
}

module.exports = { PROPOSAL_TTL_MS, gcProposals, addProposal, getProposal, nextTaskIds, validateOption, buildTaskFromOption };
