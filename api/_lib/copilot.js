/**
 * PIP 对话助手的本地意图解析与结构化变更校验（v2）。
 *
 * 能力边界（本地规则，零外部依赖）：
 *   - 任务定位：T-xxxx / 完整标题 / 会话上下文（上一轮任务）
 *   - 字段提取：状态、进度、下一步、截止时间、提醒时间、优先级（星级）、阻塞原因、完成结果
 *   - 任务创建：生成「待选择任务方案」（不直接写入），缺关键信息只追问一个最关键问题
 *   - 任务拆解：父任务 → 2-6 个子任务选项（树状、串行依赖、parentTaskId）
 *   - 任务规划：逾期 > 阻塞 > 星级 > 截止 > 依赖 > KPI 相关性，只读不生成确认卡
 * 对话内容不离开 PIP 服务端；任何写入都必须再经过确认接口（confirm / proposals）。
 */
'use strict';

const { TASK_STATUSES, STATUS_TRANSITIONS, TASK_PRIORITIES, TASK_ID_RE, isIso } = require('../../agent/schema');

/** update 允许写入的字段白名单（与 agent-protocol.PATCH_FIELDS 保持一致） */
const EDITABLE_FIELDS = ['status', 'progress', 'nextAction', 'dueAt', 'remindAt', 'priority', 'blockedReason', 'result'];
const FIELD_LABELS = {
  status: '状态',
  progress: '进度',
  nextAction: '下一步',
  dueAt: '截止时间',
  remindAt: '提醒时间',
  priority: '优先级',
  blockedReason: '阻塞原因',
  result: '完成结果',
};

/** PIP KPI 相关关键词（workstream / 标题命中即视为 KPI 相关） */
const KPI_RE = /注册|KYC|首单|交易|收入|客户|渠道|机构|Partner|KOL|提款|转化/i;

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[\s，,。.!！?？:：()（）【】\[\]]+/g, '');
}

/* ---------------- 时间解析（Asia/Shanghai 墙钟） ---------------- */

function shanghaiNow(now) {
  return new Date((Number(now) || Date.now()) + 8 * 3600 * 1000); // 用 UTC getter 读取上海墙钟
}

