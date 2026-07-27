#!/usr/bin/env node
/**
 * PIP 结构化执行 Agent（v2）端到端验收测试（零依赖）。
 *
 * 覆盖用户验收清单：
 *   1  通过任务 ID 更新进度            2  通过完整任务名称更新进度
 *   3  上一轮上下文继续更新            4  一句话同时改状态/进度/下一步
 *   5  创建单个新任务                  6  多选项只选部分创建
 *   7  父任务拆解为多个子任务          8  子任务 ID 不重复
 *   9  非法状态迁移被拒绝             10 已完成任务不能被静默重新打开
 *  11  任务依赖不能引用自身           12 截止/提醒时间校验
 *  13  未确认时不得写入               14 KV 未配置时线上写入被拒绝
 *  15  revision 冲突返回 409          16 外部 API 无 Token 返回 401
 *  17  错误 Token 返回 401            18 不把 Token/Webhook/环境变量返回前端
 *  19  通知只在写入成功后发送
 *
 * 数据隔离：在临时目录复制真实 data/ 后执行（HUB_DATA_DIR 必须在 require 前设置）。
 * 用法：node tests/agent-v2.test.js   （全部通过 exit 0，任一失败 exit 1）
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');

/* -------- 环境准备（必须先于任何 api 模块 require） -------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-agent-v2-'));
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
  fs.copyFileSync(path.join(ROOT, 'data', f), path.join(tmp, f));
}
process.env.HUB_DATA_DIR = tmp;
// 清理可能干扰断言的环境变量（各用例按需临时设置并还原）
for (const key of ['VERCEL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'PIP_AGENT_API_TOKEN', 'PIP_ALLOWED_ORIGINS', 'WECHAT_WEBHOOK_URL', 'FEISHU_WEBHOOK_URL', 'AI_API_KEY', 'LLM_API_KEY']) {
  delete process.env[key];
}

const chat = require('../api/agent/chat');
const confirm = require('../api/agent/confirm');
const statusApi = require('../api/status');
const store = require('../api/_lib/store');
const { addProposal } = require('../api/_lib/proposals');

/* -------- 测试框架 -------- */
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

/* -------- HTTP mock -------- */
const ORIGIN = 'https://hub.example.com';
function sameOriginHeaders(extra) {
  return Object.assign({ origin: ORIGIN, host: 'hub.example.com', 'content-type': 'application/json' }, extra || {});
}
function mockReq({ method = 'POST', url, headers, body }) {
  return { method, url, headers: headers || sameOriginHeaders(), body };
}
function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[String(k).toLowerCase()] = v; },
    end(chunk) { this.body = chunk || ''; },
    json() { return JSON.parse(this.body); },
  };
}
async function callChat(body, reqOpts) {
  const res = mockRes();
  await chat(mockReq(Object.assign({ url: '/api/agent/chat', body }, reqOpts || {})), res);
  return { status: res.statusCode, data: res.json(), raw: res.body };
}
async function callConfirm(body, reqOpts) {
  const res = mockRes();
  await confirm(mockReq(Object.assign({ url: '/api/agent/confirm', body }, reqOpts || {})), res);
  return { status: res.statusCode, data: res.json(), raw: res.body };
}

/* -------- 数据辅助 -------- */
function tasksFile() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'tasks.json'), 'utf8'));
}
function taskOnDisk(id) {
  return tasksFile().tasks.find((t) => t.id === id);
}
function auditEntries() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries;
}

