/**
 * GET /api/tasks — 看板数据统一读取（执行层 + 展示层投影 + 最近更新）
 */
'use strict';

const { sendJson, methodGuard } = require('./_lib/http');
const { loadState, recentAgentUpdates } = require('./_lib/store');
const { projectPresentation } = require('../agent/presenter');
const { classifyAll } = require('../agent/classify');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const state = await loadState();
    const projected = projectPresentation({
      tasks: state.tasks.tasks,
      pipeline: state.pipeline,
      weeklyLog: state.weeklyLog,
    });
    // 每个任务附带六态判定（class/label/basis/suggestion），供看板与 Agent 直接使用
    const classified = classifyAll(state.tasks.tasks, Date.now());
    const tasks = classified.map((c) => ({
      ...c.task,
      classification: { class: c.class, label: c.label, basis: c.basis, suggestion: c.suggestion },
    }));
    sendJson(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      tasks,
      tasksUpdatedAt: state.tasks.updatedAt,
      todo: projected.todo,
      pipeline: projected.pipeline,
      weeklyLog: projected.weeklyLog,
      recentUpdates: recentAgentUpdates(state, 8),
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
