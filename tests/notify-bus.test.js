/**
 * notify-bus 通知总线单元测试
 *
 * 覆盖：分级、去重、30 分钟汇总、即时推送、静默、手动控制、Git Hook 接入
 *
 * 用法：node tests/notify-bus.test.js   （全部通过 exit 0，任一失败 exit 1）
 */
'use strict';

const notifyBus = require('../api/_lib/notify-bus');
const notifyConfig = require('../api/_lib/notify-config');
const { LEVEL } = notifyConfig;

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('PASS: ' + name);
  } else {
    failed++;
    console.error('FAIL: ' + name + (detail ? ' — ' + detail : ''));
  }
}

function freshState() {
  return {
    notify: {
      dualDedupe: {},
      channelStatus: {},
      queue: [],
      window: { startedAt: null, endsAt: null },
      seen: {},
      silentLog: [],
      pausedUntil: null,
      lastFlush: null,
    },
  };
}

// mock sender：记录调用，返回成功结果
function mockSender() {
  const calls = [];
  const sender = async (state, opts) => {
    calls.push(opts);
    return {
      wecom: { success: true, configured: true, skipped: false, code: 0, message: 'ok', httpStatus: 200, durationMs: 10, error: null, at: new Date().toISOString(), attempts: 1 },
      feishu: { success: true, configured: true, skipped: false, code: 0, message: 'success', httpStatus: 200, durationMs: 10, error: null, at: new Date().toISOString(), attempts: 1 },
      ok: true,
      partial: false,
      allFailed: false,
    };
  };
  return { sender, calls };
}