function toShanghaiIso(y, m, d, hh, mm) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm || 0)}:00+08:00`;
}

const WEEKDAY_MAP = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

/**
 * 解析中文时间表达 → ISO（+08:00）。仅接受明确日期/星期/相对日，解析失败返回 null。
 * 支持：7月30日 / 2026-07-30 / 明天 / 今天 / 周五（前）/ 下周三
 */
function parseChineseDate(message, now) {
  const text = String(message || '');
  const sh = shanghaiNow(now);
  const y0 = sh.getUTCFullYear();

  let m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) return toShanghaiIso(Number(m[1]), Number(m[2]), Number(m[3]), 18, 0);

  m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (m) {
    let year = y0;
    const month = Number(m[1]);
    const day = Number(m[2]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    const today = new Date(Date.UTC(y0, sh.getUTCMonth(), sh.getUTCDate()));
    if (candidate.getTime() < today.getTime() - 24 * 3600 * 1000) year += 1; // 已过去则取明年
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return toShanghaiIso(year, month, day, 18, 0);
  }

  if (/后天/.test(text)) {
    const d = new Date(sh.getTime() + 2 * 86400000);
    return toShanghaiIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 18, 0);
  }
  if (/明天|明日/.test(text)) {
    const d = new Date(sh.getTime() + 86400000);
    return toShanghaiIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 18, 0);
  }
  if (/今天|今日/.test(text)) {
    return toShanghaiIso(y0, sh.getUTCMonth() + 1, sh.getUTCDate(), 18, 0);
  }

  m = text.match(/(下?下周?|周|星期)\s*([一二三四五六日天])/);
  if (m) {
    const target = WEEKDAY_MAP[m[2]];
    const cur = sh.getUTCDay();
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7; // 「周五」在周五当天指下一周五
    if (m[1].startsWith('下')) delta += 7;
    const d = new Date(sh.getTime() + delta * 86400000);
    return toShanghaiIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 18, 0);
  }
  return null;
}

/* ---------------- 字段提取 ---------------- */

function extractProgress(message) {
  const text = String(message || '');
  let match = text.match(/(?:进度(?:到|为|是|更新为|调整为)?\s*)?(\d{1,3})\s*%/i);
  if (!match) match = text.match(/进度(?:到|为|是|更新为|调整为)?\s*(\d{1,3})(?!\d)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

function extractNextAction(message) {
  const text = String(message || '').trim();
  const match = text.match(/(?:下一步|接下来|后续)(?:行动)?(?:是|为|要|需要|准备|计划|改到|改为|调整为)?\s*[：:，,]?\s*(.+)$/i);
  if (!match) return null;
  const value = match[1].trim().replace(/[。.!！]+$/, '');
  if (!value || /^(?:做什么|该做什么|怎么做|怎么安排|如何安排)$/.test(value)) return null;
  return value.slice(0, 500);
}

function inferStatus(message) {
  const text = String(message || '');
  if (/(?:已完成|已经完成|完成了|已交付|已经交付|交付完成|搞定了?)/.test(text)) return '已完成';
  if (/(?:阻塞|被卡住|卡住了?|卡点|无法推进)/.test(text)) return '阻塞';
  if (/(?:已延期|需要延期|延后|推迟)/.test(text)) return '已延期';
  if (/(?:待输出|待交付|等待输出)/.test(text)) return '待输出';
  if (/(?:已启动|开始推进|正在推进|进行中)/.test(text)) return '进行中';
  return null;
}

const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

/** 星级优先级：「4 星」「四星」「重要且紧急」等 → 1-4 */
function extractPriority(message) {
  const text = String(message || '');
  let m = text.match(/(\d)\s*星/);
  if (m) {
    const v = Number(m[1]);
    return TASK_PRIORITIES.includes(v) ? v : null;
  }
  m = text.match(/([一二三四])\s*星/);
  if (m) return CN_NUM[m[1]] || null;
  if (/重要且紧急|重要紧急/.test(text)) return 4;
  if (/重要不紧急/.test(text)) return 3;
  if (/紧急不重要/.test(text)) return 2;
  if (/不重要不紧急|不重要/.test(text)) return 1;
  return null;
}

/** 阻塞原因：「原因是审批还没下来」「因为等审批」 */
function extractBlockedReason(message) {
  const text = String(message || '');
  const m = text.match(/(?:原因是为?|因为|由于)\s*[：:，,]?\s*(.+)$/);
  if (!m) return null;
  const value = m[1].trim().replace(/[。.!！]+$/, '');
  return value ? value.slice(0, 500) : null;
}

/** 完成结果/证据：「交付证据是设计包已发送」「结果是 XX」 */
function extractResult(message) {
  const text = String(message || '');
  const m = text.match(/(?:交付证据|完成证据|证据|完成结果|结果|交付物)\s*(?:是|为|：|:)\s*(.+)$/);
  if (!m) return null;
  const value = m[1].trim().replace(/[。.!！]+$/, '');
  return value ? value.slice(0, 500) : null;
}

/** 截止时间：「截止时间改到 7 月 30 日」「周五前完成」 */
function extractDueAt(message, now) {
  const text = String(message || '');
  if (/截止|底线|死线|due/i.test(text) || /前完成|之前完成|前交付/.test(text)) {
    const iso = parseChineseDate(text, now);
    if (iso) return iso;
  }
  return null;
}

/** 提醒时间：「提醒时间改到 X」「X 提醒我」 */
function extractRemindAt(message, now) {
  const text = String(message || '');
  const m = text.match(/提醒(?:时间)?(?:改到|改为|调整为|是|为)?/);
  if (!m) return null;
  const iso = parseChineseDate(text.slice(m.index), now);
  return iso || null;
}

/* ---------------- 任务定位（ID / 标题 / 会话上下文） ---------------- */

/** context 兼容：string（旧版 contextTaskId）/ 数组 / { taskIds } */
function resolveContextTaskIds(context) {
  if (!context) return [];
  if (typeof context === 'string') return /^T-\d{4}$/i.test(context) ? [context.toUpperCase()] : [];
  if (Array.isArray(context)) return context.map((id) => String(id).toUpperCase()).filter((id) => TASK_ID_RE.test(id));
  if (typeof context === 'object' && Array.isArray(context.taskIds)) return resolveContextTaskIds(context.taskIds);
  return [];
}

function resolveTask(message, tasks, context) {
  const text = String(message || '');
  const idMatch = text.toUpperCase().match(/T-\d{4}/);
  if (idMatch) return (tasks || []).find((task) => task.id === idMatch[0]) || null;

  const normalized = normalizeText(text);
  const matches = (tasks || [])
    .filter((task) => !task.archivedAt && normalizeText(task.title) && normalized.includes(normalizeText(task.title)))
    .sort((a, b) => normalizeText(b.title).length - normalizeText(a.title).length);
  if (matches.length) return matches[0];

  for (const id of resolveContextTaskIds(context)) {
    const hit = (tasks || []).find((task) => task.id === id);
    if (hit) return hit;
  }
  return null;
}

/* ---------------- patch 校验与 diff ---------------- */

function normalizeIsoOrNull(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (isIso(text)) return text;
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${text}T18:00:00+08:00`;
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return undefined; // 非法
}

