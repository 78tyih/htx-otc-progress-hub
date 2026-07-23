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
function todo() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'todo.json'), 'utf8'));
}
function pipeline() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'pipeline.json'), 'utf8'));
}
function weeklyLog() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'weekly-log.json'), 'utf8'));
}

const baseAudit = auditCount();

// 1. 结构化新增
let r = run(['add', '输出 7 月 CRIB 复盘', '--due', '2026-07-31 18:00', '--remind', '2026-07-30 09:00', '--stars', '3', '--ws', '周报 / CRIB 复盘', '--next', '汇总 pipeline 产出', '--output', 'CRIB 复盘归档 docs/']);
check('add: 结构化新增成功', r.code === 0 && /T-\d{4}/.test(r.out), r.out);
const added = tasks().find((t) => t.title === '输出 7 月 CRIB 复盘');
check('add: 字段完整（dueAt/remindAt/nextAction/outputCondition）',
  !!added && added.dueAt.startsWith('2026-07-31T18:00') && added.remindAt.startsWith('2026-07-30T09:00') && added.nextAction === '汇总 pipeline 产出' && added.outputCondition === 'CRIB 复盘归档 docs/');
check('add: 结构化解析 3 星优先级', added.priority === 3);
check('sync: 新增后 todo.json 已投影（待启动→Next）', todo().some((t) => t.task === '输出 7 月 CRIB 复盘' && t.status === 'Next' && t.due === '2026-07-31'));
check('sync: 新增后 pipeline.json 已生成镜像卡片', pipeline().some((p) => p.mirrorOf === added.id && p.module === '输出 7 月 CRIB 复盘' && p.status === 'Next'));

// 2. 自然语言新增
r = run(['新增任务 确认设计排期 截止 7月28日 4星 主线 设计交付包']);
check('add: 自然语言新增成功', r.code === 0 && /T-\d{4}/.test(r.out), r.out);
const nl = tasks().find((t) => t.title === '确认设计排期');
check('add: 自然语言解析 4 星与截止时间', !!nl && nl.priority === 4 && nl.dueAt.startsWith('2026-07-28T18:00'));

// 3. 进度（待启动 → 进行中 自动迁移）
r = run(['progress', 'T-0004', '10']);
check('progress: 更新成功', r.code === 0, r.out);
check('progress: 待启动自动转为进行中', task('T-0004').status === '进行中' && task('T-0004').progress === 10);

// 3b. 进度 100 → 待输出（具备结果输出条件）
r = run(['progress', 'T-0004', '100']);
check('progress: 100% 自动转为待输出', r.code === 0 && task('T-0004').status === '待输出' && task('T-0004').progress === 100, r.out);

// 4. 下一步（T-0001/T-0002 已完成，不可更新；T-0004 待输出，可更新）
r = run(['next', 'T-0004', '与静格对齐首单测试时间']);
check('next: 更新成功', r.code === 0 && task('T-0004').nextAction === '与静格对齐首单测试时间', r.out);

// 5. 完成 + 结果 + 后续任务
r = run(['done', 'T-0001', '--result', '交付包已提交设计团队', '--follow', '确认设计团队排期', '--follow-due', '2026-07-28 18:00']);
check('done: 完成成功', r.code === 0 && task('T-0001').status === '已完成' && task('T-0001').completedAt !== null, r.out);
check('done: 结果已记录', task('T-0001').result === '交付包已提交设计团队');
check('done: 后续任务已创建', tasks().some((t) => t.title === '确认设计团队排期' && t.dueAt.startsWith('2026-07-28')));
check('sync: 完成后 todo.json 置 Done', todo().some((t) => t.task === '提交设计交付包' && t.status === 'Done'));
check('sync: 完成后 weekly-log 含该任务完成条目（结果文案随数据演进，按标题匹配）', weeklyLog().done.some((d) => d.startsWith('完成「提交设计交付包」')));
const weeklyLenAfterDone = weeklyLog().done.length;

// 6. 延期
r = run(['postpone', 'T-0004', '--to', '2026-07-28 18:00', '--reason', '等待确认']);
check('postpone: 已延期且截止时间更新', r.code === 0 && task('T-0004').status === '已延期' && task('T-0004').dueAt.startsWith('2026-07-28'), r.out);
check('sync: 延期后 todo.json 截止日已更新', todo().some((t) => t.task === '配合首单测试' && t.due === '2026-07-28' && t.status === 'Next'));

