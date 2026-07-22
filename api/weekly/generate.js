/**
 * POST /api/weekly/generate — PIP 助手生成周复盘草稿
 *
 * body: { weekStart?: 'YYYY-MM-DD'（周一，缺省 = 上一自然周）, operator? }
 * 规则：
 *   - 只从真实任务 / 审计数据派生，不编造；
 *   - 同周已有草稿 → 重新生成并覆盖草稿；
 *   - 同周已归档（confirmed）→ 409 拒绝，归档周报不可再生成。
 */
'use strict';

const { sendJson, readBody, methodGuard } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry } = require('../_lib/store');
const { generateReview, previousWeekRange } = require('../_lib/weekly');

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);
    const operator = String(body.operator || '').trim() || 'Sera';
    let weekStart = typeof body.weekStart === 'string' && body.weekStart.trim()
      ? body.weekStart.trim()
      : previousWeekRange().weekStart;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return sendJson(res, 400, { ok: false, error: 'weekStart 格式应为 YYYY-MM-DD' });
    }

    const state = await loadState();
    if (!state.weeklyReviews || !Array.isArray(state.weeklyReviews.reviews)) {
      state.weeklyReviews = { version: 1, reviews: [] };
    }
    const existing = state.weeklyReviews.reviews.find((r) => r.weekStart === weekStart);
    if (existing && existing.status === 'confirmed') {
      return sendJson(res, 409, { ok: false, error: `该周（${weekStart}）复盘已归档，不可重新生成`, review: existing });
    }

    const review = generateReview(state, weekStart);
    if (existing) {
      const idx = state.weeklyReviews.reviews.indexOf(existing);
      state.weeklyReviews.reviews[idx] = review;
    } else {
      state.weeklyReviews.reviews.push(review);
    }

    appendAuditEntry(state, {
      actor: 'web',
      action: 'weekly-generate',
      taskId: null,
      detail: JSON.stringify({ operator, weekStart, weekEnd: review.weekEnd, reviewId: review.id, replaced: !!existing }),
    });
    await saveState(state);

    sendJson(res, 200, { ok: true, review, replaced: !!existing });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