function normalizePatch(raw, task) {
  const patch = {};
  const errors = [];
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  if (hasOwn(source, 'status') && source.status != null && source.status !== '') {
    const status = String(source.status).trim();
    if (!TASK_STATUSES.includes(status)) errors.push('非法任务状态');
    else patch.status = status;
  }

  if (hasOwn(source, 'progress') && source.progress != null && source.progress !== '') {
    const progress = Number(source.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      errors.push('进度必须是 0-100 的整数');
    } else {
      patch.progress = progress;
    }
  }

  if (hasOwn(source, 'nextAction') && source.nextAction != null) {
    const nextAction = String(source.nextAction).trim();
    if (!nextAction) errors.push('下一步行动不能为空');
    else if (nextAction.length > 500) errors.push('下一步行动不能超过 500 字');
    else patch.nextAction = nextAction;
  }

  if (hasOwn(source, 'dueAt') && source.dueAt != null && source.dueAt !== '') {
    const dueAt = normalizeIsoOrNull(source.dueAt);
    if (dueAt === undefined || dueAt === null) errors.push('截止时间无法识别（支持 ISO 或 YYYY-MM-DD）');
    else patch.dueAt = dueAt;
  }

  if (hasOwn(source, 'remindAt') && source.remindAt != null && source.remindAt !== '') {
    const remindAt = normalizeIsoOrNull(source.remindAt);
    if (remindAt === undefined || remindAt === null) errors.push('提醒时间无法识别（支持 ISO 或 YYYY-MM-DD）');
    else patch.remindAt = remindAt;
  }

  if (hasOwn(source, 'priority') && source.priority != null && source.priority !== '') {
    const priority = Number(source.priority);
    if (!TASK_PRIORITIES.includes(priority)) errors.push('优先级必须是 1-4 的整数星');
    else patch.priority = priority;
  }

  if (hasOwn(source, 'blockedReason')) {
    if (source.blockedReason === null) patch.blockedReason = null;
    else {
      const reason = String(source.blockedReason).trim();
      if (reason.length > 500) errors.push('阻塞原因不能超过 500 字');
      else patch.blockedReason = reason || null;
    }
  }

  if (hasOwn(source, 'result') && source.result != null) {
    const result = String(source.result).trim();
    if (result.length > 500) errors.push('完成结果不能超过 500 字');
    else if (result) patch.result = result;
  }

  // 截止/提醒交叉校验（以 patch 优先，回落任务现值）
  const effDue = patch.dueAt || (task && task.dueAt);
  const effRemind = patch.remindAt || (task && task.remindAt);
  if (effDue && effRemind && Date.parse(effRemind) > Date.parse(effDue)) {
    errors.push('提醒时间不得晚于截止时间');
  }

  if (!hasOwn(patch, 'status') && hasOwn(patch, 'progress') && task) {
    if (patch.progress > 0 && patch.progress < 100 && task.status === '待启动') {
      patch.status = '进行中';
    } else if (
      patch.progress === 100 &&
      (STATUS_TRANSITIONS[task.status] || []).includes('待输出')
    ) {
      patch.status = '待输出';
    }
  }
  if (patch.status === '已完成') patch.progress = 100;
  // 迁出阻塞态时自动清空阻塞原因
  if (task && task.blockedReason && hasOwn(patch, 'status') && patch.status !== '阻塞' && !hasOwn(patch, 'blockedReason')) {
    patch.blockedReason = null;
  }

  return { patch, errors };
}

function diffTask(task, patch) {
  const clean = {};
  const changes = [];
  for (const field of EDITABLE_FIELDS) {
    if (!hasOwn(patch, field)) continue;
    const prev = task[field] === undefined ? null : task[field];
    if (prev === patch[field]) continue;
    clean[field] = patch[field];
    changes.push({
      field,
      label: FIELD_LABELS[field],
      previousValue: prev,
      newValue: patch[field],
    });
  }
  return { patch: clean, changes };
}

