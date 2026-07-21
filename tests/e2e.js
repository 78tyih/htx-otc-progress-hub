#!/usr/bin/env node
/**
 * Agent CLI 端到端测试（零依赖）。
 * 在临时目录复制真实数据后执行，绝不触碰仓库内 data/。
 * 用法：node tests/e2e.js   （全部通过 exit 0，任一失败 exit 1）
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'agent', 'cli.js');
const VALIDATE = path.join(ROOT, 'agent', 'validate.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-e2e-'));
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
  fs.copyFileSync(path.join(ROOT, 'data', f), path.join(tmp, f));
}
const env = { ...process.env, HUB_DATA_DIR: tmp };

let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS: ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${name} ${extra}`);
  }
}

function run(args, input) {
  const r = spawnSync('node', [CLI, ...args], { env, encoding: 'utf8', input });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function tasks() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'tasks.json'), 'utf8')).tasks;
}
function task(id) {
  return tasks().find((t) => t.id === id);
}
function auditCount() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries.length;
}
function blockers() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'blockers.json'), 'utf8')).current;
}

const baseAudit = auditCount();

// 1. 结构化新增
let r = run(['add', '输出 7 月 CRIB 复盘', '--due', '2026-07-31 18:00', '--remind', '2026-07-30 09:00', '--p1', '--ws', '周报 / CRIB 复盘', '--next', '汇总 pipeline 产出', '--output', 'CRIB 复盘归档 docs/']);
check('add: 结构化新增成功', r.code === 0 && /T-\d{4}/.test(r.out), r.out);
const added = tasks().find((t) => t.title === '输出 7 月 CRIB 复盘');
check('add: 字段完整（dueAt/remindAt/nextAction/outputCondition）',
  !!added && added.dueAt.startsWith('2026-07-31T18:00') && added.remindAt.startsWith('2026-07-30T09:00') && added.nextAction === '汇总 pipeline 产出' && added.outputCondition === 'CRIB 复盘归档 docs/');

// 2. 自然语言新增
r = run(['新增任务 确认设计排期 截止 7月28日 P0 主线 设计交付包']);
check('add: 自然语言新增成功', r.code === 0 && /T-\d{4}/.test(r.out), r.out);
const nl = tasks().find((t) => t.title === '确认设计排期');
check('add: 自然语言解析 P0 与截止时间', !!nl && nl.priority === 'P0' && nl.dueAt.startsWith('2026-07-28T18:00'));

// 3. 进度（待启动 → 进行中 自动迁移）
r = run(['progress', 'T-0004', '10']);
check('progress: 更新成功', r.code === 0, r.out);
check('progress: 待启动自动转为进行中', task('T-0004').status === '进行中' && task('T-0004').progress === 10);

// 4. 下一步
r = run(['next', 'T-0002', '按清单逐个触达五星客户']);
check('next: 更新成功', r.code === 0 && task('T-0002').nextAction === '按清单逐个触达五星客户', r.out);

// 5. 完成 + 结果 + 后续任务
r = run(['done', 'T-0001', '--result', '交付包已提交设计团队', '--follow', '确认设计团队排期', '--follow-due', '2026-07-28 18:00']);
check('done: 完成成功', r.code === 0 && task('T-0001').status === '已完成' && task('T-0001').completedAt !== null, r.out);
check('done: 结果已记录', task('T-0001').result === '交付包已提交设计团队');
check('done: 后续任务已创建', tasks().some((t) => t.title === '确认设计团队排期' && t.dueAt.startsWith('2026-07-28')));

// 6. 延期
r = run(['postpone', 'T-0003', '--to', '2026-07-28 18:00', '--reason', '等待确认']);
check('postpone: 已延期且截止时间更新', r.code === 0 && task('T-0003').status === '已延期' && task('T-0003').dueAt.startsWith('2026-07-28'), r.out);

// 7. 阻塞（带任务）
const blockersBefore = blockers().length;
r = run(['block', 'T-0005', '大数据名单待确认']);
check('block: 任务标记阻塞并写入 blockers.json', r.code === 0 && task('T-0005').status === '阻塞' && blockers().includes('大数据名单待确认') && blockers().length === blockersBefore + 1, r.out);

// 8. 纯文本阻塞
r = run(['block', '设计团队排期待确认']);
check('block: 纯文本阻塞写入', r.code === 0 && blockers().includes('设计团队排期待确认'), r.out);

// 9. 今日到期
r = run(['today']);
check('today: 正常输出', r.code === 0 && /今日/.test(r.out), r.out);

// 10. 本周待输出
r = run(['pending-output']);
check('pending-output: 正常输出', r.code === 0 && /待输出|本周/.test(r.out), r.out);

// 11. 删除（二次确认，输入正确 ID）
const delTarget = tasks().find((t) => t.title === '确认设计排期');
r = run(['delete', delTarget.id], `${delTarget.id}\n`);
check('delete: 二次确认后删除成功', r.code === 0 && !tasks().some((t) => t.id === delTarget.id), r.out);
check('delete: 审计含删除快照', JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries.some((e) => e.action === 'delete' && e.taskId === delTarget.id && e.detail.includes('快照')));

// 12. 删除（输入错误 ID，应取消）
const keep = task('T-0002');
r = run(['delete', 'T-0002'], 'WRONG\n');
check('delete: 错误确认取消删除', r.code === 0 && /已取消/.test(r.out) && !!task('T-0002'), r.out);

// 13. 非法迁移（已完成 → 更新进度，应拒绝）
r = run(['progress', 'T-0001', '50']);
check('状态机: 已完成任务拒绝进度更新', r.code !== 0 && /已完成/.test(r.out), r.out);

// 14. 全量 schema 校验
r = spawnSync('node', [VALIDATE], { env, encoding: 'utf8' });
check('validate: 全部操作后 schema 仍合法', r.status === 0 && /VALIDATE: PASS/.test(r.stdout || ''), r.stderr || r.stdout);

// 15. 审计日志随操作增长
check('audit: 每个写操作均有审计记录', auditCount() >= baseAudit + 10, `before=${baseAudit} after=${auditCount()}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nE2E: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
