#!/usr/bin/env node
/**
 * HTX OTC 任务闭环 Agent CLI（零依赖）。
 *
 * 结构化用法：
 *   node agent/cli.js add "提交设计交付包" --due "2026-07-25 18:00" --remind "2026-07-24 09:00" --p0 --ws "设计交付包" --next "提交设计团队" --output "设计团队确认排期"
 *   node agent/cli.js done T-0001 --result "已提交" --follow "确认设计排期" --follow-due "2026-07-28 18:00"
 *   node agent/cli.js postpone T-0001 --to "2026-07-28 18:00" --reason "等待排期"
 *   node agent/cli.js delete T-0001            （二次确认：需再次输入任务 ID）
 *   node agent/cli.js progress T-0002 60
 *   node agent/cli.js next T-0002 "按清单逐个触达"
 *   node agent/cli.js today                    今日到期
 *   node agent/cli.js pending-output           本周待输出
 *   node agent/cli.js block "大数据名单待确认" --或-- block T-0005 "大数据名单待确认"
 *   node agent/cli.js list
 *
 * 自然语言用法（整串作为参数）：
 *   node agent/cli.js "新增任务 确认设计排期 截止 7月28日 P0 主线 设计交付包"
 *   node agent/cli.js "T-0002 进度 60" / "完成 T-0001 结果:已提交" / "T-0003 延期到 7月28日"
 *   node agent/cli.js "今日到期" / "本周待输出"
 */
'use strict';

const readline = require('readline');
const { parse } = require('./command-parser');
const { run } = require('./action-router');

const HELP = `
HTX OTC 任务闭环 Agent CLI

  新增   task add "标题" --due "2026-07-25 18:00" [--remind "..."] [--p0|--p1] [--ws "主线"] [--next "..."] [--output "..."]
  完成   task done T-0001 [--result "结果"] [--follow "后续任务" --follow-due "..."]
  延期   task postpone T-0001 --to "2026-07-28 18:00" [--reason "..."]
  删除   task delete T-0001   （二次确认；--yes 跳过但会记录警告）
  进度   task progress T-0001 60
  下一步 task next T-0001 "下一步动作"
  查询   task today | task pending-output | task list
  阻塞   task block "描述" 或 task block T-0005 "描述"

也支持中文自然语言，例如：
  task "新增任务 确认设计排期 截止 7月28日 P0"
  task "完成 T-0001 结果:已提交设计团队"
`.trim();

function confirmDelete(task) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`⚠️  确认删除 ${task.id}「${task.title}」？此操作不可恢复，请再次输入任务 ID 确认： `, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === task.id);
    });
  });
}

async function main() {
  const intent = parse(process.argv.slice(2));
  if (intent.action === 'help') {
    console.log(HELP);
    return;
  }
  if (intent.action === 'error') {
    console.error(`❌ ${intent.message}`);
    process.exit(2);
  }
  try {
    const output = await run(intent, { confirm: confirmDelete });
    console.log(output);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

main();