function validateTransition(task, patch) {
  // 已完成任务不能静默重新打开：不允许改出「已完成」状态，也不允许把进度改回 100 以下
  if (task.status === '已完成') {
    const reopenByStatus = hasOwn(patch, 'status') && patch.status !== '已完成';
    const reopenByProgress = hasOwn(patch, 'progress') && patch.progress < 100;
    if (reopenByStatus || reopenByProgress) {
      return '任务已完成，不能静默重新打开；如需返工请创建新的跟进任务';
    }
  }
  if (!hasOwn(patch, 'status') || patch.status === task.status) return null;
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  if (!allowed.includes(patch.status)) {
    return '不允许从「' + task.status + '」迁移到「' + patch.status + '」';
  }
  return null;
}

function buildProposal(turn, tasks) {
  const taskId = String((turn && turn.taskId) || '').toUpperCase();
  const task = (tasks || []).find((item) => item.id === taskId);
  if (!task) return { error: taskId ? '未找到任务 ' + taskId : '没有识别到需要更新的任务 ID' };

  const normalized = normalizePatch(turn.patch, task);
  if (normalized.errors.length) return { error: normalized.errors.join('；') };

  const transitionError = validateTransition(task, normalized.patch);
  if (transitionError) return { error: transitionError };

  const diff = diffTask(task, normalized.patch);
  if (!diff.changes.length) return { error: '识别到的内容与当前任务一致，无需更新' };

  return {
    task,
    patch: diff.patch,
    changes: diff.changes,
    confirm: {
      taskId: task.id,
      title: task.title,
      owner: task.owner,
      previousStatus: task.status,
      newStatus: diff.patch.status || task.status,
      patch: diff.patch,
      changes: diff.changes,
      needsEvidence: diff.patch.status === '已完成',
    },
  };
}

function patchFromRequest(body, task) {
  const raw = body && body.patch && typeof body.patch === 'object' ? { ...body.patch } : {};
  if (body && body.newStatus) raw.status = body.newStatus;
  const normalized = normalizePatch(raw, task);
  if (normalized.errors.length) return { error: normalized.errors.join('；') };
  const transitionError = validateTransition(task, normalized.patch);
  if (transitionError) return { error: transitionError };
  return diffTask(task, normalized.patch);
}

/* ---------------- 任务规划（只读） ---------------- */

function isPlanningRequest(message) {
  const text = String(message || '');
  return /(?:接下来|下一步).*(?:做什么|该做|怎么安排|如何安排)|(?:帮我)?(?:规划|安排|排一下).*(?:任务|工作|明天|今天|本周)|优先.*(?:做|推进)|重新排序|根据.*(?:PIP|目标|截止).*排序/.test(text);
}

/** 规划条数：「哪三项」→ 3，默认 5 */
function planCount(message) {
  const m = String(message || '').match(/([一二三四五\d])\s*(?:项|个)/);
  if (!m) return 5;
  const n = CN_NUM[m[1]] || Number(m[1]);
  return n >= 1 && n <= 8 ? n : 5;
}

