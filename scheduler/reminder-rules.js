/**
 * 提醒规则层（纯函数，零依赖，不触碰文件系统）：
 *   - findDueReminders：判定哪些任务到达提醒点且尚未推送（remindedAt 去重）
 *   - buildMessage：把到期任务组装成企微 markdown 文案
 *
 * 提醒范围：仅「待启动 / 进行中」任务；阻塞已升级、待输出等结果、
 * 已提醒/已延期/已完成均不重复推送（remindedAt 置位后天然去重）。
 */
'use strict';

const REMINDABLE_STATUSES = ['待启动', '进行中'];

/** 到期且未提醒的任务（remindAt <= now 且 remindedAt 为 null） */
function findDueReminders(data, now = Date.now()) {
  const list = (data && Array.isArray(data.tasks)) ? data.tasks : [];
  return list.filter(
    (t) =>
      REMINDABLE_STATUSES.includes(t.status) &&
      t.remindedAt === null &&
      Date.parse(t.remindAt) <= now
  );
}

/** 剩余 / 逾期的人性化描述 */
function remainText(task, now = Date.now()) {
  const diff = Date.parse(task.dueAt) - now;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(hours / 24);
  const parts = days > 0 ? `${days} 天 ${hours % 24} 小时` : `${hours} 小时 ${Math.floor((abs % 3600000) / 60000)} 分钟`;
  return diff >= 0 ? `剩余 ${parts}` : `已逾期 ${parts}`;
}

/** 单条任务文案行 */
function taskLine(task, now = Date.now(), index) {
  const due = task.dueAt.slice(0, 16).replace('T', ' ');
  return [
    `**${index}. ${task.id}「${task.title}」** <font color="warning">${task.priority}</font>`,
    `> 负责人：${task.owner} ｜ 截止：${due}（${remainText(task, now)}）`,
    `> 下一步：${task.nextAction}`,
    `> 输出条件：${task.outputCondition}`,
  ].join('\n');
}

/** 组装完整企微 markdown 文案（多条合并为一条消息，避免 webhook 刷屏） */
function buildMessage(dueTasks, now = Date.now()) {
  const header = `⏰ **PIP 任务提醒（${dueTasks.length} 项）**`;
  const body = dueTasks.map((t, i) => taskLine(t, now, i + 1)).join('\n');
  return `${header}\n${body}`;
}

module.exports = {
  REMINDABLE_STATUSES,
  findDueReminders,
  remainText,
  buildMessage,
};