// 7. 阻塞（带任务）
const blockersBefore = blockers().length;
r = run(['block', 'T-0005', '大数据名单待确认']);
check('block: 任务标记阻塞并写入 blockers.json', r.code === 0 && task('T-0005').status === '阻塞' && blockers().includes('大数据名单待确认') && blockers().length === blockersBefore + 1, r.out);
check('sync: 阻塞后 todo.json 置 Blocked', todo().some((t) => t.task === '获取大数据名单' && t.status === 'Blocked'));

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
check('sync: 删除后 todo.json 与 pipeline 镜像同步移除', !todo().some((t) => t.task === '确认设计排期') && !pipeline().some((p) => p.mirrorOf === delTarget.id));
check('delete: 审计含删除快照', JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries.some((e) => e.action === 'delete' && e.taskId === delTarget.id && e.detail.includes('快照')));

// 12. 删除（输入错误 ID，应取消）
const keep = task('T-0002');
r = run(['delete', 'T-0002'], 'WRONG\n');
check('delete: 错误确认取消删除', r.code === 0 && /已取消/.test(r.out) && !!task('T-0002'), r.out);

// 12b. 归档：已完成任务可直接归档（reason 可选）
r = run(['archive', 'T-0002']);
check('archive: 已完成任务归档成功', r.code === 0 && !!task('T-0002').archivedAt, r.out);
check('archive: 归档后退出 todo 投影', !todo().some((t) => t.task === '高价值客户筛选'));
check('archive: 重复归档被拒绝', run(['archive', 'T-0002']).code !== 0);

// 12c. 归档：未完成且未过截止时间不可归档（自建未逾期任务，不依赖种子数据 ID）
r = run(['add', '未逾期归档测试', '--due', '2026-08-15 18:00']);
const naId = (r.out.match(/T-\d{4}/) || [])[0];
r = run(['archive', naId, '--reason', '测试']);
check('archive: 未完成未逾期拒绝归档', r.code !== 0 && /不能归档/.test(r.out), r.out);

// 12d. 归档：未完成逾期任务必须填原因
r = run(['add', '逾期归档测试', '--due', '2026-07-20 18:00']);
const odId = (r.out.match(/T-\d{4}/) || [])[0];
r = run(['archive', odId]);
check('archive: 未完成归档缺原因被拒绝', r.code !== 0 && /必须填写原因/.test(r.out), r.out);
r = run(['archive', odId, '--reason', '依赖未到位，本周不再推进']);
check('archive: 逾期任务带原因归档成功',
  r.code === 0 && !!task(odId).archivedAt && task(odId).archiveReason === '依赖未到位，本周不再推进', r.out);
check('archive: 归档写入审计', JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8'))
  .entries.some((e) => e.action === 'archive' && e.taskId === odId));

// 13. 非法迁移（已完成 → 更新进度，应拒绝）
r = run(['progress', 'T-0001', '50']);
check('状态机: 已完成任务拒绝进度更新', r.code !== 0 && /已完成/.test(r.out), r.out);

// 14. 全量 schema 校验
r = spawnSync('node', [VALIDATE], { env, encoding: 'utf8' });
check('validate: 全部操作后 schema 仍合法', r.status === 0 && /VALIDATE: PASS/.test(r.stdout || ''), r.stderr || r.stdout);

// 15. 审计日志随操作增长
check('audit: 每个写操作均有审计记录', auditCount() >= baseAudit + 10, `before=${baseAudit} after=${auditCount()}`);

// 15b. 展示层幂等：后续多次写操作后 weekly-log 不重复追加同一完成项
check('sync: weekly-log 完成项按标题去重（幂等）', weeklyLog().done.length === weeklyLenAfterDone, `after=${weeklyLenAfterDone} now=${weeklyLog().done.length}`);
// 15c. 策展条目不受镜像影响（人工维护的 pipeline 卡片保持原样）
check('sync: 人工策展的 pipeline 条目未被改动',
  pipeline().some((p) => p.module === '设计交付包' && p.pipGoal === '客户支持资料及跟进机制建设' && !p.mirrorOf) &&
  pipeline().filter((p) => p.mirrorOf).every((p) => tasks().some((t) => t.id === p.mirrorOf)));