function buildPlan(tasks, now, opts) {
  const count = (opts && opts.count) || 5;
  const all = (tasks || []).filter((task) => !task.archivedAt && task.status !== '已完成');
  const doneIds = new Set((tasks || []).filter((task) => task.status === '已完成').map((task) => task.id));
  const current = Number(now) || Date.now();
  const meta = (task) => {
    const overdue = Date.parse(task.dueAt) < current ? 1 : 0;
    const blocked = task.status === '阻塞' ? 1 : 0;
    const kpi = KPI_RE.test(`${task.title} ${task.workstream || ''}`) ? 1 : 0;
    const needsSimon = /simon/i.test(`${task.owner || ''} ${task.nextAction || ''}`) ? 1 : 0;
    return { overdue, blocked, kpi, needsSimon, priority: Number(task.priority) || 0, due: Date.parse(task.dueAt) || Number.MAX_SAFE_INTEGER };
  };
  all.sort((a, b) => {
    const x = meta(a);
    const y = meta(b);
    return y.overdue - x.overdue || x.blocked - y.blocked || y.priority - x.priority || x.due - y.due || y.kpi - x.kpi;
  });
  const selected = all.slice(0, count);
  if (!selected.length) {
    return { kind: 'plan', intent: 'plan_tasks', reply: '当前没有未完成任务，可以先确认是否需要新增下一阶段任务。', tasks: [], taskIds: [], contextTaskIds: [] };
  }
  const lines = selected.map((task, index) => {
    const m = meta(task);
    const waiting = (task.dependencies || []).filter((id) => !doneIds.has(id));
    const due = String(task.dueAt || '').slice(5, 10);
    const reasons = [];
    if (m.overdue) reasons.push('已逾期');
    if (m.blocked) reasons.push('当前阻塞');
    reasons.push(`${task.priority} 星`);
    reasons.push(`截止 ${due}`);
    if (m.kpi) reasons.push('KPI 相关');
    if (m.needsSimon) reasons.push('需 Simon 协助');
    if (waiting.length) reasons.push(`先解决依赖 ${waiting.join('、')}`);
    return `${index + 1}. **${task.id}｜${task.title}** — ${task.nextAction}\n   - 推荐理由：${reasons.join('；')}；当前进度 ${task.progress}%`;
  });
  return {
    kind: 'plan',
    intent: 'plan_tasks',
    reply: `建议按下面顺序推进（依据：逾期 > 阻塞 > 星级 > 截止时间 > 依赖 > KPI 相关性）：\n${lines.join('\n')}\n\n_规划为只读建议；如需调整优先级/截止时间或新增任务，直接告诉我即可。_`,
    tasks: selected,
    taskIds: selected.map((task) => task.id),
    contextTaskIds: selected.map((task) => task.id).slice(0, 3),
  };
}

/** 「哪些任务需要 Simon 协助？」→ owner/nextAction 命中 Simon 的未完成任务 */
function buildAssistQuery(message, tasks) {
  const text = String(message || '');
  if (!/协助|配合|帮忙/.test(text)) return null;
  // 含字段更新信号（进度/下一步/截止/改期/星级）时按更新处理，不当作协助查询
  if (/(?:\d\s*%|进度(?:到|为|是|更新|调整)?|下一步|截止|提醒时间|改到|改为|调整为|\d\s*星)/.test(text)) return null;
  const m = text.match(/([A-Za-z]{2,}|[一-龥]{2,4})\s*(?:协助|配合|帮忙)|(?:协助|配合|帮忙)\s*([A-Za-z]{2,}|[一-龥]{2,4})/);
  const name = m ? (m[1] || m[2]) : 'Simon';
  const items = (tasks || []).filter((task) =>
    !task.archivedAt && task.status !== '已完成' &&
    (String(task.owner || '').toLowerCase().includes(String(name).toLowerCase()) ||
      String(task.nextAction || '').toLowerCase().includes(String(name).toLowerCase()))
  );
  if (!items.length) {
    return { kind: 'answer', intent: 'query_tasks', reply: `当前没有需要 ${name} 协助的未完成任务。`, tasks: [], contextTaskIds: [] };
  }
  const lines = items.map((t) => `- **${t.id}｜${t.title}**｜${t.status}｜负责人 ${t.owner}｜下一步：${t.nextAction}`);
  return {
    kind: 'answer',
    intent: 'query_tasks',
    reply: `需要 ${name} 协助的任务（${items.length} 项）：\n${lines.join('\n')}`,
    tasks: items,
    contextTaskIds: items.map((t) => t.id).slice(0, 3),
  };
}

/* ---------------- 对话创建任务（只生成待选方案，不写入） ---------------- */

function isCreateRequest(message) {
  const text = String(message || '');
  if (/拆|分解/.test(text)) return false; // 拆解优先
  return /(?:新增|新建|创建|添加|加一(?:个|项)|建一(?:个|项)|生成)[\s\S]*任务/.test(text) || /生成[\s\S]*选项/.test(text);
}

/** 从创建语句中提取任务标题 */
function extractCreateTitle(message) {
  let text = String(message || '').trim();
  let m = text.match(/任务\s*[：:]\s*([^，,。.!！]+)/);
  if (m) return m[1].trim();
  m = text.match(/(?:新增|新建|创建|添加|帮我创建|帮我建)\s*(?:一个|一项|个)?\s*(?:跟进)?\s*([^，,。.!！]+?)\s*的任务/);
  if (m) {
    const inner = m[1].trim();
    return inner ? `跟进${inner.replace(/^跟进/, '')}` : null;
  }
  m = text.match(/(?:新增|新建|创建|添加)\s*(?:一个|一项|个)\s*(?:任务)?\s*[：:]?\s*([^，,。.!！]+)/);
  if (m) return m[1].replace(/任务$/, '').trim() || null;
  return null;
}

