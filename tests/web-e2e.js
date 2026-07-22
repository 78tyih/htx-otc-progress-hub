/** 全链路验收脚本：dev-server + webhook 桩
 *
 * 运行方式（数据隔离，绝不触碰仓库内 data/）：
 *   1. TMP=$(mktemp -d) && cp data/*.json "$TMP"/
 *   2. node /tmp/webhook-stub.js            # 8399 端口，返回 errcode=0
 *   3. HUB_DATA_DIR="$TMP" PORT=8124 WECHAT_WEBHOOK_URL='http://127.0.0.1:8399/cgi-bin/webhook/send?key=test' \
 *      NOTIFY_WEBHOOK_URL='http://127.0.0.1:8399/webhook' node tests/dev-server.js
 *   4. HUB_DATA_DIR="$TMP" node tests/web-e2e.js
 */
'use strict';
const BASE = 'http://127.0.0.1:8124';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + JSON.stringify(extra).slice(0, 300) : ''}`); }
}
async function api(path, opts) {
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}
const post = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

(async () => {
  console.log('== 1. /api/status ==');
  const st = await api('/api/status');
  check('status 200', st.status === 200, st.text);
  check('agent 在线', st.json && st.json.agent && st.json.agent.online === true, st.json);
  check('webhook 已配置', st.json && st.json.webhook && st.json.webhook.configured === true, st.json);
  check('返回任务统计', st.json && st.json.stats && typeof st.json.stats.total === 'number' && typeof st.json.stats.completionRate === 'number', st.json);

  console.log('== 2. /api/tasks ==');
  const tk = await api('/api/tasks');
  check('tasks 200', tk.status === 200);
  check('返回任务数组', tk.json && Array.isArray(tk.json.tasks) && tk.json.tasks.length > 0);
  const first = tk.json.tasks[0];
  check('任务含六态判定', !!first.classification && !!first.classification.class, first);
  check('任务含必备字段', ['id', 'title', 'owner', 'status', 'priority', 'dueAt', 'dependencies', 'progress', 'updatedAt'].every((k) => k in first), first);

  console.log('== 3. Agent 查询（规则引擎）==');
  const q1 = await post('/api/agent/chat', { message: '哪些任务还没有完成？' });
  check('未完成查询 200', q1.status === 200, q1.text);
  check('返回任务列表', q1.json && q1.json.kind === 'list' && q1.json.reply.includes('T-'), q1.json);
  const q2 = await post('/api/agent/chat', { message: '哪些任务被阻塞？' });
  check('阻塞查询', q2.status === 200 && Array.isArray(q2.json.tasks) && q2.json.reply.includes('T-'), q2.json);
  const q3 = await post('/api/agent/chat', { message: '本周需要优先处理什么？' });
  check('本周优先级', q3.status === 200 && !!q3.json.reply, q3.json);
  const q4 = await post('/api/agent/chat', { message: '检查 Sera 的任务进度' });
  check('负责人进度', q4.status === 200 && !!q4.json.reply, q4.json);
  const q5 = await post('/api/agent/chat', { message: '当前哪些任务已经完成？' });
  check('已完成查询', q5.status === 200 && q5.json.kind === 'list', q5.json);
  const q6 = await post('/api/agent/chat', { message: '哪些任务已经逾期？' });
  check('逾期查询', q6.status === 200 && Array.isArray(q6.json.tasks), q6.json);
  const q7 = await post('/api/agent/chat', { message: '今日进度' });
  check('今日进度', q7.status === 200 && !!q7.json.reply, q7.json);

  console.log('== 4. Agent 状态变更 → 确认卡 ==');
  // 找一个可迁移到「已完成」的非终态任务（待启动/进行中/已提醒/待输出）
  const doing = tk.json.tasks.find((t) => ['待启动', '进行中', '已提醒', '待输出'].includes(t.status));
  check('存在可推进任务', !!doing);
  const u1 = await post('/api/agent/chat', { message: `把 ${doing.id} 标记为已完成` });
  check('返回确认卡', u1.status === 200 && u1.json.kind === 'update' && u1.json.confirm, u1.json);
  check('确认卡含 taskId/newStatus', u1.json.confirm.taskId === doing.id && u1.json.confirm.newStatus === '已完成', u1.json.confirm);
  check('确认文案', u1.json.reply.includes('确认把') && u1.json.reply.includes(doing.id), u1.json.reply);

  console.log('== 5. 确认执行 → 数据更新 + webhook ==');
  const before = (await api('/api/tasks')).json.tasks.find((t) => t.id === doing.id);
  const c1 = await post('/api/agent/confirm', { taskId: doing.id, newStatus: '已完成', operator: 'Sera', evidence: '全链路测试交付物' });
  check('confirm 200', c1.status === 200, c1.text);
  check('confirm ok', c1.json && c1.json.ok === true, c1.json);
  check('记录 previousStatus', c1.json.previousStatus === doing.status, c1.json);
  check('触发 webhook 成功', c1.json.notify && c1.json.notify.ok === true, c1.json.notify);
  const after = (await api('/api/tasks')).json.tasks.find((t) => t.id === doing.id);
  check('状态已更新为已完成', after.status === '已完成', after);
  check('updatedBy=Sera', after.updatedBy === 'Sera', after);
  check('completionEvidence 已记录', after.completionEvidence === '全链路测试交付物', after);
  check('updatedAt 已刷新', after.updatedAt !== before.updatedAt);
  check('completedAt 已置位', !!after.completedAt);

  console.log('== 6. 状态机守卫 ==');
  const bad = await post('/api/agent/confirm', { taskId: doing.id, newStatus: '待启动', operator: 'Sera' });
  check('非法迁移被拒 409', bad.status === 409, bad);

  console.log('== 7. /api/notify/test 诊断 ==');
  const nt = await post('/api/notify/test', { operator: 'Sera' });
  check('notify/test 200', nt.status === 200, nt.text);
  check('webhook ok', nt.json && nt.json.ok === true, nt.json);
  check('含 HTTP 状态码', nt.json.httpStatus === 200, nt.json);
  check('含响应耗时', typeof nt.json.durationMs === 'number', nt.json);
  check('含请求时间', !!nt.json.requestedAt, nt.json);
  check('含最近成功时间', !!nt.json.lastSuccessAt, nt.json);

  console.log('== 7b. /api/notifications/wecom/test 诊断 ==');
  const wt = await post('/api/notifications/wecom/test', { operator: 'Sera' });
  check('wecom/test 200', wt.status === 200, wt.text);
  check('wecom 发送成功', wt.json && wt.json.ok === true, wt.json);
  check('wecom HTTP 状态码 200', wt.json.httpStatus === 200, wt.json);
  check('wecom errcode=0', wt.json.errcode === 0, wt.json);
  check('wecom errmsg=ok', wt.json.errmsg === 'ok', wt.json);
  check('wecom 含响应耗时', typeof wt.json.durationMs === 'number', wt.json);
  check('wecom 含最近成功时间', !!wt.json.lastSuccessAt, wt.json);
  const wtGet = await api('/api/notifications/wecom/test');
  check('wecom/test GET 被拒 405', wtGet.status === 405, wtGet);

  console.log('== 8. 防重复 ==');
  const d1 = await post('/api/agent/confirm', { taskId: doing.id, newStatus: '已完成', operator: 'Sera' });
  check('重复 confirm noop', d1.status === 200 && d1.json.noop === true, d1.json);

  console.log('== 9. webhook 桩收到 payload ==');
  const fs = require('fs');
  const log = fs.existsSync('/tmp/hub-webhook-log.jsonl') ? fs.readFileSync('/tmp/hub-webhook-log.jsonl', 'utf8').trim().split('\n') : [];
  check('桩收到 ≥3 条推送', log.length >= 3, log.length);
  const bodies = log.map((l) => JSON.parse(l));
  const generic = bodies.filter((l) => l.body && l.body.event);
  const wecomMsgs = bodies.filter((l) => l.body && l.body.msgtype === 'markdown');
  if (generic.length) {
    const last = generic[generic.length - 1];
    const p = last.body;
    check('通用 payload 结构完整', ['event', 'title', 'message', 'taskId', 'taskName', 'operator', 'timestamp', 'dashboardUrl'].every((k) => k in p), p);
    const evts = generic.map((l) => l.body.event);
    check('含 task_status_changed', evts.includes('task_status_changed'), evts);
    check('含 test_notification', evts.includes('test_notification'), evts);
  } else {
    check('通用 payload 存在', false, bodies.length);
  }
  check('收到企微 msgtype markdown 推送', wecomMsgs.length >= 1, bodies.map((l) => l.body && l.body.msgtype));
  if (wecomMsgs.length) {
    const content = wecomMsgs[wecomMsgs.length - 1].body.markdown.content;
    check('测试消息含看板标题', content.includes('【HTX OTC PIP 看板】'), content.slice(0, 120));
    check('测试消息含交付进度', content.includes('OTC 设计交付包：已交付') && content.includes('设计团队交互包：已传回品牌技能包'), content.slice(0, 200));
    check('测试消息含发送时间', /发送时间：\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(content), content.slice(-80));
  }

  console.log('== 10. 展示层同步 ==');
  const dataDir = process.env.HUB_DATA_DIR || require('path').join(__dirname, '..', 'data');
  const todo = JSON.parse(fs.readFileSync(require('path').join(dataDir, 'todo.json'), 'utf8'));
  check('todo.json 已投影完成态', todo.some((r) => r.task === doing.title && r.status === 'Done'));

  console.log('== 11. 每周总结与复盘 API ==');
  const q8 = await post('/api/agent/chat', { message: '生成上周复盘' });
  check('PIP 意图识别 weeklyGenerate', q8.status === 200 && q8.json.weeklyGenerate === true && q8.json.kind === 'weekly-generate', q8.json);
  const g0 = await api('/api/weekly/generate');
  check('weekly/generate GET 被拒 405', g0.status === 405, g0);
  const wl0 = await post('/api/weekly/list', {});
  check('weekly/list POST 被拒 405', wl0.status === 405, wl0);

  const wg = await post('/api/weekly/generate', { operator: 'Sera' });
  check('generate 200', wg.status === 200, wg.text);
  check('generate ok 且为草稿', wg.json && wg.json.ok === true && wg.json.review && wg.json.review.status === 'draft', wg.json);
  const rv = wg.json.review;
  check('generatedBy=pip-assistant', rv.generatedBy === 'pip-assistant', rv.generatedBy);
  // 默认 weekStart = 上一自然周周一（与服务端同一 +08:00 墙钟算法）
  const shNow = new Date(Date.now() + 8 * 3600000);
  const prevW = new Date(shNow.getTime() - 7 * 86400000);
  const expStart = new Date(prevW.getTime() - ((prevW.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
  check('默认生成上一自然周（周一起始）', rv.weekStart === expStart && rv.weekEnd > rv.weekStart, { got: rv.weekStart, exp: expStart });
  check('含七板块字段', ['summary', 'completedTasks', 'deferredTasks', 'problems', 'improvements', 'nextWeekPriorities', 'metricSnapshot'].every((k) => k in rv), Object.keys(rv));
  check('completedTaskIds 与 completedTasks 一致', Array.isArray(rv.completedTaskIds) && rv.completedTaskIds.length === rv.completedTasks.length, rv.completedTaskIds);
  check('metricSnapshot 含 8 项数值指标', ['completedThisWeek', 'uncompleted', 'newBlocked', 'unblocked', 'highValueCustomer', 'registration', 'kyc', 'firstOrder'].every((k) => typeof rv.metricSnapshot[k] === 'number'), rv.metricSnapshot);
  check('下周重点含负责人与预期字段', rv.nextWeekPriorities.every((n) => 'owner' in n && 'expected' in n && 'dueAt' in n), rv.nextWeekPriorities[0]);

  const wl = await api('/api/weekly/list');
  check('list 200 且含该复盘', wl.status === 200 && wl.json.ok && wl.json.reviews.some((r) => r.id === rv.id), wl.json);

  const wu = await post('/api/weekly/update', { id: rv.id, operator: 'Sera', patch: { summary: '人工修订后的概览', improvements: [{ area: '数据记录', note: '完成证据填写更及时', action: '每日下班前核对' }] } });
  check('update 200', wu.status === 200, wu.text);
  check('summary 已更新', wu.json.review.summary === '人工修订后的概览', wu.json.review.summary);
  check('improvements 已更新', wu.json.review.improvements.length === 1 && wu.json.review.improvements[0].area === '数据记录', wu.json.review.improvements);
  const wuBad = await post('/api/weekly/update', { id: rv.id, patch: { improvements: '不是数组' } });
  check('非法 patch 被拒 400', wuBad.status === 400, wuBad);

  const wc = await post('/api/weekly/confirm', { id: rv.id, operator: 'Sera' });
  check('confirm 200 且已归档', wc.status === 200 && wc.json.review.status === 'confirmed' && !!wc.json.review.confirmedAt, wc.json);
  const wu2 = await post('/api/weekly/update', { id: rv.id, patch: { summary: 'x' } });
  check('已归档不可再编辑 409', wu2.status === 409, wu2);
  const wc2 = await post('/api/weekly/confirm', { id: rv.id, operator: 'Sera' });
  check('重复归档幂等 noop', wc2.status === 200 && wc2.json.noop === true, wc2.json);
  const wn = await post('/api/weekly/confirm', { id: 'WR-1999-01-04' });
  check('归档不存在复盘 404', wn.status === 404, wn);

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