// 16-22. Scheduler 企微提醒（webhook 桩在本进程内，须用异步 spawn 避免事件循环死锁）
(async () => {
  const http = require('http');
  const { spawn } = require('child_process');
  const WORKER = path.join(ROOT, 'scheduler', 'reminder-worker.js');
  const runWorkerSync = (args, extraEnv) => {
    const rr = spawnSync('node', [WORKER, ...args], { env: { ...env, ...(extraEnv || {}) }, encoding: 'utf8' });
    return { code: rr.status, out: (rr.stdout || '') + (rr.stderr || '') };
  };
  const runWorker = (args, extraEnv) =>
    new Promise((resolve) => {
      const p = spawn('node', [WORKER, ...args], { env: { ...env, ...(extraEnv || {}) } });
      let out = '';
      p.stdout.on('data', (d) => (out += d));
      p.stderr.on('data', (d) => (out += d));
      p.on('close', (code) => resolve({ code, out }));
    });

  // 构造到期提醒点：T-0004（postpone 后为已延期）与 T-0005（阻塞中）恢复为进行中模拟继续推进，remindAt 改到过去
  const tfile = path.join(tmp, 'tasks.json');
  const tdata = JSON.parse(fs.readFileSync(tfile, 'utf8'));
  for (const id of ['T-0004', 'T-0005']) {
    const tt = tdata.tasks.find((x) => x.id === id);
    tt.status = '进行中';
    tt.remindAt = '2020-01-01T09:00:00+08:00';
    tt.remindedAt = null;
  }
  fs.writeFileSync(tfile, JSON.stringify(tdata, null, 2) + '\n');

  // 16. scan 扫描（只读）
  let r2 = runWorkerSync(['scan']);
  check('reminder scan: 发现 2 项到期任务', r2.code === 0 && r2.out.includes('T-0004') && r2.out.includes('T-0005'), r2.out);
  check('reminder scan: 只读不写盘', task('T-0004').remindedAt === null);

  // 17. test 预览（不发送、不写盘）
  r2 = runWorkerSync(['test']);
  check('reminder test: 生成 markdown 预览', r2.code === 0 && /预览模式/.test(r2.out) && r2.out.includes('"msgtype": "markdown"') && r2.out.includes('T-0004'), r2.out);
  check('reminder test: 未标记 remindedAt', task('T-0004').remindedAt === null && task('T-0005').remindedAt === null);

  // 18. send 未明确确认 → 拒绝
  r2 = runWorkerSync(['send']);
  check('reminder send: 未 --confirm 拒绝发送', r2.code !== 0 && /拒绝发送/.test(r2.out), r2.out);

  // 19. send --confirm 经 HTTP 桩真实推送
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push(JSON.parse(body));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"errcode":0,"errmsg":"ok"}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const hookUrl = `http://127.0.0.1:${server.address().port}/cgi-bin/webhook/send?key=test`;
  r2 = await runWorker(['send', '--confirm'], { WECOM_WEBHOOK_URL: hookUrl });
  check('reminder send: 推送成功且 webhook 收到 POST', r2.code === 0 && received.length === 1, r2.out);
  check('reminder send: 消息体为 markdown 且含全部到期任务',
    received.length === 1 && received[0].msgtype === 'markdown' && received[0].markdown.content.includes('T-0004') && received[0].markdown.content.includes('T-0005'));
  check('reminder send: remindedAt 置位且状态迁移已提醒（含 阻塞→已提醒）',
    task('T-0004').status === '已提醒' && task('T-0004').remindedAt !== null && task('T-0005').status === '已提醒');
  check('reminder send: 审计写入 scheduler remind',
    JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries.filter((e) => e.actor === 'scheduler' && e.action === 'remind').length === 2);

  // 20. remindedAt 去重：再次推送无任务、无新 POST
  r2 = await runWorker(['send', '--confirm'], { WECOM_WEBHOOK_URL: hookUrl });
  check('reminder send: remindedAt 防重复推送', r2.code === 0 && /无到期未提醒/.test(r2.out) && received.length === 1, r2.out);
  server.close();

  // 21. 推送后全量 schema 仍合法
  r2 = spawnSync('node', [VALIDATE], { env, encoding: 'utf8' });
  check('validate: 提醒推送后 schema 仍合法', r2.status === 0 && /VALIDATE: PASS/.test(r2.stdout || ''), r2.stderr || r2.stdout);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nE2E: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(`FAIL: scheduler 测试异常 ${err && err.stack}`);
  process.exit(1);
});