/** 创建任务选项（含 AI 建议标记 suggested）；缺标题时返回追问 */
function buildCreateOptions(message, tasks, operator, now) {
  // 「根据刚才的讨论生成 N 个任务选项」：本地模式无法归纳讨论 → 追问
  if (/生成|讨论/.test(message) && !/新增|新建|创建|添加/.test(message)) {
    return {
      missingFields: ['title'],
      question: '我在本地对话模式下无法自动归纳讨论内容。请直接告诉我任务名称，例如「新增任务：跟进香港机构客户注册，4 星，周五前完成」，我会生成待确认方案。',
    };
  }

  const title = extractCreateTitle(message);
  if (!title) {
    return {
      missingFields: ['title'],
      question: '这个新任务要做什么？请告诉我任务名称（可顺带说明星级、截止时间、负责人，例如「4 星，周五前完成，Simon 负责」）。',
    };
  }

  const suggested = {};
  const priority = extractPriority(message);
  if (priority == null) suggested.priority = true;
  const dueAt = extractDueAt(message, now) || parseChineseDate(message, now);
  if (!dueAt) suggested.dueAt = true; // 默认一周后 18:00
  const ownerMatch = message.match(/([A-Za-z]{2,}|[一-龥]{2,3})\s*负责|负责人\s*(?:是|为)?\s*([A-Za-z]{2,}|[一-龥]{2,3})/);
  const owner = ownerMatch ? (ownerMatch[1] || ownerMatch[2]) : null;
  if (!owner) suggested.owner = true;

  // 截止时间未给出时默认一周后 18:00（AI 建议）
  const finalDue = dueAt || (() => {
    const s = shanghaiNow((Number(now) || Date.now()) + 7 * 86400000);
    return toShanghaiIso(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), 18, 0);
  })();
  // 提醒时间默认截止当天 09:00
  const remindAt = finalDue.slice(0, 11) + '09:00:00+08:00';
  suggested.remindAt = true;
  suggested.nextAction = true;
  suggested.outputCondition = true;
  suggested.status = false;

  const option = {
    title: title.slice(0, 100),
    status: '待启动',
    priority: priority == null ? 3 : priority,
    workstream: null,
    owner: owner || operator || 'Sera',
    dueAt: finalDue,
    remindAt,
    progress: 0,
    nextAction: `推进「${title.slice(0, 60)}」`,
    outputCondition: `完成「${title.slice(0, 60)}」并同步结果`,
    dependencies: [],
    suggested,
  };
  return { options: [option], missingFields: [] };
}

/* ---------------- 任务拆解（父任务 → 2-6 子任务选项） ---------------- */

function isDecomposeRequest(message) {
  return /拆|分解/.test(String(message || ''));
}

const DEFAULT_PHASES = ['方案与准备', '执行推进', '检查与输出', '复盘总结'];

/** 提取拆解维度：「按审批、KYC、首单和复盘拆开」 */
function extractDimensions(message) {
  const m = String(message || '').match(/按\s*([^，,。.!！]+?)\s*(?:拆开|拆分|分解|来拆|拆)/);
  if (!m) return null;
  const parts = m[1].split(/[、，,和与\s]+/).map((s) => s.trim()).filter((s) => s && !/^(?:拆开|拆分|分解|及|以及)$/.test(s));
  return parts.length >= 2 ? parts.slice(0, 6) : null;
}

/** 提取拆解数量：「拆成 4 个子任务」「拆成三个」 */
function extractDecomposeCount(message) {
  const m = String(message || '').match(/([二两三三四五六\d])\s*个(?:子任务|任务|步骤|部分)?|拆成\s*(\d)/);
  if (!m) return null;
  const raw = m[1] || m[2];
  const n = CN_NUM[raw] || Number(raw);
  return n >= 2 && n <= 6 ? n : null;
}

/**
 * 生成拆解选项：2-6 个子任务，串行依赖（dependsOnOptions 存选项下标，执行时映射真实 ID）。
 */