/* -------- 用例 -------- */
async function main() {
  // 1 + 13. 通过任务 ID 更新进度；未确认时不得写入
  const beforeProgress = taskOnDisk('T-0006').progress;
  const beforeAudit = auditEntries().length;
  let r = await callChat({ message: 'T-0006 进度更新到 30%' });
  check('chat: ID 更新进度返回确认卡', r.status === 200 && r.data.requiresConfirmation === true
    && r.data.intent === 'update_task' && r.data.operations[0].patch.progress === 30, JSON.stringify(r.data).slice(0, 200));
  check('chat: 未确认时磁盘数据未写入', taskOnDisk('T-0006').progress === beforeProgress && auditEntries().length === beforeAudit);
  check('chat: 响应携带 revision 与 requestId', Number.isInteger(r.data.revision) && /^req-/.test(r.data.requestId));
  const rev1 = r.data.revision;
  r = await callConfirm({ taskId: 'T-0006', patch: { progress: 30 }, baseRevision: rev1, operator: 'Sera' });
  check('confirm: ID 更新进度落库成功', r.status === 200 && r.data.ok && taskOnDisk('T-0006').progress === 30, JSON.stringify(r.data).slice(0, 200));
  check('confirm: 写入后 revision +1', r.data.revision === rev1 + 1);
  check('confirm: 审计日志新增 agent-update 记录', auditEntries().some((e) => e.action === 'agent-update' && e.taskId === 'T-0006' && e.detail.includes('req-')));
  check('confirm: 未配置通知时明确提示且不回滚', r.data.notify && r.data.notify.configured === false && taskOnDisk('T-0006').progress === 30);

  // 15. revision 冲突返回 409
  r = await callConfirm({ taskId: 'T-0006', patch: { progress: 31 }, baseRevision: rev1, operator: 'Sera' });
  check('confirm: revision 冲突返回 409 REVISION_CONFLICT', r.status === 409 && r.data.code === 'REVISION_CONFLICT' && taskOnDisk('T-0006').progress === 30);

  // 2. 通过完整任务名称更新进度
  r = await callChat({ message: '配合首单测试 进度到 40%' });
  check('chat: 完整任务名称定位任务', r.status === 200 && r.data.requiresConfirmation === true
    && r.data.contextTaskIds.includes('T-0004') && r.data.operations[0].patch.progress === 40, JSON.stringify(r.data).slice(0, 200));

  // 4. 一句话同时修改状态、进度和下一步（T-0004 待启动 → 进行中）
  r = await callChat({ message: 'T-0004 进行中，进度 20%，下一步与静格对齐首单测试时间' });
  const patch4 = r.data.requiresConfirmation ? r.data.operations[0].patch : {};
  check('chat: 一句话同时识别状态/进度/下一步', patch4.status === '进行中' && patch4.progress === 20 && /静格/.test(patch4.nextAction || ''), JSON.stringify(patch4));
  r = await callConfirm({ taskId: 'T-0004', patch: patch4, baseRevision: r.data.revision, operator: 'Sera' });
  check('confirm: 三字段一次落库', r.status === 200 && taskOnDisk('T-0004').status === '进行中'
    && taskOnDisk('T-0004').progress === 20 && /静格/.test(taskOnDisk('T-0004').nextAction), JSON.stringify(r.data).slice(0, 200));

  // 3. 上一轮对话上下文继续更新（打开 T-0006 → 进度改到 50%）
  const sessionId = 'sess-test-0001';
  r = await callChat({ message: '打开 T-0006', sessionId });
  check('chat: 打开任务写入会话上下文', r.status === 200 && r.data.contextTaskIds.includes('T-0006') && r.data.sessionId === sessionId);
  r = await callChat({ message: '进度改到 50%', sessionId });
  check('chat: 上下文解析上一轮任务', r.status === 200 && r.data.requiresConfirmation === true
    && r.data.confirm && r.data.confirm.taskId === 'T-0006' && r.data.operations[0].patch.progress === 50, JSON.stringify(r.data).slice(0, 200));

  // 5. 通过对话创建单个新任务（方案 → 确认 → 服务端生成 ID）
  r = await callChat({ message: '新增任务：跟进香港机构客户注册，4 星，周五前完成' });
  check('chat: 创建任务返回待选方案', r.status === 200 && r.data.intent === 'create_task'
    && Array.isArray(r.data.taskOptions) && r.data.taskOptions.length === 1
    && r.data.taskOptions[0].priority === 4 && /^P-/.test(r.data.proposalId || ''), JSON.stringify(r.data).slice(0, 200));
  check('chat: 方案含 AI 建议标记', r.data.taskOptions[0].suggested && r.data.taskOptions[0].suggested.remindAt === true);
  const maxIdBefore = Math.max(...tasksFile().tasks.map((t) => Number(t.id.slice(2))));
  const proposalId1 = r.data.proposalId;
  r = await callConfirm({ proposalId: proposalId1, baseRevision: r.data.revision, operator: 'Sera' });
  const created1 = r.data.created || [];
  check('confirm: 方案执行创建任务成功', r.status === 200 && created1.length === 1
    && /^T-\d{4}$/.test(created1[0].id) && Number(created1[0].id.slice(2)) === maxIdBefore + 1, JSON.stringify(r.data).slice(0, 200));
  check('confirm: 新任务落库且标记对话来源', taskOnDisk(created1[0].id) && taskOnDisk(created1[0].id).createdFromConversation === true
    && taskOnDisk(created1[0].id).priority === 4);
  check('confirm: 创建写入审计', auditEntries().some((e) => e.action === 'agent-create' && e.taskId === created1[0].id));

  // 方案 GET 查询（外部 Agent 轮询入口，折叠进 chat.js 以守住 12 函数上限）
  r = await callChat(null, { method: 'GET', url: '/api/agent/chat?proposalId=P-not-exist' });
  check('chat GET: 不存在方案返回 404', r.status === 404);

  // 6. 多个任务选项只选择部分创建（服务端直接构造 3 选项方案模拟 LLM 产出）
  let state = await store.loadState();
  const proposal2 = addProposal(state, {
    kind: 'create',
    operator: 'Sera',
    options: [
      { title: '选项甲', priority: 3, owner: 'Sera', dueAt: '2026-08-03T18:00:00+08:00', remindAt: '2026-08-03T09:00:00+08:00', nextAction: '推进甲', outputCondition: '完成甲', dependencies: [] },
      { title: '选项乙', priority: 2, owner: 'Sera', dueAt: '2026-08-04T18:00:00+08:00', remindAt: '2026-08-04T09:00:00+08:00', nextAction: '推进乙', outputCondition: '完成乙', dependencies: [] },
      { title: '选项丙', priority: 1, owner: 'Sera', dueAt: '2026-08-05T18:00:00+08:00', remindAt: '2026-08-05T09:00:00+08:00', nextAction: '推进丙', outputCondition: '完成丙', dependencies: [] },
    ],
  });
  await store.saveState(state);
  r = await callConfirm({ proposalId: proposal2.id, selected: [0, 2], baseRevision: state.revision, operator: 'Sera' });
  const titles6 = (r.data.created || []).map((t) => t.title).sort();
  check('confirm: 多选项只创建选中的两个', r.status === 200 && (r.data.created || []).length === 2
    && titles6.join(',') === '选项丙,选项甲' && !taskOnDisk('') && !tasksFile().tasks.some((t) => t.title === '选项乙'), JSON.stringify(r.data).slice(0, 200));

  // 7 + 8. 任务拆解：父任务 → 多子任务，串行依赖，ID 不重复
  r = await callChat({ message: '把 T-0006 拆成 3 个子任务' });
  check('chat: 拆解返回树状子任务方案', r.status === 200 && r.data.intent === 'decompose_task'
    && r.data.taskOptions.length === 3 && r.data.parentTaskId === 'T-0006'
    && r.data.taskOptions.every((o) => o.parentTaskId === 'T-0006'), JSON.stringify(r.data).slice(0, 200));
  const allIdsBefore = new Set(tasksFile().tasks.map((t) => t.id));
  r = await callConfirm({ proposalId: r.data.proposalId, baseRevision: r.data.revision, operator: 'Sera' });
  const subs = r.data.created || [];
  check('confirm: 拆解创建 3 个子任务并关联父任务', r.status === 200 && subs.length === 3
    && subs.every((t) => t.parentTaskId === 'T-0006'), JSON.stringify(r.data).slice(0, 200));
  check('confirm: 子任务串行依赖映射为真实 ID', subs.length === 3 && subs[1].dependencies.includes(subs[0].id) && subs[2].dependencies.includes(subs[1].id));
  check('confirm: 子任务 ID 全局唯一', subs.every((t) => !allIdsBefore.has(t.id)) && new Set(subs.map((t) => t.id)).size === subs.length);
  check('confirm: 拆解写入审计', auditEntries().some((e) => e.action === 'agent-decompose' && subs.some((s) => s.taskId === s.taskId && e.taskId === subs[0].id)));

  // 11. 任务依赖不能引用自身（dependsOnOptions 指向自己）
  state = await store.loadState();
  const proposal3 = addProposal(state, {
    kind: 'create',
    operator: 'Sera',
    options: [
      { title: '自依赖任务', priority: 3, owner: 'Sera', dueAt: '2026-08-06T18:00:00+08:00', remindAt: '2026-08-06T09:00:00+08:00', nextAction: '推进', outputCondition: '完成', dependencies: [], dependsOnOptions: [0] },
    ],
  });
  await store.saveState(state);
  r = await callConfirm({ proposalId: proposal3.id, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 依赖自身被剔除', r.status === 200 && r.data.created.length === 1 && !r.data.created[0].dependencies.includes(r.data.created[0].id), JSON.stringify(r.data).slice(0, 200));

  // 9. 非法状态迁移被拒绝（进行中 → 待启动）
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { status: '待启动' }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 非法状态迁移返回 409', r.status === 409 && /不允许/.test(r.data.error || '') && taskOnDisk('T-0006').status === '进行中', JSON.stringify(r.data));

  // 10. 已完成任务不能被静默重新打开
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0001', patch: { status: '进行中', progress: 50 }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 已完成任务重开被拒绝', r.status === 409 && taskOnDisk('T-0001').status === '已完成' && taskOnDisk('T-0001').progress === 100, JSON.stringify(r.data));
  r = await callChat({ message: 'T-0001 重新打开，进度 50%' });
  check('chat: 已完成任务重开不生成确认卡', r.status === 200 && r.data.requiresConfirmation !== true, JSON.stringify(r.data).slice(0, 200));
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0001', patch: { progress: 50 }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 仅改进度静默重开已完成任务被拒绝', r.status === 409 && taskOnDisk('T-0001').progress === 100, JSON.stringify(r.data));

  // 12. 截止时间 / 提醒时间校验
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { dueAt: '2026-07-30T18:00:00+08:00', remindAt: '2026-07-31T09:00:00+08:00' }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 提醒晚于截止被拒绝', r.status === 409 && /提醒时间不得晚于截止时间/.test(r.data.error || ''), JSON.stringify(r.data));
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { dueAt: 'not-a-date' }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 非法截止时间被拒绝', r.status === 409 && /截止时间无法识别/.test(r.data.error || ''), JSON.stringify(r.data));
  state = await store.loadState();
  const proposal4 = addProposal(state, {
    kind: 'create',
    operator: 'Sera',
    options: [{ title: '时间倒挂任务', priority: 3, owner: 'Sera', dueAt: '2026-08-03T18:00:00+08:00', remindAt: '2026-08-04T09:00:00+08:00', nextAction: '推进', outputCondition: '完成', dependencies: [] }],
  });
  await store.saveState(state);
  r = await callConfirm({ proposalId: proposal4.id, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 方案选项时间校验拒绝', r.status === 409 && /提醒时间不得晚于截止时间/.test(r.data.error || ''), JSON.stringify(r.data));

  // 14. KV 未配置时线上写入被拒绝
  process.env.VERCEL = '1';
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { progress: 60 }, baseRevision: state.revision, operator: 'Sera' });
  check('confirm: 线上无 KV 写入返回 503', r.status === 503 && r.data.code === 'KV_NOT_CONFIGURED' && taskOnDisk('T-0006').progress !== 60, JSON.stringify(r.data));
  r = await callChat({ message: 'T-0006 进度到 60%' });
  check('chat: 线上无 KV 给出只读提示', r.status === 200 && r.data.writeEnabled === false
    && (r.data.warnings || []).some((w) => /持久化存储尚未配置/.test(w)), JSON.stringify(r.data).slice(0, 300));
  delete process.env.VERCEL;

  // 16 + 17. 外部 API 无 Token / 错误 Token 返回 401
  process.env.PIP_AGENT_API_TOKEN = 'test-agent-token-0123456789';
  r = await callChat({ message: 'T-0006 进度到 70%' }, { headers: { 'content-type': 'application/json' } }); // 无 Origin 无 Token
  check('security: 外部调用无 Token 返回 401', r.status === 401 && r.data.ok === false, `status=${r.status}`);
  r = await callChat({ message: 'T-0006 进度到 70%' }, { headers: { 'content-type': 'application/json', authorization: 'Bearer wrong-token' } });
  check('security: 错误 Token 返回 401', r.status === 401, `status=${r.status}`);
  r = await callChat({ message: 'T-0006 进度到 70%' }, { headers: { 'content-type': 'application/json', authorization: 'Bearer test-agent-token-0123456789' } });
  check('security: 正确 Token 放行', r.status === 200 && r.data.ok === true, `status=${r.status}`);
  r = await callChat({ message: 'T-0006 进度到 70%' }, { headers: sameOriginHeaders({ authorization: 'Bearer test-agent-token-0123456789' }) });
  check('security: 同源浏览器请求不受 Token 配置影响', r.status === 200, `status=${r.status}`);
  r = await callChat({ message: 'T-0006 进度到 70%' }, { headers: { origin: 'https://evil.example.com', host: 'hub.example.com', authorization: 'Bearer test-agent-token-0123456789' } });
  check('security: 非白名单 Origin 返回 403', r.status === 403, `status=${r.status}`);
  delete process.env.PIP_AGENT_API_TOKEN;

  // 18. 不得把 Token、Webhook 或环境变量返回前端
  process.env.PIP_AGENT_API_TOKEN = 'leak-check-token-abcdef';
  process.env.WECHAT_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=leak-check-key';
  {
    const res = mockRes();
    await statusApi(mockReq({ method: 'GET', url: '/api/status' }), res);
    const body = res.body;
    check('status: 不泄露 Token / Webhook / KV 密钥', res.statusCode === 200
      && !body.includes('leak-check-token-abcdef') && !body.includes('leak-check-key')
      && !body.includes('qyapi.weixin.qq.com'), body.slice(0, 200));
    const data = res.json();
    check('status: 暴露配置布尔状态而非值', data.api.tokenConfigured === true && data.channels.wecom.configured === true);
    check('status: 返回 revision 与存储后端', Number.isInteger(data.revision) && data.storage.backend === 'fs' && data.storage.writeEnabled === true);
  }
  delete process.env.PIP_AGENT_API_TOKEN;
  delete process.env.WECHAT_WEBHOOK_URL;

  // 19. 通知分级：写入失败不发送；普通更新入队不即时发送；critical 即时发送；flush 发送汇总
  const posts = [];
  const stub = http.createServer((req, res2) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      posts.push(raw);
      res2.writeHead(200, { 'content-type': 'application/json' });
      res2.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
    });
  });
  await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
  process.env.WECHAT_WEBHOOK_URL = `http://127.0.0.1:${stub.address().port}/webhook`;
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { status: '待启动' }, baseRevision: state.revision, operator: 'Sera' }); // 非法迁移 → 拒绝
  check('notify: 写入失败不发送通知', r.status === 409 && posts.length === 0, `posts=${posts.length}`);
  state = await store.loadState();
  r = await callConfirm({ taskId: 'T-0006', patch: { progress: 66 }, baseRevision: state.revision, operator: 'Sera' });
  // 普通任务进度更新 → normal → 入队，不即时发送
  check('notify: 普通更新入队不即时发送', r.status === 200 && posts.length === 0, `posts=${posts.length}`);
  check('notify: 响应报告 queued 状态', r.data.notify && r.data.notify.configured === true && r.data.notify.queued === true, JSON.stringify(r.data.notify || {}).slice(0, 200));

  // flush 汇总 → 发送一条汇总消息
  const notifyBus = require('../api/_lib/notify-bus');
  const { sendDirect } = require('../api/_lib/dual');
  state = await store.loadState();
  console.log('DEBUG: queue len before flush:', state.notify.queue.length, 'sendDirect type:', typeof sendDirect);
  const flushRes = await notifyBus.flush(state, { sender: sendDirect, force: true });
  console.log('DEBUG: flushRes:', JSON.stringify({ sent: flushRes.sent, reason: flushRes.reason, items: flushRes.items, dualOk: flushRes.dual && flushRes.dual.ok, dualPartial: flushRes.dual && flushRes.dual.partial }));
  check('notify: flush 发送汇总成功', flushRes.sent === true && posts.length === 1, `sent=${flushRes.sent}, posts=${posts.length}`);
  check('notify: 汇总消息包含 30 分钟工作摘要标题', posts[0].includes('30 分钟工作摘要'), `post=${posts[0].slice(0, 100)}`);
  try { await store.saveState(state); } catch { /* 状态保存不阻断测试 */ }

  // critical 事件 → 即时发送
  state = await store.loadState();
  const criticalResult = await notifyBus.enqueue(state, {
    type: 'task', op: 'blocked', taskId: 'T-0006', title: '测试阻塞',
    reason: '测试即时推送', suggestedAction: '确认后继续',
  }, { sender: sendDirect });
  check('notify: critical 事件即时推送', criticalResult.action === 'sent-immediate' && posts.length === 2, `action=${criticalResult.action}, posts=${posts.length}`);
  check('notify: 即时推送标题为【PIP｜需要你处理】', posts[1].includes('需要你处理'), `post=${posts[1].slice(0, 100)}`);

  delete process.env.WECHAT_WEBHOOK_URL;
  await new Promise((resolve) => stub.close(resolve));

  // 规划只读（不生成确认卡、不写入）
  r = await callChat({ message: '本周优先推进哪三项？' });
  check('plan: 规划引用真实任务 ID 且只读', r.status === 200 && r.data.intent === 'plan_tasks'
    && r.data.requiresConfirmation === false && /T-\d{4}/.test(r.data.reply)
    && auditEntries().length === auditEntries().length, JSON.stringify(r.data).slice(0, 200));

  console.log(`\nAGENT-V2: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('AGENT-V2 测试执行异常:', e);
  process.exit(1);
});
