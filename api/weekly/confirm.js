/**
 * POST /api/weekly/confirm — 确认归档周复盘（draft → confirmed，不可逆）
 *
 * body: { id, operator? }
 * 归档成功后发送企微通知（失败不阻断，响应附 notify 诊断）；重复归档 noop 不发通知。
 */
'use strict';

const { sendJson, readBody, methodGuard, sectionUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry } = require('../_lib/store');
const { nowIso } = require('../_lib/weekly');
const { sendWecomMarkdown } = require('../_lib/wecom');

/** 归档通知正文（企微 markdown） */
function buildArchivedContent(req, review) {
  const count = (a) => (Array.isArray(a) ? a.length : 0);
  return (
    '【PIP 每周复盘已归档】\n' +
    `> 复盘周期：${review.weekStart} ~ ${review.weekEnd}\n` +
    `> 本周完成：${count(review.completedTasks)} 项\n` +
    `> 顺延任务：${count(review.deferredTasks)} 项\n` +
    `> 遇到的问题：${count(review.problems)} 项\n` +
    `> 下周重点：${count(review.nextWeekPriorities)} 项\n` +
    `[查看本周总结与复盘](${sectionUrl(req, { section: 'weekly-review', week: review.weekStart, source: 'wecom' })})`
  );
}

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

    // 企微通知（失败不阻断归档结果）
    const r = await sendWecomMarkdown(buildArchivedContent(req, review));
    sendJson(res, 200, { ok: true, review, notify: { ok: r.ok, error: r.error } });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
