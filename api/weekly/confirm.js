/**
 * POST /api/weekly/confirm — 确认归档周复盘（draft → confirmed，不可逆）
 *
 * body: { id, operator? }
 * 归档成功后双通道推送企微（Sera）+ 飞书（Simon）（失败不阻断，响应附 notify 诊断）；
 * 重复归档 noop 不发通知；同一复盘 eventId 防重复推送。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../_lib/http');
const { loadState, saveState, appendAuditEntry } = require('../_lib/store');
const { nowIso } = require('../_lib/weekly');
const { sendPipNotification } = require('../_lib/dual');

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

    // 双通道通知（失败不阻断归档结果；eventId 含复盘 id 防重复）
    const count = (a) => (Array.isArray(a) ? a.length : 0);
    const dual = await sendPipNotification(state, {
      eventId: `weekly-archived:${review.id}`,
      title: '【PIP 每周总结与复盘】',
      lines: [
        `复盘周期：${review.weekStart} ~ ${review.weekEnd}`,
        `本周完成：${count(review.completedTasks)} 项`,
        `顺延任务：${count(review.deferredTasks)} 项`,
        `遇到的问题：${count(review.problems)} 项`,
        `下周重点：${count(review.nextWeekPriorities)} 项`,
        `操作人：${operator}`,
      ],
      linkBase: dashboardUrl(req),
      linkParams: { section: 'weekly-review', week: review.weekStart },
    });
    try { await saveState(state); } catch { /* 通知状态丢失不阻断 */ }

    sendJson(res, 200, {
      ok: true,
      review,
      notify: {
        ok: dual.ok,
        partial: dual.partial,
        allFailed: dual.allFailed,
        message: dual.ok ? '双通道推送成功' : dual.partial ? '部分发送成功' : '双通道均发送失败',
        wecom: dual.wecom,
        feishu: dual.feishu,
      },
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
