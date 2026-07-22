/**
 * Agent 意图路由（纯函数，规则优先，不依赖 LLM）
 *
 * 输入用户中文问题 + 任务上下文，输出结构化响应：
 *   { reply, tasks?, confirm?, notifyTest?, kind? }
 *   - reply：Markdown 文本（含判定依据与建议下一步）
 *   - tasks：结构化任务卡片数据（id/title/status/owner/dueAt/class/label/basis/suggestion）
 *   - confirm：状态变更确认卡（taskId/title/previousStatus/newStatus/needsEvidence），不产生任何写操作
 *   - notifyTest：前端应调用 /api/notify/test 并渲染诊断结果
 * 返回 null 表示规则未命中，交由 LLM 兜底。
 */
'use strict';

const { classifyAll, byClass } = require('../../agent/classify');
const { STATUS_TRANSITIONS } = require('../../agent/schema');

const fmtDue = (iso) => String(iso || '').slice(5, 16).replace('T', ' ');

function brief(c) {
  return {
    id: c.task.id,
    title: c.task.title,
    status: c.task.status,
    owner: c.task.owner,
    dueAt: c.task.dueAt,
    progress: c.task.progress,
    class: c.class,
    label: c.label,
    basis: c.basis,
    suggestion: c.suggestion,
  };
}

function listReply(title, items, emptyText) {
  if (!items.length) return { reply: `📭 ${emptyText || `${title}：暂无`}`, tasks: [] };
  const lines = items.map((c) => [
    `- **${c.task.id}｜${c.task.title}**｜${c.task.status}｜进度 ${c.task.progress}%｜负责人 ${c.task.owner}｜截止 ${fmtDue(c.task.dueAt)}`,
    `  - 判定依据：${c.basis.join('；')}`,
    `  - 建议下一步：${c.suggestion}`,
  ].join('\n'));
  return { reply: `**${title}（${items.length} 项）**\n${lines.join('\n')}`, tasks: items.map(brief) };
}

/** 从消息中定位任务：优先 T-xxxx ID，其次任务标题完整包含 */
function findTaskRef(msg, tasks) {
  const m = msg.match(/T[-\s]?(\d{1,4})/i);
  if (m) {
    const id = `T-${m[1].padStart(4, '0')}`;
    const hit = tasks.find((t) => t.id === id);
    if (hit) return hit;
  }
  let best = null;
  for (const t of tasks) {
    if (t.title && msg.includes(t.title) && (!best || t.title.length > best.title.length)) best = t;
  }
  return best;
}

/** 解析状态变更意图（标记完成 / 改为进行中），返回确认卡或说明 */
function parseUpdate(msg, tasks) {
  const hasVerb = /改为|改成|设为|设为|置为|标记|标为|更新为|改成|改成/.test(msg);
  if (!hasVerb) return null;
  let target = null;
  if (/已完成|完成|done/i.test(msg)) target = '已完成';
  else if (/进行中|开始推进|开始做/.test(msg)) target = '进行中';
  if (!target) return null;

  const task = findTaskRef(msg, tasks);
  if (!task) {
    const candidates = tasks.filter((t) => t.status !== '已完成').slice(0, 5)
      .map((t) => `- ${t.id}｜${t.title}（${t.status}）`).join('\n');
    return { reply: `请告诉我要更新哪项任务（任务 ID 如 T-0001，或任务名称）。当前未完成任务：\n${candidates}` };
  }
  if (task.status === target) return { reply: `ℹ️ ${task.id}「${task.title}」已处于「${target}」，无需变更。` };
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  if (!allowed.includes(target)) {
    return { reply: `⚠️ 不允许把 ${task.id}「${task.title}」从「${task.status}」直接改为「${target}」。如需变更请先调整中间状态。` };
  }
  return {
    reply: `确认把 **${task.id}｜${task.title}** 从「${task.status}」修改为「${target}」吗？${target === '已完成' ? '（可附交付证据）' : ''}`,
    confirm: {
      taskId: task.id,
      title: task.title,
      owner: task.owner,
      previousStatus: task.status,
      newStatus: target,
      dueAt: task.dueAt,
      needsEvidence: target === '已完成',
    },
  };
}

