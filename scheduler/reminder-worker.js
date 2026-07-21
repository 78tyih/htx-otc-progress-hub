#!/usr/bin/env node
/**
 * 企微提醒 Worker：扫描 tasks.json 到期提醒点，推送企业微信。
 *
 * 用法：
 *   node scheduler/reminder-worker.js scan            扫描到期提醒（只读，不写盘）
 *   node scheduler/reminder-worker.js test            生成推送预览（不发送、不写盘）
 *   node scheduler/reminder-worker.js send --confirm  明确确认后才真实推送
 *
 * 闭环约定：
 *   - 推送成功后置 remindedAt 防重复推送，并把 待启动/进行中 任务置为「已提醒」；
 *   - 每次推送追加 audit-log（actor: scheduler）；
 *   - test / scan 绝不发送、绝不修改任何数据文件。
 */
'use strict';

const { STATUS_TRANSITIONS } = require('../agent/schema');
const { syncPresentation } = require('../agent/presenter');
const { loadTasks, saveTasks, appendAudit, nowIso, syncFallbackQuiet } = require('../agent/data-writer');
const { findDueReminders, buildMessage, remainText } = require('./reminder-rules');
const { loadWebhookUrl, buildPayload, postWebhook } = require('./wecom-notifier');

const cmd = process.argv[2];
const confirmed = process.argv.includes('--confirm');

function transition(task, to) {
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  if (task.status !== to && !allowed.includes(to)) {
    throw new Error(`不允许从「${task.status}」迁移到「${to}」`);
  }
  task.status = to;
}

function listDue(due) {
  return due
    .map((t) => `${t.id}  [${t.priority}] ${t.title} ｜ ${t.status} ｜ 截止 ${t.dueAt.slice(0, 16).replace('T', ' ')}（${remainText(t)}）`)
    .join('\n');
}

async function main() {
  const data = loadTasks();
  const due = findDueReminders(data);

  if (cmd === 'scan') {
    if (!due.length) {
      console.log('🔍 扫描完成：当前无到期未提醒任务');
      return;
    }
    console.log(`🔍 扫描完成：${due.length} 项任务到达提醒点（未推送）：`);
    console.log(listDue(due));
    return;
  }

  if (cmd === 'test') {
    console.log('========== 预览模式（reminder:test）==========');
    if (!due.length) {
      console.log('当前无到期未提醒任务，无预览内容');
      return;
    }
    const payload = buildPayload(buildMessage(due));
    console.log('以下为即将推送到企业微信的消息体（JSON）：\n');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n========== 预览结束：未发送、未修改任何数据 ==========');
    console.log('确认无误后执行：node scheduler/reminder-worker.js send --confirm');
    return;
  }

  if (cmd === 'send') {
    if (!confirmed) {
      console.error('⛔ 未明确确认，拒绝发送。真实推送必须显式加 --confirm（先跑 reminder:test 预览）');
      process.exit(1);
    }
    if (!due.length) {
      console.log('📭 无到期未提醒任务，未发送');
      return;
    }
    const url = loadWebhookUrl();
    if (!url) {
      console.error('⛔ 未找到 WECOM_WEBHOOK_URL：请写入环境变量或项目根目录 .env（勿提交真实值）');
      process.exit(1);
    }
    const payload = buildPayload(buildMessage(due));
    const res = await postWebhook(url, payload);
    let errcode = -1;
    try {
      errcode = JSON.parse(res.body).errcode;
    } catch {
      /* 非企微响应（如测试桩）按 HTTP 状态码判断 */
    }
    const ok = res.code === 200 && (errcode === 0 || errcode === -1);
    if (!ok) {
      console.error(`⛔ 推送失败（HTTP ${res.code}）：${res.body}，任务未标记，可重试`);
      process.exit(1);
    }
    for (const t of due) {
      t.remindedAt = nowIso();
      transition(t, '已提醒');
    }
    saveTasks(data);
    for (const t of due) {
      appendAudit('scheduler', 'remind', t.id, `企微提醒已推送：「${t.title}」（${t.remindedAt}），状态置为已提醒`);
    }
    syncPresentation(data);
    syncFallbackQuiet();
    console.log(`✅ 已推送 ${due.length} 项提醒并标记 remindedAt：`);
    console.log(listDue(due));
    return;
  }

  console.error('用法：node scheduler/reminder-worker.js <scan|test|send --confirm>');
  process.exit(cmd ? 1 : 0);
}

main().catch((err) => {
  console.error(`⛔ ${err.message}`);
  process.exit(1);
});
