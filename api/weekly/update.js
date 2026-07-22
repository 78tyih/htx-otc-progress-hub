/**
 * POST /api/weekly/update — 编辑周复盘草稿（仅 draft 可编辑）
 *
 * body: { id, operator?, patch: { summary?, deferredTasks?, problems?, improvements?, nextWeekPriorities? } }
 * completedTasks / metricSnapshot 由任务数据派生，不开放手工编辑，保证口径一致。
 */
'use strict';

const { sendJson, readBody, methodGuard } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry } = require('../_lib/store');

const EDITABLE_ARRAY_FIELDS = ['deferredTasks', 'problems', 'improvements', 'nextWeekPriorities'];

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const id = String(body.id || '').trim();
    const operator = String(body.operator || '').trim() || 'Sera';
    const patch = (body.patch && typeof body.patch === 'object') ? body.patch : {};
    if (!id) return sendJson(res, 400, { ok: false, error: '缺少 id' });

    const state = await loadState();
    const reviews = (state.weeklyReviews && state.weeklyReviews.reviews) || [];
    const review = reviews.find((r) => r.id === id);
    if (!review) return sendJson(res, 404, { ok: false, error: `未找到复盘 ${id}` });
    if (review.status !== 'draft') {
      return sendJson(res, 409, { ok: false, error: '已归档的周报不可编辑' });
    }

    const changed = [];
    if (typeof patch.summary === 'string') {
      review.summary = patch.summary;
      changed.push('summary');
    }
    for (const key of EDITABLE_ARRAY_FIELDS) {
      if (patch[key] !== undefined) {
        if (!Array.isArray(patch[key])) {
          return sendJson(res, 400, { ok: false, error: `${key} 必须是数组` });
        }
        review[key] = patch[key].filter((x) => x && typeof x === 'object');
        changed.push(key);
      }
    }
    if (!changed.length) return sendJson(res, 400, { ok: false, error: 'patch 为空或无有效字段' });

    appendAuditEntry(state, {
      actor: 'web',
      action: 'weekly-update',
      taskId: null,
      detail: JSON.stringify({ operator, reviewId: id, fields: changed }),
    });
    await saveState(state);

    sendJson(res, 200, { ok: true, review });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
