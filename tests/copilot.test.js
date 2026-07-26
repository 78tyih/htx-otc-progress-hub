#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  routeConversation,
  resolveTask,
  patchFromRequest,
  buildPlan,
} = require('../api/_lib/copilot');

function task(overrides) {
  return {
    id: 'T-0006',
    title: 'Michael Zhang 渠道首笔提款测试',
    status: '进行中',
    progress: 10,
    priority: 4,
    owner: 'Sera',
    dueAt: '2026-07-27T18:00:00+08:00',
    nextAction: '跟进首笔提款',
    dependencies: [],
    archivedAt: null,
    ...overrides,
  };
}

const tasks = [
  task(),
  task({
    id: 'T-0007',
    title: '确认设计团队排期',
    status: '待启动',
    progress: 0,
    priority: 3,
    dueAt: '2026-07-29T18:00:00+08:00',
    nextAction: '联系设计团队确认排期',
  }),
];

assert.strictEqual(resolveTask('T-0006 现在怎么样', tasks, null).id, 'T-0006');
assert.strictEqual(resolveTask('确认设计团队排期进度到20%', tasks, null).id, 'T-0007');
assert.strictEqual(resolveTask('进度到30%', tasks, 'T-0006').id, 'T-0006');

let result = routeConversation(
  'T-0006 进度到30%，下一步联系 Michael 确认首笔提款时间',
  tasks,
  null,
  Date.parse('2026-07-26T12:00:00Z')
);
assert.strictEqual(result.kind, 'update');
assert.deepStrictEqual(result.confirm.patch, {
  progress: 30,
  nextAction: '联系 Michael 确认首笔提款时间',
});
assert.strictEqual(result.contextTaskId, 'T-0006');

result = routeConversation(
  '确认设计团队排期已经开始推进，进度20%',
  tasks,
  null,
  Date.parse('2026-07-26T12:00:00Z')
);
assert.strictEqual(result.confirm.patch.status, '进行中');
assert.strictEqual(result.confirm.patch.progress, 20);

result = routeConversation('T-0006 已完成', tasks, null, Date.now());
assert.strictEqual(result.confirm.patch.status, '已完成');
assert.strictEqual(result.confirm.patch.progress, 100);
assert.strictEqual(result.confirm.needsEvidence, true);

result = routeConversation('进度到40%', tasks, null, Date.now());
assert.strictEqual(result.kind, 'clarify');

const requestPatch = patchFromRequest({
  patch: { progress: 35, nextAction: '继续跟进', owner: '不应被接受' },
}, tasks[0]);
assert.deepStrictEqual(requestPatch.patch, { progress: 35, nextAction: '继续跟进' });

const plan = buildPlan(tasks, Date.parse('2026-07-26T12:00:00Z'));
assert.strictEqual(plan.kind, 'plan');
assert.ok(plan.reply.includes('T-0006'));
assert.ok(plan.taskIds.length > 0);

console.log('COPILOT: PASS');
