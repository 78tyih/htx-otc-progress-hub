/**
 * POST /api/weekly/confirm — 确认归档周复盘（draft → confirmed，不可逆）
 *
 * body: { id, operator? }
 */
'use strict';

const { sendJson, readBody, methodGuard } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry } = require('../_lib/store');
const { nowIso } = require('../_lib/weekly');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const id = String(body.id || '').trim();
    const operator = String(body.operator || '').trim() || 'Sera';
    if (!id) return sendJson(res, 400, { ok: false, error: '缺少 id' });

    const state = await loadState();
    const reviews = (state.weeklyReviews && state.weeklyReviews.reviews) || [];
    const review = reviews.find((r) => r.id === id);
    if (!review) return sendJson(res, 404, { ok: false, error: `未找到复盘 ${id}` });
    if (review.status === 'confirmed') {
      return sendJson(res, 200, { ok: true, noop: true, message: '该周报已归档', review });
    }

    review.status = 'confirmed';
    review.confirmedAt = nowIso();

    appendAuditEntry(state, {
      actor: 'web',
      action: 'weekly-confirm',
      taskId: null,
      detail: JSON.stringify({ operator, reviewId: id, weekStart: review.weekStart, confirmedAt: review.confirmedAt }),
    });
    await saveState(state);

    sendJson(res, 200, { ok: true, review });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
