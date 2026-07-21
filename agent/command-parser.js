/**
 * 命令解析层：把「结构化参数」或「中文自然语言」解析为统一 intent 对象。
 *
 * intent 形态：
 *   { action: 'add', title, dueAt, remindAt, priority, workstream, owner, nextAction, outputCondition }
 *   { action: 'done', id, result?, follow?, followDueAt?, followRemindAt? }
 *   { action: 'postpone', id, to, remindAt?, reason? }
 *   { action: 'delete', id, yes }
 *   { action: 'progress', id, value }
 *   { action: 'next', id, text }
 *   { action: 'today' } / { action: 'pendingOutput' } / { action: 'list' }
 *   { action: 'block', text, id? }
 *   { action: 'help' } / { action: 'error', message }
 *
 * 时间输入统一解析为 +08:00 ISO；仅日期时默认 18:00。
 */
'use strict';

const pad = (n) => String(n).padStart(2, '0');

/** 解析多种时间写法为 ISO(+08:00)：2026-07-25 18:00 / 2026-07-25 / 07-25 / 7月25日 / 明天 / 后天 / 完整 ISO */
function parseTime(input) {
  if (!input) return null;
  const s = String(input).trim();

  // 已带时区的完整 ISO 直接采纳
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(s)) return s;

  const shNow = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
  const mk = (y, mo, d, h = 18, mi = 0) =>
    `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00+08:00`;

  if (s === '明天') return mk(shNow.getFullYear(), shNow.getMonth() + 1, shNow.getDate() + 1);
  if (s === '后天') return mk(shNow.getFullYear(), shNow.getMonth() + 1, shNow.getDate() + 2);

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2})[:：](\d{1,2}))?$/);
  if (m) return mk(+m[1], +m[2], +m[3], m[4] ? +m[4] : 18, m[5] ? +m[5] : 0);

  m = s.match(/^(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})[:：](\d{1,2}))?$/);
  if (m) return mk(shNow.getFullYear(), +m[1], +m[2], m[3] ? +m[3] : 18, m[4] ? +m[4] : 0);

  m = s.match(/^(\d{1,2})月(\d{1,2})[日号]?(?:\s*(\d{1,2})[:：点](\d{1,2})?)?$/);
  if (m) return mk(shNow.getFullYear(), +m[1], +m[2], m[3] ? +m[3] : 18, m[4] ? +m[4] : 0);

  return null;
}

