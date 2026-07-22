/**
 * GET /api/tasks — 看板数据统一读取（执行层 + 展示层投影 + 最近更新）
 */
'use strict';

const { sendJson, methodGuard } = require('./_lib/http');
const { loadState, recentAgentUpdates } = require('./_lib/store');
const { projectPresentation } = require('../agent/presenter');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const state = await loadState();
    const projected = projectPresentation({
      tasks: state.tasks.tasks,
      pipeline: state.pipeline,
      weeklyLog: state.weeklyLog,
    });
    sendJson(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      tasks: state.tasks.tasks,
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
