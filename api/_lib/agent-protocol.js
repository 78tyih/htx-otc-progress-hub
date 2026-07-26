/**
 * PIP 结构化 Agent 协议（v2 唯一响应格式）
 *
 * 所有 /api/agent/* 响应统一包装为：
 *   {
 *     ok, version, requestId,
 *     intent: 'query_tasks|update_task|create_task|decompose_task|plan_tasks|clarify|no_action',
 *     reply: '给用户看的简体中文回复',
 *     requiresConfirmation: bool,
 *     contextTaskIds: ['T-0006'],
 *     operations: [{ operation: 'update', taskId, patch }],   // 白名单校验后的候选操作
 *     taskOptions: [...],                                      // create/decompose 候选方案
 *     warnings: [], missingFields: [],
 *     revision                                                  // 当前数据版本号（乐观锁）
 *   }
 *
 * 服务端保证：
 *   - operation 仅允许白名单（update/create/decompose），patch 字段仅允许白名单；
 *   - 确认接口重新完整校验，不信任前端回传的任何 patch；
 *   - 任何响应永不包含 Token / Webhook / 环境变量值。
 */
'use strict';

const crypto = require('crypto');

const PROTOCOL_VERSION = '1.0';

const INTENTS = [
  'query_tasks',
  'update_task',
  'create_task',
  'decompose_task',
  'plan_tasks',
  'clarify',
  'no_action',
];

const OPERATIONS = ['update', 'create', 'decompose'];

/** update patch 允许写入的字段（白名单；其余字段一律丢弃） */
const PATCH_FIELDS = [
  'status',
  'progress',
  'nextAction',
  'dueAt',
  'remindAt',
  'priority',
  'blockedReason',
  'result',
];

const FIELD_LABELS = {
  status: '状态',
  progress: '进度',
  nextAction: '下一步',
  dueAt: '截止时间',
  remindAt: '提醒时间',
  priority: '优先级',
  blockedReason: '阻塞原因',
  result: '完成结果',
  title: '任务名称',
  owner: '负责人',
  workstream: '工作流',
  outputCondition: '输出条件',
  dependencies: '前置依赖',
};

/** 生成 requestId（审计用；不含任何环境信息） */
function newRequestId() {
  const rand = crypto.randomBytes(4).toString('hex');
  return `req-${Date.now().toString(36)}-${rand}`;
}

/** 生成 proposalId（服务端唯一） */
function newProposalId() {
  const rand = crypto.randomBytes(4).toString('hex');
  return `P-${Date.now().toString(36)}-${rand}`;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

/**
 * 校验外部传入（或模型生成）的结构化协议对象，返回清洗后的安全副本。
 * 非法结构返回 null；非法 operation/字段静默丢弃并记录 warnings。
 */
function sanitizeProtocol(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(String).slice(0, 10) : [];
  const out = {
    version: PROTOCOL_VERSION,
    intent: INTENTS.includes(raw.intent) ? raw.intent : 'no_action',
    reply: typeof raw.reply === 'string' ? raw.reply.slice(0, 4000) : '',
    requiresConfirmation: raw.requiresConfirmation === true,
    contextTaskIds: Array.isArray(raw.contextTaskIds)
      ? raw.contextTaskIds.map((id) => String(id).toUpperCase()).filter((id) => /^T-\d{4}$/.test(id)).slice(0, 20)
      : [],
    operations: [],
    taskOptions: [],
    warnings,
    missingFields: Array.isArray(raw.missingFields) ? raw.missingFields.map(String).slice(0, 10) : [],
  };

  if (Array.isArray(raw.operations)) {
    for (const op of raw.operations.slice(0, 10)) {
      if (!op || typeof op !== 'object') continue;
      if (!OPERATIONS.includes(op.operation)) {
        warnings.push(`已丢弃非法 operation：${String(op.operation)}`);
        continue;
      }
      if (op.operation === 'update') {
        const taskId = String(op.taskId || '').toUpperCase();
        if (!/^T-\d{4}$/.test(taskId)) {
          warnings.push('已丢弃缺少合法 taskId 的 update 操作');
          continue;
        }
        const patch = {};
        const src = op.patch && typeof op.patch === 'object' ? op.patch : {};
        for (const field of PATCH_FIELDS) {
          if (hasOwn(src, field)) patch[field] = src[field];
        }
        out.operations.push({ operation: 'update', taskId, patch });
      } else {
        // create / decompose 的 option 结构由 taskOptions 承载
        out.operations.push({ operation: op.operation });
      }
    }
  }

  if (Array.isArray(raw.taskOptions)) {
    out.taskOptions = raw.taskOptions.slice(0, 12).map((opt) => sanitizeTaskOption(opt)).filter(Boolean);
  }

  return out;
}

/** 任务选项字段白名单（创建/拆解共用；建议标记 suggested 保留） */
const OPTION_FIELDS = [
  'title', 'status', 'priority', 'workstream', 'owner', 'dueAt', 'remindAt',
  'progress', 'nextAction', 'outputCondition', 'dependencies', 'parentTaskId', 'note',
];

function sanitizeTaskOption(opt) {
  if (!opt || typeof opt !== 'object' || Array.isArray(opt)) return null;
  const out = { suggested: {} };
  const src = opt.suggested && typeof opt.suggested === 'object' ? opt.suggested : {};
  for (const field of OPTION_FIELDS) {
    if (hasOwn(opt, field) && opt[field] !== undefined) out[field] = opt[field];
    if (src[field] === true) out.suggested[field] = true;
  }
  // 拆解串行依赖：选项下标数组（执行时映射为真实任务 ID）
  if (Array.isArray(opt.dependsOnOptions)) {
    out.dependsOnOptions = opt.dependsOnOptions
      .map((i) => Number(i))
      .filter((i) => Number.isInteger(i) && i >= 0)
      .slice(0, 6);
  }
  if (typeof opt.title !== 'string' || !opt.title.trim()) return null;
  out.title = out.title.trim().slice(0, 100);
  return out;
}

/** 统一成功响应包装（保留调用方附加字段，协议字段置顶） */
function protocolResponse(proto, extra) {
  return Object.assign(
    {
      ok: true,
      version: PROTOCOL_VERSION,
      intent: proto.intent || 'no_action',
      reply: proto.reply || '',
      requiresConfirmation: proto.requiresConfirmation === true,
      contextTaskIds: proto.contextTaskIds || [],
      operations: proto.operations || [],
      taskOptions: proto.taskOptions || [],
      warnings: proto.warnings || [],
      missingFields: proto.missingFields || [],
    },
    extra || {}
  );
}

module.exports = {
  PROTOCOL_VERSION,
  INTENTS,
  OPERATIONS,
  PATCH_FIELDS,
  FIELD_LABELS,
  OPTION_FIELDS,
  newRequestId,
  newProposalId,
  sanitizeProtocol,
  sanitizeTaskOption,
  protocolResponse,
};