/** 本周优先级：逾期 > 阻塞 > 待确认 > 7 天内到期 > 进行中，P0 优先 */
function weeklyPriority(classified, now) {
  const dayMs = 24 * 3600 * 1000;
  const scored = classified
    .filter((c) => c.class !== 'done')
    .map((c) => {
      const daysLeft = (Date.parse(c.task.dueAt) - now) / dayMs;
      let score = 0;
      if (c.class === 'overdue') score += 100;
      if (c.class === 'blocked') score += 80;
      if (c.class === 'needs_confirmation') score += 60;
      if (daysLeft >= 0 && daysLeft <= 7) score += 40 - daysLeft * 2;
      if (c.class === 'in_progress') score += 15;
      score += c.task.priority === 'P0' ? 20 : 10;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.c);
  return scored;
}

const HELP = [
  '我可以帮你：',
  '- 查进度：已完成 / 未完成 / 进行中 / 逾期 / 阻塞任务',
  '- 看重点：今日进度、本周优先级、某负责人的任务（如「检查 Simon 的任务」）',
  '- 改状态：「把 T-0001 标记为已完成」「把 T-0002 改为进行中」（会先让你确认）',
  '- 周复盘：「生成上周复盘」（草稿确认后归档）',
  '- 发通知：「测试一次手机通知」',
].join('\n');

/**
 * 规则路由。ctx = { tasks, now }；返回 null 表示未命中（交由 LLM 兜底）。
 */
function route(rawMessage, ctx) {
  const msg = String(rawMessage || '').trim();
  if (!msg) return { reply: HELP, kind: 'help' };

  const classified = classifyAll(ctx.tasks, ctx.now);
  const today = new Date(ctx.now + (8 * 60 + new Date(ctx.now).getTimezoneOffset()) * 60000).toISOString().slice(0, 10);

  // 1. 测试手机通知
  if (/测试.*通知|通知.*测试|发.*手机通知|手机通知/.test(msg)) {
    return { reply: '好的，正在发送一条测试手机通知…', notifyTest: true, kind: 'notify-test' };
  }

  // 1b. 生成周复盘（前端调用 /api/weekly/generate，草稿确认后归档）
  if (/复盘|周报/.test(msg) && /生成|做|写|出一份|来一份/.test(msg)) {
    return { reply: '好的，正在读取真实任务数据生成上周复盘草稿…', weeklyGenerate: true, kind: 'weekly-generate' };
  }

  // 2. 状态变更（先于查询判定，避免「完成」误匹配）
  const update = parseUpdate(msg, ctx.tasks);
  if (update) return { ...update, kind: 'update' };

  // 3. 未完成
  if (/未完成|没完成|还没有完成|没做完|剩余|待完成/.test(msg)) {
    const items = classified.filter((c) => c.class !== 'done');
    return { ...listReply('尚未完成的任务', items, '🎉 所有任务都已完成'), kind: 'list' };
  }

  // 4. 已完成
  if (/已完成|完成了哪些|哪些.*完成|做完/.test(msg)) {
    return { ...listReply('已完成的任务', byClass(classified, 'done'), '暂无已完成任务'), kind: 'list' };
  }

  // 5. 进行中
  if (/进行中|在做|正在做|正在推进/.test(msg)) {
    return { ...listReply('正在进行中的任务', byClass(classified, 'in_progress'), '暂无进行中任务'), kind: 'list' };
  }

  // 6. 逾期
  if (/逾期|过期|延期|超时|晚于截止/.test(msg)) {
    const items = byClass(classified, 'overdue');
    return { ...listReply('已逾期的任务', items, '暂无逾期任务'), kind: 'overdue', discover: 'overdue' };
  }

  // 7. 阻塞
  if (/阻塞|卡住|被挡|block/i.test(msg)) {
    const items = byClass(classified, 'blocked');
    return { ...listReply('被阻塞的任务', items, '暂无阻塞任务'), kind: 'blocked', discover: 'blocked' };
  }

  // 8. 本周优先级
  if (/本周|这周|优先/.test(msg)) {
    const items = weeklyPriority(classified, ctx.now);
    return { ...listReply('本周建议优先处理', items, '本周无待处理任务'), kind: 'weekly' };
  }

  // 9. 今日进度
  if (/今日|今天/.test(msg)) {
    const doneToday = classified.filter((c) => c.task.completedAt && String(c.task.completedAt).slice(0, 10) === today);
    const dueToday = classified.filter((c) => c.class !== 'done' && String(c.task.dueAt).slice(0, 10) === today);
    const counts = {
      进行中: byClass(classified, 'in_progress').length,
      阻塞: byClass(classified, 'blocked').length,
      逾期: byClass(classified, 'overdue').length,
      待确认: byClass(classified, 'needs_confirmation').length,
    };
    const summary = `**今日进度（${today}）**\n- 今日完成 ${doneToday.length} 项｜今日到期未完成 ${dueToday.length} 项\n- 当前：进行中 ${counts.进行中}｜阻塞 ${counts.阻塞}｜逾期 ${counts.逾期}｜待确认 ${counts.待确认}`;
    const items = [...dueToday, ...doneToday];
    return {
      reply: items.length ? `${summary}\n\n${[...listReply('今日相关任务', items).reply].join('')}` : summary,
      tasks: items.map(brief),
      kind: 'today',
    };
  }

  // 10. 负责人进度（「检查 Simon 的任务」「Sera 的进度」）
  const ownerMatch = msg.match(/([A-Za-z]{2,}|[一-龥]{2,4})\s*的?(?:任务|进度)/) || msg.match(/检查\s*([A-Za-z]{2,}|[一-龥]{2,4})/);
  if (ownerMatch) {
    const name = ownerMatch[1];
    const items = classified.filter((c) => String(c.task.owner).toLowerCase().includes(name.toLowerCase()));
    if (items.length) {
      const done = byClass(items, 'done').length;
      return {
        ...listReply(`${name} 的任务进度（已完成 ${done}/${items.length}）`, items),
        kind: 'owner',
      };
    }
    return { reply: `未找到负责人包含「${name}」的任务。`, tasks: [], kind: 'owner' };
  }

  // 11. 帮助
  if (/帮助|你会什么|能做什么|help/i.test(msg)) return { reply: HELP, kind: 'help' };

  return null;
}

module.exports = { route, findTaskRef, weeklyPriority, HELP };
