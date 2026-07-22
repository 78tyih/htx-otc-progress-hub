/**
 * GET /api/weekly/list — 周复盘列表（新→旧）
 */
'use strict';

const { sendJson, methodGuard } = require('../_lib/http');
const { loadState } = require('../_lib/store');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'GET')) return;
  try {
    const state = await loadState();
    const reviews = ((state.weeklyReviews && state.weeklyReviews.reviews) || [])
      .slice()
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
    sendJson(res, 200, { ok: true, reviews });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