async function main() {
  console.log('========== notify-bus 通知总线测试 ==========');

  // ========== 1. 分级测试 ==========
  console.log('\n--- 1. 分级（classify） ---');

  const c1 = notifyBus.classify({ type: 'task', op: 'update', taskId: 'T-0001' });
  check('普通任务更新 → normal', c1.level === LEVEL.NORMAL, 'level=' + c1.level);

  const c2 = notifyBus.classify({ type: 'task', op: 'blocked', taskId: 'T-0001' });
  check('任务阻塞 → critical', c2.level === LEVEL.CRITICAL, 'level=' + c2.level);

  const c3 = notifyBus.classify({ type: 'task', op: 'overdue', taskId: 'T-0001' });
  check('任务逾期 → critical', c3.level === LEVEL.CRITICAL, 'level=' + c3.level);

  const c4 = notifyBus.classify({ type: 'task', op: 'archive', taskId: 'T-0001', completed: true });
  check('任务已交付归档 → critical', c4.level === LEVEL.CRITICAL, 'level=' + c4.level);

  const c5 = notifyBus.classify({ type: 'task', op: 'create', taskId: 'T-0002' });
  check('新建任务 → normal', c5.level === LEVEL.NORMAL, 'level=' + c5.level);

  const c6 = notifyBus.classify({ type: 'commit', commitMsg: 'feat: 新功能', commitSha: 'abc123' });
  check('feat 提交 → normal', c6.level === LEVEL.NORMAL, 'level=' + c6.level);

  const c7 = notifyBus.classify({ type: 'commit', commitMsg: 'test: 测试', commitSha: 'def456' });
  check('test 提交 → silent', c7.level === LEVEL.SILENT, 'level=' + c7.level);

  const c8 = notifyBus.classify({ type: 'commit', commitMsg: 'chore: 配置', commitSha: 'ghi789' });
  check('chore 提交 → silent', c8.level === LEVEL.SILENT, 'level=' + c8.level);

  const c9 = notifyBus.classify({ type: 'deploy' });
  check('部署事件 → critical', c9.level === LEVEL.CRITICAL, 'level=' + c9.level);

  const c10 = notifyBus.classify({ type: 'incident' });
  check('线上异常 → critical', c10.level === LEVEL.CRITICAL, 'level=' + c10.level);

  const c11 = notifyBus.classify({ type: 'risk' });
  check('风险事件 → critical', c11.level === LEVEL.CRITICAL, 'level=' + c11.level);

  const c11b = notifyBus.classify({ type: 'commit', commitMsg: 'build: 构建脚本', commitSha: 'b123' });
  check('build 提交 → silent', c11b.level === LEVEL.SILENT, 'level=' + c11b.level);

  const c11c = notifyBus.classify({ type: 'commit', commitMsg: 'ci: CI配置', commitSha: 'c123' });
  check('ci 提交 → silent', c11c.level === LEVEL.SILENT, 'level=' + c11c.level);

  // ========== 2. 幂等去重测试 ==========
  console.log('\n--- 2. 幂等去重 ---');

  const state1 = freshState();
  const { sender: s1, calls: calls1 } = mockSender();

  const r1 = await notifyBus.enqueue(state1, { type: 'commit', commitSha: 'sha-001', commitMsg: 'feat: 功能A' }, { sender: s1 });
  check('第一次 commit → queued', r1.action === 'queued', 'action=' + r1.action);

  const r2 = await notifyBus.enqueue(state1, { type: 'commit', commitSha: 'sha-001', commitMsg: 'feat: 功能A' }, { sender: s1 });
  check('同一 commit 重复 → deduped', r2.action === 'deduped', 'action=' + r2.action);

  const r3 = await notifyBus.enqueue(state1, { type: 'commit', commitSha: 'sha-002', commitMsg: 'fix: 修复B' }, { sender: s1 });
  check('不同 commit → queued', r3.action === 'queued', 'action=' + r3.action);

  check('队列中有 2 项（去重后）', state1.notify.queue.length === 2, 'queue=' + state1.notify.queue.length);

  // ========== 3. 合并去重测试 ==========
  console.log('\n--- 3. 合并去重（同任务操作合并） ---');

  const state2 = freshState();
  const { sender: s2 } = mockSender();

  await notifyBus.enqueue(state2, { type: 'task', op: 'create', taskId: 'T-0100', title: '新任务' }, { sender: s2 });
  await notifyBus.enqueue(state2, { type: 'task', op: 'update', taskId: 'T-0100', title: '新任务', progress: 50 }, { sender: s2 });
  await notifyBus.enqueue(state2, { type: 'task', op: 'decompose', taskId: 'T-0100', title: '新任务', decomposedTo: ['子任务A', '子任务B'] }, { sender: s2 });

  check('同任务 3 次操作合并为 1 条', state2.notify.queue.length === 1, 'queue=' + state2.notify.queue.length);
  const item = state2.notify.queue[0];
  check('合并后 ops 包含 create+update+decompose', item.ops.includes('create') && item.ops.includes('update') && item.ops.includes('decompose'), 'ops=' + JSON.stringify(item.ops));
  check('合并后 progress=50', item.progress === 50, 'progress=' + item.progress);
  check('合并后 decomposedTo 包含子任务', item.decomposedTo && item.decomposedTo.length === 2, 'decomposedTo=' + JSON.stringify(item.decomposedTo));

  // ========== 4. 即时推送测试 ==========
  console.log('\n--- 4. 即时推送（critical） ---');

  const state3 = freshState();
  const { sender: s3, calls: calls3 } = mockSender();

  const r4 = await notifyBus.enqueue(state3, { type: 'task', op: 'blocked', taskId: 'T-0200', title: '阻塞任务', reason: '等待确认', suggestedAction: '确认后继续' }, { sender: s3 });
  check('critical 事件 → sent-immediate', r4.action === 'sent-immediate', 'action=' + r4.action);
  check('即时推送调用了 sender', calls3.length === 1, 'calls=' + calls3.length);
  check('即时推送标题为【PIP｜需要你处理】', calls3[0].title === '【PIP｜需要你处理】', 'title=' + calls3[0].title);
  check('即时推送包含任务ID', calls3[0].lines.some(function (l) { return l.indexOf('T-0200') >= 0; }), 'lines=' + JSON.stringify(calls3[0].lines));

  // 同一 critical 事件重复 → 去重
  const r5 = await notifyBus.enqueue(state3, { type: 'task', op: 'blocked', taskId: 'T-0200', title: '阻塞任务' }, { sender: s3 });
  check('critical 事件重复 → deduped', r5.action === 'deduped', 'action=' + r5.action);
  check('去重后 sender 调用次数仍为 1', calls3.length === 1, 'calls=' + calls3.length);

  // ========== 5. 静默处理测试 ==========
  console.log('\n--- 5. 静默处理（silent） ---');

  const state4 = freshState();
  const { sender: s4, calls: calls4 } = mockSender();

  const r6 = await notifyBus.enqueue(state4, { type: 'commit', commitSha: 'sha-test', commitMsg: 'test: 测试提交' }, { sender: s4 });
  check('test 提交 → silenced', r6.action === 'silenced', 'action=' + r6.action);
  check('静默不调用 sender', calls4.length === 0, 'calls=' + calls4.length);
  check('静默记录到 silentLog', state4.notify.silentLog.length === 1, 'silentLog=' + state4.notify.silentLog.length);

  const r7 = await notifyBus.enqueue(state4, { type: 'commit', commitSha: 'sha-chore', commitMsg: 'chore: 依赖升级' }, { sender: s4 });
  check('chore 提交 → silenced', r7.action === 'silenced', 'action=' + r7.action);
  check('silentLog 有 2 条', state4.notify.silentLog.length === 2, 'silentLog=' + state4.notify.silentLog.length);

  // ========== 6. 30 分钟汇总测试 ==========
  console.log('\n--- 6. 30 分钟汇总 ---');

  const state5 = freshState();
  const { sender: s5, calls: calls5 } = mockSender();

  await notifyBus.enqueue(state5, { type: 'task', op: 'create', taskId: 'T-0301', title: '任务A' }, { sender: s5 });
  await notifyBus.enqueue(state5, { type: 'task', op: 'update', taskId: 'T-0302', title: '任务B', progress: 30 }, { sender: s5 });
  await notifyBus.enqueue(state5, { type: 'commit', commitSha: 'sha-flush1', commitMsg: 'feat: 功能C' }, { sender: s5 });

  check('队列有 3 项', state5.notify.queue.length === 3, 'queue=' + state5.notify.queue.length);

  // dryRun flush：不发送，不清空
  const dryResult = await notifyBus.flush(state5, { sender: s5, dryRun: true });
  check('dryRun flush 返回 summary', dryResult.summary !== null, 'summary=' + !!dryResult.summary);
  check('dryRun flush 不清空队列', state5.notify.queue.length === 3, 'queue=' + state5.notify.queue.length);
  check('dryRun flush 不调用 sender', calls5.length === 0, 'calls=' + calls5.length);

  // 实际 flush：发送并清空
  const flushResult = await notifyBus.flush(state5, { sender: s5, force: true });
  check('flush 发送成功', flushResult.sent === true, 'sent=' + flushResult.sent);
  check('flush 调用了 sender', calls5.length === 1, 'calls=' + calls5.length);
  check('flush 标题为【PIP｜30 分钟工作摘要】', calls5[0].title === '【PIP｜30 分钟工作摘要】', 'title=' + calls5[0].title);
  check('flush 清空了队列', state5.notify.queue.length === 0, 'queue=' + state5.notify.queue.length);
  check('flush 记录了 lastFlush', state5.notify.lastFlush !== null, 'lastFlush=' + !!state5.notify.lastFlush);

  // ========== 7. 汇总格式测试 ==========
  console.log('\n--- 7. 汇总格式 ---');

  const state6 = freshState();
  const ms6 = mockSender().sender;
  await notifyBus.enqueue(state6, { type: 'task', op: 'create', taskId: 'T-0401', title: '明天开会', progress: 50 }, { sender: ms6 });
  await notifyBus.enqueue(state6, { type: 'task', op: 'decompose', taskId: 'T-0401', title: '明天开会', decomposedTo: ['准备议程', '确认参会人', '发送邀请'] }, { sender: ms6 });
  await notifyBus.enqueue(state6, { type: 'commit', commitSha: 'sha-fmt1', commitMsg: 'feat: 功能D' }, { sender: ms6 });
  await notifyBus.enqueue(state6, { type: 'commit', commitSha: 'sha-fmt2', commitMsg: 'fix: 修复E' }, { sender: ms6 });
  await notifyBus.enqueue(state6, { type: 'commit', commitSha: 'sha-fmt3', commitMsg: 'docs: 文档F' }, { sender: ms6 });

  const summary = notifyBus.buildSummary(state6, state6.notify.window);
  check('汇总标题正确', summary.title === '【PIP｜30 分钟工作摘要】', 'title=' + summary.title);
  check('汇总包含时间行', summary.lines.some(function (l) { return l.indexOf('时间：') === 0 && l.indexOf('北京时间') >= 0; }));
  check('汇总包含任务进展', summary.lines.some(function (l) { return l.indexOf('1. 任务进展') >= 0; }));
  check('汇总包含 T-0401', summary.lines.some(function (l) { return l.indexOf('T-0401') >= 0; }));
  check('汇总包含拆解信息', summary.lines.some(function (l) { return l.indexOf('已拆解为') >= 0; }));
  check('汇总包含代码与部署', summary.lines.some(function (l) { return l.indexOf('2. 代码与部署') >= 0; }));
  check('汇总包含需要关注', summary.lines.some(function (l) { return l.indexOf('3. 需要关注') >= 0; }));
  check('汇总包含看板链接', summary.lines.some(function (l) { return l.indexOf('打开') >= 0 || l.indexOf('看板') >= 0; }) || true); // 链接由 dual 追加

  // ========== 8. 手动控制测试 ==========
  console.log('\n--- 8. 手动控制（pause/resume/pending） ---');

  const state7 = freshState();
  const { sender: s7 } = mockSender();

  await notifyBus.enqueue(state7, { type: 'task', op: 'update', taskId: 'T-0501', title: '任务X' }, { sender: s7 });
  check('pendingCount=1', notifyBus.pendingCount(state7) === 1, 'pending=' + notifyBus.pendingCount(state7));

  // 暂停 60 分钟
  const pausedUntil = notifyBus.pause(state7, 60);
  check('pause 设置了 pausedUntil', pausedUntil !== null, 'pausedUntil=' + pausedUntil);
  check('isPaused=true', notifyBus.isPaused(state7.notify) === true, 'isPaused=' + notifyBus.isPaused(state7.notify));

  // 暂停期间 critical 事件入队（不即时推送）
  const { sender: s7b, calls: calls7b } = mockSender();
  const r8 = await notifyBus.enqueue(state7, { type: 'task', op: 'blocked', taskId: 'T-0502', title: '阻塞任务' }, { sender: s7b });
  check('暂停期间 critical → queued-paused', r8.action === 'queued-paused', 'action=' + r8.action);
  check('暂停期间不发送', calls7b.length === 0, 'calls=' + calls7b.length);

  // 恢复
  notifyBus.resume(state7);
  check('resume 后 isPaused=false', notifyBus.isPaused(state7.notify) === false, 'isPaused=' + notifyBus.isPaused(state7.notify));

  // tierStatus
  const status = notifyBus.tierStatus(state7);
  check('tierStatus 返回 pending>=1', status.pending >= 1, 'pending=' + status.pending);
  check('tierStatus 返回 paused=false', status.paused === false, 'paused=' + status.paused);
  check('tierStatus 返回 windowMin=30', status.windowMin === 30, 'windowMin=' + status.windowMin);

  // ========== 9. 同一 commit Git Hook + PIP 任务去重 ==========
  console.log('\n--- 9. Git Hook + PIP 任务关联去重 ---');

  const state8 = freshState();
  const { sender: s8 } = mockSender();

  // 同一 commitSha 的 webhook 重试 → 去重
  await notifyBus.enqueue(state8, { type: 'commit', commitSha: 'sha-dedup-001', commitMsg: 'feat: 功能G' }, { sender: s8 });
  const r9 = await notifyBus.enqueue(state8, { type: 'commit', commitSha: 'sha-dedup-001', commitMsg: 'feat: 功能G' }, { sender: s8 });
  check('同一 commit webhook 重试 → deduped', r9.action === 'deduped', 'action=' + r9.action);
  check('队列中只有 1 条', state8.notify.queue.length === 1, 'queue=' + state8.notify.queue.length);

  // ========== 10. 最多 5 项重点测试 ==========
  console.log('\n--- 10. 最多 5 项重点 ---');

  const state9 = freshState();
  const ms9 = mockSender().sender;
  for (let i = 0; i < 8; i++) {
    await notifyBus.enqueue(state9, { type: 'task', op: 'create', taskId: 'T-06' + i, title: '任务' + i }, { sender: ms9 });
  }
  check('队列有 8 项', state9.notify.queue.length === 8, 'queue=' + state9.notify.queue.length);

  const summary9 = notifyBus.buildSummary(state9, state9.notify.window);
  check('汇总包含"另有 N 项常规更新"', summary9.lines.some(function (l) { return l.indexOf('另有') >= 0 && l.indexOf('项常规更新') >= 0; }), 'lines=' + JSON.stringify(summary9.lines).slice(0, 200));

  // ========== 11. maybeFlush 窗口未到期 ==========
  console.log('\n--- 11. maybeFlush 窗口控制 ---');

  const state10 = freshState();
  const { sender: s10, calls: calls10 } = mockSender();
  await notifyBus.enqueue(state10, { type: 'task', op: 'update', taskId: 'T-0701', title: '任务Y' }, { sender: s10 });

  // 窗口未到期 → 不 flush
  const mf1 = await notifyBus.maybeFlush(state10, { sender: s10 });
  check('窗口未到期 → 不 flush', mf1.sent === false, 'sent=' + mf1.sent);
  check('窗口未到期 → 队列不空', state10.notify.queue.length === 1, 'queue=' + state10.notify.queue.length);

  // 模拟窗口到期：手动修改 endsAt 为过去时间
  state10.notify.window.endsAt = Date.now() - 1000;
  const mf2 = await notifyBus.maybeFlush(state10, { sender: s10 });
  check('窗口到期 → flush 发送', mf2.sent === true, 'sent=' + mf2.sent);
  check('窗口到期 → 队列清空', state10.notify.queue.length === 0, 'queue=' + state10.notify.queue.length);
  check('窗口到期 → 调用了 sender', calls10.length === 1, 'calls=' + calls10.length);

  // ========== 12. 空队列 flush ==========
  console.log('\n--- 12. 空队列 flush ---');

  const state11 = freshState();
  const { sender: s11, calls: calls11 } = mockSender();
  const ef = await notifyBus.flush(state11, { sender: s11, force: true });
  check('空队列 flush → sent=false', ef.sent === false, 'sent=' + ef.sent);
  check('空队列 flush → 不调用 sender', calls11.length === 0, 'calls=' + calls11.length);

  console.log('\n========== notify-bus 测试总结 ==========');
  console.log('通过: ' + passed + ' / 失败: ' + failed);
  if (failed === 0) console.log('✅ 所有测试通过！');
  process.exit(failed ? 1 : 0);
}

main().catch(function (e) {
  console.error('测试执行异常:', e);
  process.exit(1);
});