function buildDecomposeOptions(message, tasks, context, now) {
  const parent = resolveTask(message, tasks, context);
  if (!parent) {
    return {
      missingFields: ['taskId'],
      question: '要拆解哪项任务？请告诉我任务 ID（例如 T-0006）或完整任务名称。',
    };
  }
  if (parent.status === '已完成') {
    return { error: `${parent.id}「${parent.title}」已完成，无需拆解。` };
  }
  let dims = extractDimensions(message);
  const count = extractDecomposeCount(message);
  if (!dims) dims = DEFAULT_PHASES.slice(0, count || 3);
  if (count && dims.length > count) dims = dims.slice(0, count);
  if (dims.length < 2) dims = DEFAULT_PHASES.slice(0, 3);
  dims = dims.slice(0, 6);

  const nowMs = Number(now) || Date.now();
  const parentDue = Date.parse(parent.dueAt);
  const span = parentDue > nowMs ? parentDue - nowMs : 0;

  const options = dims.map((dim, i) => {
    const dueMs = span ? nowMs + Math.round(((i + 1) / dims.length) * span) : parentDue;
    const sh = shanghaiNow(dueMs);
    const dueAt = toShanghaiIso(sh.getUTCFullYear(), sh.getUTCMonth() + 1, sh.getUTCDate(), 18, 0);
    return {
      title: `${parent.title}｜${dim}`.slice(0, 100),
      status: '待启动',
      priority: parent.priority,
      workstream: parent.workstream || null,
      owner: parent.owner,
      dueAt,
      remindAt: dueAt.slice(0, 11) + '09:00:00+08:00',
      progress: 0,
      nextAction: `推进「${dim}」`,
      outputCondition: `完成「${dim}」并同步进展`,
      dependencies: [],
      dependsOnOptions: i > 0 ? [i - 1] : [], // 串行：后一步依赖前一步（执行时映射真实任务 ID）
      parentTaskId: parent.id,
      suggested: { dueAt: true, remindAt: true, nextAction: true, outputCondition: true },
    };
  });

  const treeLines = [`${parent.id}｜${parent.title}`].concat(options.map((o, i) => `${i + 1}. → ${o.title}（${o.owner}，${o.priority} 星，截止 ${o.dueAt.slice(5, 10)}）`));
  return { parent, options, missingFields: [], treeText: treeLines.join('\n') };
}

/* ---------------- 对话路由主入口 ---------------- */

/** 「打开 T-0006」「查看 XX 任务」→ 展示任务卡并写入上下文 */
function buildOpenTask(message, tasks, context) {
  const m = String(message || '').match(/^\s*(?:打开|查看|看下|看看|聚焦于|聚焦)\s*(?:任务)?\s*(.+?)\s*$/);
  if (!m) return null;
  const task = resolveTask(m[1], tasks, context);
  if (!task) return { kind: 'clarify', intent: 'clarify', reply: `没有找到「${m[1]}」对应的任务，请检查任务 ID 或名称。` };
  return {
    kind: 'task-card',
    intent: 'query_tasks',
    reply: `已聚焦 **${task.id}｜${task.title}**（${task.status}，进度 ${task.progress}%）。接下来可以直接说「进度改到 30%」「下一步联系 Michael」等。`,
    tasks: [task],
    contextTaskId: task.id,
    contextTaskIds: [task.id],
  };
}

/**
 * 本地对话路由。context 支持：string（旧版 contextTaskId）/ 数组 / { taskIds, operator }。
 * 返回对象带协议字段（intent/contextTaskIds/taskOptions/missingFields/requiresConfirmation），
 * 同时保留旧字段（kind/reply/tasks/confirm/contextTaskId）兼容现有前端。
 */
