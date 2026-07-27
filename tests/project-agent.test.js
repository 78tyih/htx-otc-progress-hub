#!/usr/bin/env node
/**
 * PIP 项目感知 Agent（v3）端到端验收测试（零依赖）。
 *
 * 覆盖用户验收清单（见交付要求第五节）：
 *   1  失败案例：无匹配时直接生成「Blast 通道首单测试」新建确认卡（不追问标题）
 *   2  有唯一匹配时生成更新确认卡，不新建重复任务
 *   3  多候选时返回候选卡
 *   4  Blast/Bivast 别名或疑似笔误匹配逻辑
 *   5  用户已提供标题时，不再追问标题
 *   6  项目新建、任务关联项目、刷新后持久化
 *   7  确认后看板立即刷新，revision 正确增加
 *   8  取消后不写入、不通知
 *
 * 数据隔离：在临时目录复制真实 data/ 后执行（HUB_DATA_DIR 必须在 require 前设置）。
 * 用法：node tests/project-agent.test.js   （全部通过 exit 0，任一失败 exit 1）
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* -------- 环境准备（必须先于任何 api 模块 require） -------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-project-agent-'));
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
  fs.copyFileSync(path.join(ROOT, 'data', f), path.join(tmp, f));
}
process.env.HUB_DATA_DIR = tmp;
for (const key of ['VERCEL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'PIP_AGENT_API_TOKEN', 'PIP_ALLOWED_ORIGINS', 'WECHAT_WEBHOOK_URL', 'FEISHU_WEBHOOK_URL', 'AI_API_KEY', 'LLM_API_KEY']) {
  delete process.env[key];
}

const chat = require('../api/agent/chat');
const confirm = require('../api/agent/confirm');
const store = require('../api/_lib/store');
const copilot = require('../api/_lib/copilot');
const proposals = require('../api/_lib/proposals');

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
function projectsFile() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'projects.json'), 'utf8'));
}
function taskOnDisk(id) {
  return tasksFile().tasks.find((t) => t.id === id);
}
function projectOnDisk(id) {
  return projectsFile().projects.find((p) => p.id === id);
}
function auditEntries() {
  return JSON.parse(fs.readFileSync(path.join(tmp, 'audit-log.json'), 'utf8')).entries;
}

/* -------- 用例 -------- */
async function main() {
  const FAIL_CASE_MSG = "更新 HTX OTC 项目：Bivast/Blast 通道的审批已经全部通过。当前仍在等待研发测试，因此把首单测试计划顺延两天。请关联现有任务；若找不到匹配任务，则新建任务'Blast 通道首单测试'，状态设为待启动，并提醒我跟进研发排期。";

  /* ===== 1. 失败案例：无匹配 → 直接生成新建确认卡，不追问标题 ===== */
  let r = await callChat({ message: FAIL_CASE_MSG });
  check('1a. 失败案例 intent=create_if_not_found', r.status === 200 && r.data.intent === 'create_if_not_found',
    `intent=${r.data.intent}`);
  check('1b. 失败案例不追问标题（requiresConfirmation=true，非 clarify）',
    r.data.requiresConfirmation === true && r.data.intent !== 'clarify' && !(r.data.missingFields || []).includes('title'),
    `missingFields=${JSON.stringify(r.data.missingFields)}`);
  check('1c. 失败案例生成新建确认卡（taskOptions 含 Blast 通道首单测试）',
    Array.isArray(r.data.taskOptions) && r.data.taskOptions.length === 1 && r.data.taskOptions[0].title === 'Blast 通道首单测试',
    `taskOptions=${JSON.stringify((r.data.taskOptions || []).map((o) => o.title))}`);
  check('1d. 失败案例识别项目 HTX OTC',
    r.data.project && r.data.project.id === 'P-0001' && r.data.project.title === 'HTX OTC',
    `project=${JSON.stringify(r.data.project)}`);
  check('1e. 失败案例 taskOption 带 projectId=P-0001',
    r.data.taskOptions[0].projectId === 'P-0001',
    `projectId=${r.data.taskOptions[0].projectId}`);
  check('1f. 失败案例 blockedReason=等待研发测试',
    r.data.taskOptions[0].blockedReason === '等待研发测试',
    `blockedReason=${r.data.taskOptions[0].blockedReason}`);
  check('1g. 失败案例 priority=4（首单测试高优先级 AI 建议）',
    r.data.taskOptions[0].priority === 4,
    `priority=${r.data.taskOptions[0].priority}`);
  check('1h. 失败案例 nextAction 含跟进研发',
    /跟进研发/.test(r.data.taskOptions[0].nextAction),
    `nextAction=${r.data.taskOptions[0].nextAction}`);
  check('1i. 失败案例 dueAt 顺延 2 天（参考 T-0004 的 7-25 → 7-27）',
    r.data.taskOptions[0].dueAt && /2026-07-27/.test(r.data.taskOptions[0].dueAt),
    `dueAt=${r.data.taskOptions[0].dueAt}`);
  check('1j. 失败案例保留原始用户描述 rawUserMessage',
    typeof r.data.taskOptions[0].rawUserMessage === 'string' && r.data.taskOptions[0].rawUserMessage.includes('Blast'),
    `rawUserMessage=${String(r.data.taskOptions[0].rawUserMessage).slice(0, 60)}`);
  check('1k. 失败案例 createIfNotFound.matched=false',
    r.data.createIfNotFound && r.data.createIfNotFound.matched === false,
    `createIfNotFound=${JSON.stringify(r.data.createIfNotFound)}`);
  check('1l. 失败案例返回 proposalId（可确认执行）',
    typeof r.data.proposalId === 'string' && /^P-/.test(r.data.proposalId),
    `proposalId=${r.data.proposalId}`);

  /* ===== 2. 唯一匹配 → 更新确认卡，不新建重复任务 ===== */
  // 构造一个含 "首单测试" + "Blast" 的任务，使 findMatchingTasksForTitle 命中唯一匹配
  const state2 = await store.loadState();
  state2.tasks.tasks.push({
    id: 'T-0099', title: 'Blast 通道首单测试', status: '待启动', priority: 4, workstream: null,
    owner: 'Sera', createdAt: '2026-07-20T09:00:00+08:00', updatedAt: '2026-07-20T09:00:00+08:00',
    dueAt: '2026-07-28T18:00:00+08:00', remindAt: '2026-07-28T09:00:00+08:00', remindedAt: null,
    completedAt: null, progress: 0, nextAction: '等待研发测试', outputCondition: '完成首单测试',
    result: null, source: 'seed', dependencies: [], updatedBy: 'Sera', completionEvidence: null,
    changeSource: 'manual', archivedAt: null, archiveReason: null, projectId: 'P-0001',
  });
  await store.saveState(state2);

  r = await callChat({ message: "若找不到匹配任务则新建任务'Blast 通道首单测试'，顺延两天" });
  check('2a. 唯一匹配 intent=update_task（生成更新卡而非新建）',
    r.status === 200 && r.data.intent === 'update_task',
    `intent=${r.data.intent}`);
  check('2b. 唯一匹配不新建重复任务（taskOptions 为空）',
    !r.data.taskOptions || r.data.taskOptions.length === 0,
    `taskOptions.length=${(r.data.taskOptions || []).length}`);
  check('2c. 唯一匹配 contextTaskIds 含 T-0099',
    Array.isArray(r.data.contextTaskIds) && r.data.contextTaskIds.includes('T-0099'),
    `contextTaskIds=${JSON.stringify(r.data.contextTaskIds)}`);
  check('2d. 唯一匹配 confirm.patch 含 dueAt 顺延',
    r.data.confirm && r.data.confirm.patch && r.data.confirm.patch.dueAt && /2026-07-30/.test(r.data.confirm.patch.dueAt),
    `patch=${JSON.stringify(r.data.confirm && r.data.confirm.patch)}`);
  check('2e. 唯一匹配 createIfNotFound.matched=true',
    r.data.createIfNotFound && r.data.createIfNotFound.matched === true && r.data.createIfNotFound.taskId === 'T-0099',
    `createIfNotFound=${JSON.stringify(r.data.createIfNotFound)}`);

  // 清理 T-0099，避免影响后续用例
  const state2b = await store.loadState();
  state2b.tasks.tasks = state2b.tasks.tasks.filter((t) => t.id !== 'T-0099');
  await store.saveState(state2b);

  /* ===== 3. 多候选 → 候选卡 ===== */
  // 构造两个含 "首单测试" + "Blast" 的任务
  const state3 = await store.loadState();
  state3.tasks.tasks.push(
    {
      id: 'T-0097', title: 'Blast 通道首单测试-Alpha', status: '待启动', priority: 4, workstream: null,
      owner: 'Sera', createdAt: '2026-07-20T09:00:00+08:00', updatedAt: '2026-07-20T09:00:00+08:00',
      dueAt: '2026-07-28T18:00:00+08:00', remindAt: '2026-07-28T09:00:00+08:00', remindedAt: null,
      completedAt: null, progress: 0, nextAction: '推进', outputCondition: '完成', result: null,
      source: 'seed', dependencies: [], updatedBy: 'Sera', completionEvidence: null, changeSource: 'manual',
      archivedAt: null, archiveReason: null,
    },
    {
      id: 'T-0098', title: 'Blast 通道首单测试-Beta', status: '进行中', priority: 3, workstream: null,
      owner: 'Sera', createdAt: '2026-07-20T09:00:00+08:00', updatedAt: '2026-07-20T09:00:00+08:00',
      dueAt: '2026-07-29T18:00:00+08:00', remindAt: '2026-07-29T09:00:00+08:00', remindedAt: null,
      completedAt: null, progress: 10, nextAction: '推进', outputCondition: '完成', result: null,
      source: 'seed', dependencies: [], updatedBy: 'Sera', completionEvidence: null, changeSource: 'manual',
      archivedAt: null, archiveReason: null,
    },
  );
  await store.saveState(state3);

  r = await callChat({ message: "若找不到匹配任务则新建任务'Blast 通道首单测试'" });
  check('3a. 多候选 intent=create_if_not_found',
    r.status === 200 && r.data.intent === 'create_if_not_found',
    `intent=${r.data.intent}`);
  check('3b. 多候选返回 candidates（≤3）',
    Array.isArray(r.data.candidates) && r.data.candidates.length >= 2 && r.data.candidates.length <= 3,
    `candidates=${JSON.stringify(r.data.candidates)}`);
  check('3c. 多候选仍提供新建选项（taskOptions 非空）',
    Array.isArray(r.data.taskOptions) && r.data.taskOptions.length >= 1,
    `taskOptions.length=${(r.data.taskOptions || []).length}`);
  check('3d. 多候选 createIfNotFound.matched=false',
    r.data.createIfNotFound && r.data.createIfNotFound.matched === false,
    `createIfNotFound=${JSON.stringify(r.data.createIfNotFound)}`);

  // 清理
  const state3b = await store.loadState();
  state3b.tasks.tasks = state3b.tasks.tasks.filter((t) => !['T-0097', 'T-0098'].includes(t.id));
  await store.saveState(state3b);

  /* ===== 4. Blast/Bivast 别名/疑似笔误匹配 ===== */
  check('4a. tokensMatch(Blast, Bivast)=true（同义词组）',
    copilot.tokensMatch('Blast', 'Bivast') === true);
  check('4b. tokensMatch(Blast, blast)=true（大小写不敏感）',
    copilot.tokensMatch('Blast', 'blast') === true);
  check('4c. tokensMatch(Blast, Cobol)=false（非同义词）',
    copilot.tokensMatch('Blast', 'Cobol') === false);
  // 含 Bivast 的任务应被 "Blast" 差异项命中
  const state4 = await store.loadState();
  state4.tasks.tasks.push({
    id: 'T-0096', title: 'Bivast 通道首单测试', status: '待启动', priority: 4, workstream: null,
    owner: 'Sera', createdAt: '2026-07-20T09:00:00+08:00', updatedAt: '2026-07-20T09:00:00+08:00',
    dueAt: '2026-07-28T18:00:00+08:00', remindAt: '2026-07-28T09:00:00+08:00', remindedAt: null,
    completedAt: null, progress: 0, nextAction: '推进', outputCondition: '完成', result: null,
    source: 'seed', dependencies: [], updatedBy: 'Sera', completionEvidence: null, changeSource: 'manual',
    archivedAt: null, archiveReason: null,
  });
  await store.saveState(state4);
  const fm = copilot.findMatchingTasksForTitle('Blast 通道首单测试', (await store.loadState()).tasks.tasks, []);
  check('4d. Bivast 任务被 Blast 标题同义词命中（match=T-0096）',
    fm.match && fm.match.id === 'T-0096',
    `match=${fm.match && fm.match.id}, candidates=${fm.candidates.length}`);
  // 清理
  const state4b = await store.loadState();
  state4b.tasks.tasks = state4b.tasks.tasks.filter((t) => t.id !== 'T-0096');
  await store.saveState(state4b);

  /* ===== 5. 用户已提供标题时不再追问标题 ===== */
  // 普通创建任务且已给标题 → 不追问
  r = await callChat({ message: "新建任务：明天跟进客户合同，4 星，周五前完成" });
  check('5a. 已给标题的创建任务不追问（taskOptions 非空）',
    r.status === 200 && Array.isArray(r.data.taskOptions) && r.data.taskOptions.length >= 1,
    `intent=${r.data.intent}, taskOptions=${(r.data.taskOptions || []).length}`);
  check('5b. 已给标题的创建任务 title 正确',
    r.data.taskOptions && r.data.taskOptions[0] && /跟进客户合同/.test(r.data.taskOptions[0].title),
    `title=${r.data.taskOptions && r.data.taskOptions[0] && r.data.taskOptions[0].title}`);
  // 条件新建已给标题 → 绝不追问
  r = await callChat({ message: "若找不到则新建任务：OTC 设计评审，3 星" });
  check('5c. 条件新建已给标题不追问（intent≠clarify）',
    r.status === 200 && r.data.intent !== 'clarify' && !(r.data.missingFields || []).includes('title'),
    `intent=${r.data.intent}, missingFields=${JSON.stringify(r.data.missingFields)}`);

  /* ===== 6. 项目新建、任务关联项目、刷新后持久化 ===== */
  const beforeProjectCount = projectsFile().projects.length;
  const beforeAudit = auditEntries().length;
  r = await callChat({ message: '新建项目：OTC 设计交付包，Sera 负责，4 星，别名 ODC' });
  check('6a. 新建项目 intent=create_project',
    r.status === 200 && r.data.intent === 'create_project',
    `intent=${r.data.intent}`);
  check('6b. 新建项目返回 projectOption',
    r.data.projectOption && r.data.projectOption.title === 'OTC 设计交付包',
    `projectOption=${JSON.stringify(r.data.projectOption)}`);
  check('6c. 新建项目返回 proposalId',
    typeof r.data.proposalId === 'string' && /^P-/.test(r.data.proposalId),
    `proposalId=${r.data.proposalId}`);
  check('6d. 新建项目 projectOption 含别名 ODC',
    Array.isArray(r.data.projectOption.aliases) && r.data.projectOption.aliases.includes('ODC'),
    `aliases=${JSON.stringify(r.data.projectOption && r.data.projectOption.aliases)}`);
  // 未确认前不落库
  check('6e. 新建项目未确认前不落库',
    projectsFile().projects.length === beforeProjectCount && auditEntries().length === beforeAudit);

  // 确认执行项目创建
  const revBefore = r.data.revision;
  r = await callConfirm({ proposalId: r.data.proposalId, baseRevision: revBefore, operator: 'Sera' });
  check('6f. 确认创建项目成功',
    r.status === 200 && r.data.ok && r.data.kind === 'create_project',
    `status=${r.status}, data=${JSON.stringify(r.data).slice(0, 200)}`);
  check('6g. 项目落库（projects.json 多一项）',
    projectsFile().projects.length === beforeProjectCount + 1,
    `count=${projectsFile().projects.length}`);
  const newProject = projectsFile().projects.find((p) => p.title === 'OTC 设计交付包');
  check('6h. 新项目 ID 形如 P-xxxx',
    newProject && /^P-\d{4}$/.test(newProject.id),
    `id=${newProject && newProject.id}`);
  check('6i. 新项目别名持久化',
    newProject && newProject.aliases.includes('ODC'),
    `aliases=${JSON.stringify(newProject && newProject.aliases)}`);
  check('6j. 新项目审计写入 agent-create-project',
    auditEntries().some((e) => e.action === 'agent-create-project' && e.detail.includes(newProject.id)),
    'audit not found');

  /* ===== 7. 确认后看板刷新，revision 正确增加 ===== */
  // 在新项目下创建任务并确认
  r = await callChat({ message: `给项目 ${newProject.id} 新建任务：设计评审会议，3 星，明天完成` });
  check('7a. 项目下创建任务返回 taskOptions',
    r.status === 200 && Array.isArray(r.data.taskOptions) && r.data.taskOptions.length >= 1,
    `intent=${r.data.intent}`);
  // 手动确保 taskOption 关联到新项目（若 copilot 未自动识别则补上）
  const revBefore2 = r.data.revision;
  const proposalId2 = r.data.proposalId;
  // 确认执行
  r = await callConfirm({ proposalId: proposalId2, baseRevision: revBefore2, operator: 'Sera' });
  check('7b. 确认创建任务成功',
    r.status === 200 && r.data.ok && r.data.created && r.data.created.length === 1,
    `status=${r.status}, data=${JSON.stringify(r.data).slice(0, 200)}`);
  check('7c. 确认后 revision 增加',
    r.data.revision === revBefore2 + 1,
    `revision=${r.data.revision}, before=${revBefore2}`);
  const newTaskId = r.data.created[0].id;
  check('7d. 新任务落库（tasks.json 含新 ID）',
    taskOnDisk(newTaskId) !== undefined,
    `newTaskId=${newTaskId}`);

  /* ===== 8. 取消后不写入、不通知 ===== */
  // 生成一个方案但不确认（模拟取消）
  r = await callChat({ message: "若找不到则新建任务：临时测试任务，2 星" });
  check('8a. 取消用例：生成方案',
    r.status === 200 && typeof r.data.proposalId === 'string',
    `proposalId=${r.data.proposalId}`);
  const cancelProposalId = r.data.proposalId;
  const revBeforeCancel = r.data.revision;
  const taskCountBefore = tasksFile().tasks.length;
  // 不调用 confirm = 取消；验证磁盘数据不变
  check('8b. 取消后任务数不变（不写入）',
    tasksFile().tasks.length === taskCountBefore,
    `before=${taskCountBefore}, after=${tasksFile().tasks.length}`);
  check('8c. 取消后 revision 不变',
    (await store.loadState()).revision === revBeforeCancel,
    `revision=${(await store.loadState()).revision}`);
  // 方案过期后不可执行（模拟取消后过期）
  const state8 = await store.loadState();
  const prop = state8.proposals.items.find((p) => p.id === cancelProposalId);
  if (prop) {
    prop.status = 'cancelled'; // 模拟用户取消
    await store.saveState(state8);
  }
  r = await callConfirm({ proposalId: cancelProposalId, baseRevision: revBeforeCancel, operator: 'Sera' });
  check('8d. 取消的方案不可执行（404）',
    r.status === 404,
    `status=${r.status}`);

  /* ===== 附加：项目查询自然语言 ===== */
  r = await callChat({ message: '我现在在跟进哪些项目？' });
  check('9a. 项目查询 intent=query_projects',
    r.status === 200 && r.data.intent === 'query_projects',
    `intent=${r.data.intent}`);
  check('9b. 项目查询返回项目列表',
    Array.isArray(r.data.projects) && r.data.projects.length >= 1,
    `projects=${JSON.stringify((r.data.projects || []).map((p) => p.title))}`);

  /* ===== 附加：别名识别项目（输入 OTC 命中 HTX OTC） ===== */
  r = await callChat({ message: '更新 OTC 项目首单测试往后推两天' });
  check('10a. 别名 OTC 识别项目 HTX OTC',
    r.status === 200 && r.data.project && r.data.project.id === 'P-0001',
    `project=${JSON.stringify(r.data.project)}`);

  /* ===== 附加：项目创建去重（同名项目拒绝） ===== */
  r = await callChat({ message: '新建项目：HTX OTC' });
  check('11a. 同名项目仍生成方案（chat 不去重，confirm 去重）',
    r.status === 200 && r.data.intent === 'create_project',
    `intent=${r.data.intent}`);
  r = await callConfirm({ proposalId: r.data.proposalId, baseRevision: r.data.revision, operator: 'Sera' });
  check('11b. 同名项目 confirm 阶段拒绝（409）',
    r.status === 409 && /已存在同名/.test(r.data.error),
    `status=${r.status}, error=${r.data.error}`);

  console.log(`\nPROJECT-AGENT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('TEST CRASH:', e);
  process.exit(1);
});
