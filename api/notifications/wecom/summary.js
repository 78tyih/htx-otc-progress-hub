/**
 * POST /api/notifications/wecom/summary — 发送「PIP 看板优化完成」总结通知（双通道：企微 + 飞书），返回完整诊断
 *
 * 受保护约定（与 ./test.js 一致）：
 *   - 仅接受 POST；webhook URL 只从服务端环境变量读取，接口不接受任何 URL 参数；
 *   - 响应永不包含完整 URL 或 key；线上由 Vercel Authentication 整体保护。
 *
 * body（全部可选，均做字符串化 / 去控制字符 / 单字段限长 500 / 数组最多 10 项）：
 *   scope: string；items: string[]；checks: { 检查名: '通过'|'失败' }；section: 深链 slug 白名单
 * 诊断同时写入 state.notify.lastSummary（saveState 失败不阻断）。
 */
'use strict';

const { sendJson, readBody, methodGuard, dashboardUrl } = require('../../_lib/http');
const { loadState, saveState } = require('../../_lib/store');
const { wecomConfigured, beijingNow } = require('../../_lib/wecom');
const { feishuConfigured } = require('../../_lib/feishu');
const { sendPipNotification } = require('../../_lib/dual');

const MAX_LEN = 500;
const MAX_ITEMS = 10;

const SECTION_SLUGS = new Set([
  'summary', 'kpi', 'countdown', 'roadmap', 'pipeline', 'gantt', 'depmap',
  'todo', 'blockers', 'weekly-review', 'weekly-log', 'resources', 'system',
]);

const DEFAULT_SCOPE = '一级、二级菜单收敛';
const DEFAULT_ITEMS = [
  '将 13 个平铺目录收敛为 5 个一级菜单',
  '增加一级菜单展开和收起',
  '增加侧边目录整体折叠',
  '增加滚动定位和菜单状态记忆',
  '保留每周总结与复盘入口',
];
const DEFAULT_CHECKS = { 类型检查: '通过', 生产构建: '通过', 页面检查: '通过', 手机端检查: '通过' };

/** 字符串清洗：字符串化、去控制字符（含换行，防止注入消息结构）、限长 */
function cleanStr(v) {
  return String(v).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, MAX_LEN);
}

function parseScope(body) {
  if (typeof body.scope !== 'string') return DEFAULT_SCOPE;
  return cleanStr(body.scope) || DEFAULT_SCOPE;
}

function parseItems(body) {
  if (!Array.isArray(body.items)) return DEFAULT_ITEMS;
  const items = body.items.slice(0, MAX_ITEMS).map(cleanStr).filter(Boolean);
  return items.length ? items : DEFAULT_ITEMS;
}

function parseChecks(body) {
  if (!body.checks || typeof body.checks !== 'object' || Array.isArray(body.checks)) return DEFAULT_CHECKS;
  const out = {};
  for (const [k, v] of Object.entries(body.checks).slice(0, MAX_ITEMS)) {
    const name = cleanStr(k);
    if (!name) continue;
    if (v === '通过' || v === '失败') out[name] = v;
  }
  return Object.keys(out).length ? out : DEFAULT_CHECKS;
}

function parseSection(body) {
  if (typeof body.section !== 'string') return null;
  const s = body.section.trim();
  return SECTION_SLUGS.has(s) ? s : null;
}

/** 总结消息正文行（双渠道共用；链接由 dual 按渠道追加 source 参数） */
function buildSummaryLines({ scope, items, checks }) {
  return [
    `优化板块：${scope}`,
    '本次完成：',
    ...items.map((it, i) => `${i + 1}. ${it}`),
    '验证结果：',
    ...Object.entries(checks).map(([k, v]) => `- ${k}：${v}`),
    `更新时间：${beijingNow()}（北京时间）`,
  ];
}

module.exports = async (req, res) => {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readBody(req);

    if (!wecomConfigured() && !feishuConfigured()) {
      return sendJson(res, 200, {
        ok: false,
        configured: false,
        error: 'WECHAT_WEBHOOK_URL / FEISHU_WEBHOOK_URL 均未配置（请在部署平台环境变量中设置，勿使用 NEXT_PUBLIC_ 前缀）',
        requestedAt: new Date().toISOString(),
      });
    }

    const parsed = {
      scope: parseScope(body),
      items: parseItems(body),
      checks: parseChecks(body),
      section: parseSection(body),
    };
    const state = await loadState();
    const dual = await sendPipNotification(state, {
      eventId: `summary:${beijingNow().slice(0, 13)}:${parsed.scope}`, // 小时分桶防重
      title: '【PIP 看板优化完成】',
      lines: buildSummaryLines(parsed),
      linkBase: dashboardUrl(req),
      linkParams: parsed.section ? { section: parsed.section } : {},
    });

    state.notify.lastSummary = {
      at: dual.wecom.at || dual.feishu.at,
      ok: dual.ok,
      partial: dual.partial,
      wecom: { success: dual.wecom.success, code: dual.wecom.code, message: dual.wecom.message, httpStatus: dual.wecom.httpStatus, durationMs: dual.wecom.durationMs, error: dual.wecom.error },
      feishu: { success: dual.feishu.success, code: dual.feishu.code, message: dual.feishu.message, httpStatus: dual.feishu.httpStatus, durationMs: dual.feishu.durationMs, error: dual.feishu.error },
    };
    if (dual.wecom.success) state.notify.lastSuccessAt = dual.wecom.at;
    try { await saveState(state); } catch { /* 诊断状态丢失不阻断 */ }

    sendJson(res, 200, {
      ok: dual.ok,
      partial: dual.partial,
      configured: true,
      requestedAt: state.notify.lastSummary.at,
      // 企微渠道诊断（保持原字段兼容）
      httpStatus: dual.wecom.httpStatus,
      errcode: dual.wecom.code,
      errmsg: dual.wecom.message,
      durationMs: dual.wecom.durationMs,
      error: dual.wecom.error,
      // 飞书渠道诊断
      feishu: {
        configured: dual.feishu.configured,
        success: dual.feishu.success,
        httpStatus: dual.feishu.httpStatus,
        code: dual.feishu.code,
        message: dual.feishu.message,
        durationMs: dual.feishu.durationMs,
        error: dual.feishu.error,
      },
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
};