/** 截止前一日 09:00 作为默认提醒时间 */
function defaultRemind(dueIso) {
  const d = new Date(Date.parse(dueIso) - 24 * 3600 * 1000);
  const sh = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
  return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}T09:00:00+08:00`;
}

const TASK_ID_IN_TEXT = /T-\d{4}/i;

/** 结构化子命令解析（argv 已为 process.argv.slice(2)） */
function parseStructured(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const key = rest[i].slice(2);
      if (key === 'yes' || key === 'p0' || key === 'p1') {
        flags[key] = true;
      } else {
        flags[key] = rest[i + 1];
        i += 1;
      }
    } else {
      positional.push(rest[i]);
    }
  }

  switch (cmd) {
    case 'add': {
      const title = positional.join(' ').trim();
      if (!title) return { action: 'error', message: '缺少任务标题：task add "标题" --due "2026-07-25 18:00"' };
      const dueAt = parseTime(flags.due);
      if (!dueAt) return { action: 'error', message: '缺少或无法解析 --due（支持 2026-07-25 18:00 / 7月25日 / 明天）' };
      return {
        action: 'add',
        title,
        dueAt,
        remindAt: parseTime(flags.remind) || defaultRemind(dueAt),
        priority: flags.p0 ? 'P0' : flags.p1 ? 'P1' : flags.priority || 'P1',
        workstream: flags.ws || null,
        owner: flags.owner || 'Sera',
        nextAction: flags.next || '待明确下一步',
        outputCondition: flags.output || '产出可交付结果并确认',
      };
    }
    case 'done':
      return {
        action: 'done',
        id: positional[0],
        result: flags.result || null,
        follow: flags.follow || null,
        followDueAt: parseTime(flags['follow-due']),
        followRemindAt: parseTime(flags['follow-remind']),
      };
    case 'postpone': {
      const to = parseTime(flags.to);
      if (!to) return { action: 'error', message: '缺少或无法解析 --to（新截止时间）' };
      return { action: 'postpone', id: positional[0], to, remindAt: parseTime(flags.remind), reason: flags.reason || '' };
    }
    case 'delete':
      return { action: 'delete', id: positional[0], yes: !!flags.yes };
    case 'progress': {
      const value = parseInt(positional[1], 10);
      if (!Number.isInteger(value) || value < 0 || value > 100) return { action: 'error', message: '进度须为 0-100 整数' };
      return { action: 'progress', id: positional[0], value };
    }
    case 'next':
      return { action: 'next', id: positional[0], text: positional.slice(1).join(' ').trim() };
    case 'today':
      return { action: 'today' };
    case 'pending-output':
      return { action: 'pendingOutput' };
    case 'list':
      return { action: 'list' };
    case 'block':
      return { action: 'block', id: positional[0] && TASK_ID_IN_TEXT.test(positional[0]) ? positional[0] : null,
        text: positional[0] && TASK_ID_IN_TEXT.test(positional[0]) ? positional.slice(1).join(' ').trim() : positional.join(' ').trim() };
    default:
      return { action: 'error', message: `未知子命令 "${cmd}"，输入 task help 查看用法` };
  }
}

/** 中文自然语言解析（无子命令时调用，输入为整串文本） */
function parseNatural(text) {
  const s = text.trim();
  if (!s) return { action: 'help' };

  if (/今日到期|今天到期|今日任务/.test(s)) return { action: 'today' };
  if (/本周待输出|待输出/.test(s)) return { action: 'pendingOutput' };
  if (/^(任务)?列表|所有任务|全部任务/.test(s)) return { action: 'list' };

  const idHit = s.match(TASK_ID_IN_TEXT);
  const id = idHit ? idHit[0].toUpperCase() : null;

  if (/新增|添加|创建/.test(s) && /任务/.test(s)) {
    const titlePart = s.replace(/.*?(?:新增|添加|创建)任务\s*/, '')
      .split(/\s+(?:截止|提醒|主线|P0|P1)/)[0].trim();
    const dueHit = s.match(/截止\s*([^，,。\s]+(?:\s+\d{1,2}[:：]\d{2})?)/);
    const remindHit = s.match(/提醒\s*([^，,。\s]+(?:\s+\d{1,2}[:：]\d{2})?)/);
    const wsHit = s.match(/主线\s*([^\s，,。]+)/);
    const nextHit = s.match(/下一步\s*([^\n]+?)(?:\s+(?:输出条件|截止|提醒)\s*|$)/);
    const outHit = s.match(/输出条件\s*([^\n]+)$/);
    const dueAt = dueHit ? parseTime(dueHit[1]) : null;
    if (!titlePart) return { action: 'error', message: '未识别任务标题' };
    if (!dueAt) return { action: 'error', message: '未识别截止时间（例：截止 7月25日）' };
    return {
      action: 'add',
      title: titlePart,
      dueAt,
      remindAt: remindHit ? parseTime(remindHit[1]) : defaultRemind(dueAt),
      priority: /P0/.test(s) ? 'P0' : 'P1',
      workstream: wsHit ? wsHit[1] : null,
      owner: 'Sera',
      nextAction: nextHit ? nextHit[1].trim() : '待明确下一步',
      outputCondition: outHit ? outHit[1].trim() : '产出可交付结果并确认',
    };
  }

  if (id && /延期|推迟/.test(s)) {
    const toHit = s.match(/(?:延期|推迟)到?\s*([^，,。\s]+(?:\s+\d{1,2}[:：]\d{2})?)/);
    const to = toHit ? parseTime(toHit[1]) : null;
    if (!to) return { action: 'error', message: '未识别延期后的截止时间' };
    return { action: 'postpone', id, to, remindAt: null, reason: '' };
  }
  if (id && /删除/.test(s)) return { action: 'delete', id, yes: false };
  if (id && /完成/.test(s)) {
    const resultHit = s.match(/结果[:：=]?\s*(.+)$/);
    return { action: 'done', id, result: resultHit ? resultHit[1].trim() : null, follow: null, followDueAt: null, followRemindAt: null };
  }
  if (id && /进度/.test(s)) {
    const numHit = s.match(/进度\s*[:：]?\s*(\d{1,3})/);
    const value = numHit ? parseInt(numHit[1], 10) : NaN;
    if (!Number.isInteger(value) || value > 100) return { action: 'error', message: '进度须为 0-100 整数' };
    return { action: 'progress', id, value };
  }
  if (id && /下一步/.test(s)) {
    const text2 = s.split(/下一步/)[1];
    return { action: 'next', id, text: text2 ? text2.replace(/^[:：\s]+/, '').trim() : '' };
  }
  if (/阻塞/.test(s)) {
    const text2 = s.replace(/^.*?(?:新增)?阻塞[:：]?\s*/, '').trim();
    return { action: 'block', id, text: text2 || s };
  }

  return { action: 'error', message: '无法理解的指令，输入 task help 查看用法' };
}

/** 总入口：首个参数为已知子命令 → 结构化；否则按自然语言处理 */
function parse(argv) {
  const SUBCOMMANDS = ['add', 'done', 'postpone', 'delete', 'progress', 'next', 'today', 'pending-output', 'list', 'block', 'help'];
  if (!argv.length || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') return { action: 'help' };
  if (SUBCOMMANDS.includes(argv[0])) return parseStructured(argv);
  return parseNatural(argv.join(' '));
}

module.exports = { parse, parseTime, defaultRemind };