function routeConversation(message, tasks, context, now) {
  const ctxIds = resolveContextTaskIds(context);
  const operator = (context && typeof context === 'object' && !Array.isArray(context) && context.operator) || 'Sera';
  const current = Number(now) || Date.now();

  // 0. 协助查询（「哪些任务需要 Simon 协助？」）
  const assist = buildAssistQuery(message, tasks);
  if (assist) return assist;

  // 1. 任务规划（只读）
  if (isPlanningRequest(message)) return buildPlan(tasks, current, { count: planCount(message) });

  // 2. 任务拆解
  if (isDecomposeRequest(message)) {
    const d = buildDecomposeOptions(message, tasks, context, current);
    if (d.question) return { kind: 'clarify', intent: 'clarify', reply: d.question, missingFields: d.missingFields, contextTaskIds: ctxIds };
    if (d.error) return { kind: 'answer', intent: 'no_action', reply: d.error, contextTaskIds: ctxIds };
    return {
      kind: 'decompose',
      intent: 'decompose_task',
      reply: `已为 ${d.parent.id}｜${d.parent.title} 拆解出 ${d.options.length} 个子任务方案：\n${d.treeText}\n\n请勾选要创建的子任务后确认；截止时间/负责人可直接在卡片上编辑。`,
      tasks: [d.parent],
      taskOptions: d.options,
      parentTaskId: d.parent.id,
      requiresConfirmation: true,
      contextTaskId: d.parent.id,
      contextTaskIds: [d.parent.id],
      missingFields: [],
    };
  }

  // 3. 创建任务
  if (isCreateRequest(message)) {
    const c = buildCreateOptions(message, tasks, operator, current);
    if (c.question) return { kind: 'clarify', intent: 'clarify', reply: c.question, missingFields: c.missingFields, contextTaskIds: ctxIds };
    const optLines = c.options.map((o, i) => {
      const sug = Object.keys(o.suggested || {}).filter((k) => o.suggested[k]);
      return `${i + 1}. ${o.title}（${o.priority} 星，截止 ${String(o.dueAt).slice(0, 10)}，负责人 ${o.owner}${sug.length ? `；AI 建议：${sug.map((k) => FIELD_LABELS[k] || k).join('、')}` : ''}）`;
    });
    return {
      kind: 'create',
      intent: 'create_task',
      reply: `已生成 ${c.options.length} 个待确认任务方案：\n${optLines.join('\n')}\n\n确认后由我统一分配任务 ID 并写入。`,
      taskOptions: c.options,
      requiresConfirmation: true,
      contextTaskIds: ctxIds,
      missingFields: [],
    };
  }

  // 4. 字段更新（状态/进度/下一步/截止/提醒/星级/阻塞原因/完成结果）
  const progress = extractProgress(message);
  const nextAction = extractNextAction(message);
  const status = inferStatus(message);
  const priority = extractPriority(message);
  const dueAt = extractDueAt(message, current);
  const remindAt = extractRemindAt(message, current);
  const blockedReason = extractBlockedReason(message);
  const result = extractResult(message);
  const hasPatch = progress != null || !!nextAction || !!status || priority != null || !!dueAt || !!remindAt || !!blockedReason || !!result;
  if (hasPatch) {
    const task = resolveTask(message, tasks, context);
    if (!task) {
      return {
        kind: 'clarify',
        intent: 'clarify',
        reply: '我识别到你要同步任务，但还不知道是哪一项。请补充任务 ID（例如 T-0006）或完整任务名称。',
        missingFields: ['taskId'],
        contextTaskIds: ctxIds,
      };
    }
    const patch = {};
    if (status) patch.status = status;
    if (progress != null) patch.progress = progress;
    if (nextAction) patch.nextAction = nextAction;
    if (priority != null) patch.priority = priority;
    if (dueAt) patch.dueAt = dueAt;
    if (remindAt) patch.remindAt = remindAt;
    if (blockedReason) patch.blockedReason = blockedReason;
    if (result) patch.result = result;
    const proposal = buildProposal({ taskId: task.id, patch }, tasks);
    if (proposal.error) {
      return {
        kind: 'answer',
        intent: 'no_action',
        reply: task.id + '｜' + task.title + '：' + proposal.error + '。',
        tasks: [task],
        contextTaskId: task.id,
        contextTaskIds: [task.id],
      };
    }
    return {
      kind: 'update',
      intent: 'update_task',
      reply: '我已整理出 ' + task.id + '｜' + task.title + ' 的变更，请核对后确认写入。',
      tasks: [task],
      contextTaskId: task.id,
      contextTaskIds: [task.id],
      operations: [{ operation: 'update', taskId: task.id, patch: proposal.patch }],
      requiresConfirmation: true,
      confirm: proposal.confirm,
    };
  }

  // 5. 打开/聚焦任务
  const opened = buildOpenTask(message, tasks, context);
  if (opened) return opened;

  return null;
}

module.exports = {
  EDITABLE_FIELDS,
  FIELD_LABELS,
  KPI_RE,
  normalizePatch,
  diffTask,
  buildProposal,
  patchFromRequest,
  resolveTask,
  resolveContextTaskIds,
  extractProgress,
  extractNextAction,
  extractPriority,
  extractDueAt,
  extractRemindAt,
  extractBlockedReason,
  extractResult,
  inferStatus,
  parseChineseDate,
  isPlanningRequest,
  planCount,
  buildPlan,
  buildAssistQuery,
  isCreateRequest,
  buildCreateOptions,
  isDecomposeRequest,
  buildDecomposeOptions,
  routeConversation,
};
