/* ============================================================
   HTX OTC BD Progress Hub — app.js
   纯原生 JS：fetch 加载 data/*.json，失败自动回退内置 FALLBACK
   双主题（Day/Night 默认 Day，localStorage 记忆）
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
 * 内置兜底数据（与 data/*.json 文件内容完全一致）
 * 直接双击 index.html（file:// 协议）时浏览器会拦截 fetch，
 * 此时自动使用 FALLBACK，保证离线也能完整渲染所有区块。
 * ---------------------------------------------------------- */
const FALLBACK = {
  "kpi": [
    {
      "label": "机构注册",
      "target": "≥6家",
      "current": "待推进",
      "trend": "待从CRM和销售转介中筛选",
      "status": "next"
    },
    {
      "label": "个人注册",
      "target": "≥19人",
      "current": "待推进",
      "trend": "TG存量客户优先唤醒",
      "status": "next"
    },
    {
      "label": "交易收入",
      "target": "≥26,000 USDT",
      "current": "待首单",
      "trend": "优先推进五星客户",
      "status": "next"
    },
    {
      "label": "设计交付包",
      "target": "1套",
      "current": "已完成",
      "trend": "明天提交设计团队",
      "status": "done"
    },
    {
      "label": "客户Pipeline",
      "target": "1套",
      "current": "已完成初版",
      "trend": "TG客户资料已汇总",
      "status": "done"
    },
    {
      "label": "Partner/中介",
      "target": "≥7家",
      "current": "待推进",
      "trend": "从Partner线索池筛选",
      "status": "next"
    },
    {
      "label": "KOL",
      "target": "≥10位",
      "current": "待启动",
      "trend": "需制定外部获客计划",
      "status": "next"
    },
    {
      "label": "销售对接",
      "target": "≥6次",
      "current": "待启动",
      "trend": "需Oscar/销售团队名单",
      "status": "next"
    }
  ],
  "pipeline": [
    {
      "module": "设计交付包",
      "pipGoal": "客户支持资料及跟进机制建设",
      "progress": "已完成整理，准备提交设计团队",
      "output": "业务背景、页面结构、COBO/POBO流程、FAQ、禁用词、参考图",
      "next": "明天提交设计团队，确认排期",
      "owner": "Sera",
      "priority": "P0",
      "status": "Done"
    },
    {
      "module": "TG客户资料汇总",
      "pipGoal": "客户Pipeline建设",
      "progress": "已完成初版CRM表",
      "output": "客户等级、UID、地区、方向、金额、KYC状态、当前阶段",
      "next": "筛选五星重点客户，推动注册/KYC/首单",
      "owner": "Sera",
      "priority": "P0",
      "status": "Done"
    },
    {
      "module": "高价值客户筛选",
      "pipGoal": "新增交易收入≥26,000 USDT",
      "progress": "进行中",
      "output": "五星客户、机构客户、Partner线索",
      "next": "按金额和成交概率安排优先跟进",
      "owner": "Sera",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "module": "注册/KYC推进",
      "pipGoal": "新增个人注册≥19人；机构注册≥6家",
      "progress": "待推进",
      "output": "客户资料字段表、KYC状态表",
      "next": "逐个确认UID、注册状态、KYC状态",
      "owner": "Sera",
      "priority": "P0",
      "status": "Next"
    },
    {
      "module": "首单交易测试",
      "pipGoal": "推动首批交易转化",
      "progress": "待执行",
      "output": "COBO/POBO流程说明",
      "next": "配合静格完成周四/周五首单测试",
      "owner": "Sera / 静格",
      "priority": "P0",
      "status": "Next"
    },
    {
      "module": "大数据客户名单",
      "pipGoal": "内部获客路径",
      "progress": "待协作",
      "output": "客户筛选条件草案",
      "next": "请思源哥协助调取名单",
      "owner": "Sera / 思源哥",
      "priority": "P1",
      "status": "Blocked"
    },
    {
      "module": "集团销售转介",
      "pipGoal": "对接集团销售≥6次",
      "progress": "待启动",
      "output": "客户转介字段表",
      "next": "联系Oscar/销售团队获取高价值名单",
      "owner": "Sera / Oscar",
      "priority": "P1",
      "status": "Next"
    },
    {
      "module": "Partner/KOL拓展",
      "pipGoal": "Partner≥7家；KOL≥10位",
      "progress": "待启动",
      "output": "Partner/商家线索表",
      "next": "制作合作介绍物料并开始触达",
      "owner": "Sera",
      "priority": "P1",
      "status": "Next"
    },
    {
      "module": "周报与CRIB复盘",
      "pipGoal": "PIP过程管理",
      "progress": "待固化",
      "output": "Pipeline字段和周报结构",
      "next": "每周更新进度，月底输出CRIB复盘",
      "owner": "Sera",
      "priority": "P1",
      "status": "Next"
    }
  ],
  "designDelivery": [
    {
      "item": "业务背景说明",
      "category": "内容",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "页面结构设计",
      "category": "内容",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "COBO 流程说明",
      "category": "流程",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "POBO 流程说明",
      "category": "流程",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "FAQ 文档",
      "category": "内容",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "禁用词清单",
      "category": "合规",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "漫画手绘风格参考图",
      "category": "素材",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    },
    {
      "item": "旧版手册参考素材",
      "category": "素材",
      "status": "done",
      "note": "已整理完成，2026-07-22 提交设计团队"
    }
  ],
  "crmSummary": {
    "updatedAt": "2026-07-21",
    "total": 42,
    "byLevel": [
      {
        "level": "五星",
        "count": 6
      },
      {
        "level": "四星",
        "count": 12
      },
      {
        "level": "三星",
        "count": 15
      },
      {
        "level": "待评估",
        "count": 9
      }
    ],
    "funnel": [
      {
        "stage": "咨询",
        "count": 42
      },
      {
        "stage": "信息收集",
        "count": 30
      },
      {
        "stage": "注册",
        "count": 18
      },
      {
        "stage": "KYC/KYB",
        "count": 10
      },
      {
        "stage": "报价",
        "count": 5
      },
      {
        "stage": "首单",
        "count": 0
      },
      {
        "stage": "长期维护",
        "count": 0
      }
    ],
    "note": "占位示例数据，请以实际 TG CRM 表为准，每周更新"
  },
  "taskProgress": [
    {
      "id": "T001",
      "task": "设计交付包整理",
      "status": "Done",
      "progress": 100,
      "owner": "Sera",
      "updatedAt": "2026-07-21",
      "next": "提交设计团队并确认排期"
    },
    {
      "id": "T002",
      "task": "TG客户CRM汇总",
      "status": "Done",
      "progress": 100,
      "owner": "Sera",
      "updatedAt": "2026-07-21",
      "next": "筛选五星重点客户"
    },
    {
      "id": "T003",
      "task": "日间主题与主题切换",
      "status": "Doing",
      "progress": 60,
      "owner": "Kimi",
      "updatedAt": "2026-07-21",
      "next": "完成 light/dark CSS 变量和切换按钮"
    },
    {
      "id": "T004",
      "task": "GitHub Pages 部署",
      "status": "Next",
      "progress": 0,
      "owner": "Kimi / Sera",
      "updatedAt": "2026-07-21",
      "next": "确认仓库并部署"
    },
    {
      "id": "T005",
      "task": "首单交易测试",
      "status": "Next",
      "progress": 0,
      "owner": "Sera / 静格",
      "updatedAt": "2026-07-21",
      "next": "周四/周五配合测试"
    }
  ]
};

/* 需要思源哥协助的 5 件事（固定展示） */
const FIXED_ASKS = [
  '大数据客户名单',
  'Oscar 大客户项目名单',
  '设计团队排期确认',
  '首单测试配合',
  '客户 KYC 状态确认'
];

/* 状态顺序与样式映射（Done 绿 / Doing 蓝 / Next 灰 / Blocked 红） */
const STATUS_ORDER = ['Done', 'Doing', 'Next', 'Blocked'];
const STATUS_CLS = { Done: 'done', Doing: 'doing', Next: 'next', Blocked: 'blocked' };

/* 设计交付清单状态图标 */
const DESIGN_STATUS = {
  done:  { icon: '✓', cls: 'check-done',  text: '已完成' },
  doing: { icon: '●', cls: 'check-doing', text: '进行中' },
  next:  { icon: '○', cls: 'check-next',  text: '待启动' }
};

/* 全局状态：当前生效的数据 + 筛选条件 */
const state = { kpi: [], pipeline: [], designDelivery: [], crmSummary: null, taskProgress: [] };
const filterState = { query: '', status: 'all' };

/* ---------- 工具：创建 DOM 节点（统一用 textContent 防注入） ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* ---------- 数据加载：fetch 失败自动回退 FALLBACK ---------- */
async function loadJson(url, fallback) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('[ProgressHub] 加载失败，使用内置兜底数据：' + url, err);
    return fallback;
  }
}

/* ---------- 01 主题切换（Day / Night，localStorage 记忆） ---------- */
function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'night' : 'day';
}

function syncThemeButtons() {
  const mode = currentTheme();
  document.querySelectorAll('#themeToggle .theme-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

function setTheme(mode) {
  const theme = mode === 'night' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (err) { /* 隐私模式下忽略 */ }
  syncThemeButtons();
  // 图例色块取自 CSS 变量，主题切换后重绘
  if (state.pipeline.length) renderStatusChart(state.pipeline);
}

/* ---------- Hero 细条：试载参考图，失败显示占位文案 ---------- */
function initHero() {
  const img = document.getElementById('heroImg');
  const fallback = document.getElementById('heroFallback');
  if (!img || !fallback) return;
  const probe = new Image();
  probe.onload = () => {
    img.src = 'assets/day-hero-reference.png';
    img.hidden = false;
    fallback.hidden = true;
  };
  probe.onerror = () => {
    img.hidden = true;
    fallback.hidden = false;
  };
  probe.src = 'assets/day-hero-reference.png';
}

/* ---------- 02 渲染 KPI 卡片 ---------- */
function renderKpi(list) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  list.forEach((item) => {
    const card = el('div', 'kpi-card st-' + item.status);
    card.appendChild(el('div', 'kpi-label', item.label));
    card.appendChild(el('div', 'kpi-value', item.current));
    card.appendChild(el('div', 'kpi-target', '目标：' + item.target));
    card.appendChild(el('div', 'kpi-trend st-' + item.status, item.trend));
    grid.appendChild(card);
  });
}

/* ---------- 03 渲染本周核心进展（纯 CSS/Div 柱状图） ---------- */
function renderStatusChart(pipeline) {
  // 统计各状态数量
  const counts = { Done: 0, Doing: 0, Next: 0, Blocked: 0 };
  pipeline.forEach((p) => { if (counts[p.status] !== undefined) counts[p.status]++; });
  const total = pipeline.length;

  // 大号数字 + 右上角状态徽章
  document.getElementById('chartTotal').textContent = total + ' 项';
  const badge = document.getElementById('chartBadge');
  if (counts.Blocked > 0) {
    badge.textContent = '⚠ 阻塞 ' + counts.Blocked + ' 项';
    badge.className = 'badge badge-blocked';
  } else {
    badge.textContent = '✓ 无阻塞';
    badge.className = 'badge badge-done';
  }

  // 生成 4 根柱子（高度按最大数量归一化）
  const max = Math.max(counts.Done, counts.Doing, counts.Next, counts.Blocked, 1);
  const chart = document.getElementById('statusChart');
  chart.innerHTML = '';
  STATUS_ORDER.forEach((s) => {
    const item = el('div', 'bar-item');
    item.appendChild(el('div', 'bar-value', String(counts[s])));
    const bar = el('div', 'bar bar-' + STATUS_CLS[s]);
    bar.style.height = Math.round((counts[s] / max) * 100) + '%';
    bar.title = s + '：' + counts[s] + ' 项';
    item.appendChild(bar);
    item.appendChild(el('div', 'bar-label', s));
    chart.appendChild(item);
  });

  // 图例
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = '';
  const legendText = { Done: '已完成', Doing: '进行中', Next: '待启动', Blocked: '已阻塞' };
  STATUS_ORDER.forEach((s) => {
    const item = el('span', 'legend-item');
    const swatch = el('span', 'legend-swatch');
    swatch.style.background = getComputedStyle(document.documentElement)
      .getPropertyValue('--' + (s === 'Done' ? 'success' : s === 'Doing' ? 'accent-blue' : s === 'Next' ? 'gray-next' : 'danger'));
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(s + ' · ' + legendText[s]));
    legend.appendChild(item);
  });
}

/* ---------- 04 渲染工作 Pipeline 看板 ---------- */
function buildTaskCard(item) {
  const card = el('article', 'task-card');
  card.dataset.status = item.status;
  // 搜索匹配字段：module / pipGoal / output / next
  card.dataset.search = [item.module, item.pipGoal, item.output, item.next].join(' ').toLowerCase();

  card.appendChild(el('h3', 'task-title', item.module));

  const rows = [
    ['PIP 目标', item.pipGoal],
    ['进度', item.progress],
    ['产出', item.output],
    ['下一步', item.next]
  ];
  rows.forEach(([k, v]) => {
    const row = el('div', 'task-row');
    row.appendChild(el('span', 'k', k));
    row.appendChild(el('span', v === '—' ? 'v muted' : 'v', v));
    card.appendChild(row);
  });

  const footer = el('div', 'task-footer');
  footer.appendChild(el('span', 'badge ' + (item.priority === 'P0' ? 'badge-p0' : 'badge-p1'), item.priority));
  footer.appendChild(el('span', 'badge badge-' + STATUS_CLS[item.status], item.status));
  footer.appendChild(el('span', 'task-owner', '负责人：' + item.owner));
  card.appendChild(footer);
  return card;
}

function renderKanban(pipeline) {
  STATUS_ORDER.forEach((s) => { document.getElementById('col-' + s).innerHTML = ''; });
  pipeline.forEach((item) => {
    const body = document.getElementById('col-' + item.status);
    if (body) body.appendChild(buildTaskCard(item));
  });
  applyFilters(); // 初次渲染后刷新计数与空列提示
}

/* ---------- 搜索 + 状态筛选（联动，同时生效） ---------- */
function applyFilters() {
  const q = filterState.query.trim().toLowerCase();
  STATUS_ORDER.forEach((s) => {
    const body = document.getElementById('col-' + s);
    const cards = body.querySelectorAll('.task-card');
    let visible = 0;
    cards.forEach((card) => {
      const statusOk = filterState.status === 'all' || card.dataset.status === filterState.status;
      const queryOk = !q || card.dataset.search.indexOf(q) !== -1;
      const show = statusOk && queryOk;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    // 列计数 = 当前可见卡片数
    document.getElementById('count-' + s).textContent = visible;
    // 空列提示
    let empty = body.querySelector('.col-empty');
    if (visible === 0) {
      if (!empty) body.appendChild(el('div', 'col-empty', '暂无匹配的工作项'));
    } else if (empty) {
      empty.remove();
    }
  });
}

/* ---------- 05 渲染客户转化漏斗 + CRM 分级 ---------- */
function renderCrm(crm) {
  // 横向条形漏斗：宽度按 count 与最大值比例
  const rows = document.getElementById('funnelRows');
  rows.innerHTML = '';
  const max = Math.max.apply(null, crm.funnel.map((f) => f.count).concat([1]));
  const base = crm.funnel.length ? crm.funnel[0].count : 1; // 首阶段为 100% 基准
  crm.funnel.forEach((f) => {
    const row = el('div', 'funnel-row');
    row.appendChild(el('div', 'funnel-stage', f.stage));
    const track = el('div', 'funnel-track');
    const bar = el('div', 'funnel-bar');
    bar.style.width = ((f.count / max) * 100).toFixed(1) + '%';
    track.appendChild(bar);
    row.appendChild(track);
    const count = el('div', 'funnel-count');
    count.appendChild(document.createTextNode(String(f.count)));
    count.appendChild(el('span', 'pct', Math.round((f.count / base) * 100) + '%'));
    row.appendChild(count);
    rows.appendChild(row);
  });

  // 占位数据提示
  document.getElementById('crmNote').textContent = crm.note || '';

  // 右侧：客户总数 + 分级小卡片
  document.getElementById('crmTotal').textContent = crm.total;
  const levels = document.getElementById('crmLevels');
  levels.innerHTML = '';
  crm.byLevel.forEach((lv) => {
    const r = el('div', 'crm-level-row');
    r.appendChild(el('span', 'lv-name', lv.level));
    r.appendChild(el('span', 'lv-count', String(lv.count)));
    levels.appendChild(r);
  });

  // 顶栏「数据更新」与页脚「Last Updated」均与 CRM 数据保持一致
  if (crm.updatedAt) {
    document.getElementById('updatedAt').textContent = crm.updatedAt;
    const footerUpdated = document.getElementById('footerUpdated');
    if (footerUpdated) footerUpdated.textContent = crm.updatedAt;
  }
}

/* ---------- 06 渲染设计交付清单 ---------- */
function renderDesign(list) {
  const tbody = document.getElementById('designTableBody');
  tbody.innerHTML = '';
  list.forEach((d) => {
    const tr = document.createElement('tr');
    const st = DESIGN_STATUS[d.status] || DESIGN_STATUS.next;
    const tdStatus = el('td', null);
    const icon = el('span', 'check-icon ' + st.cls, st.icon);
    icon.title = st.text;
    tdStatus.appendChild(icon);
    tr.appendChild(tdStatus);
    tr.appendChild(el('td', null, d.item));
    tr.appendChild(el('td', null, d.category));
    tr.appendChild(el('td', 'td-note', d.note));
    tbody.appendChild(tr);
  });
}

/* ---------- 07 渲染 Live Task Progress ---------- */
function renderTaskProgress(list) {
  const tbody = document.getElementById('taskProgressBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  list.forEach((t) => {
    const tr = document.createElement('tr');
    const statusCls = STATUS_CLS[t.status] || 'next';
    const pct = Math.max(0, Math.min(100, Number(t.progress) || 0));

    tr.appendChild(el('td', 'tp-id', t.id));
    tr.appendChild(el('td', null, t.task));
    tr.appendChild(el('td', 'tp-owner', t.owner));

    const tdStatus = el('td', null);
    tdStatus.appendChild(el('span', 'badge badge-' + statusCls, t.status));
    tr.appendChild(tdStatus);

    // 进度条：Done 黄 / Doing 蓝 / Next 灰 / Blocked 红
    const tdProgress = el('td', null);
    const wrap = el('div', 'tp-progress');
    const track = el('div', 'tp-track');
    const fill = el('div', 'tp-fill tp-' + statusCls);
    fill.style.width = pct + '%';
    fill.title = t.task + '：' + pct + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    wrap.appendChild(el('span', 'tp-pct', pct + '%'));
    tdProgress.appendChild(wrap);
    tr.appendChild(tdProgress);

    tr.appendChild(el('td', null, t.next));
    tr.appendChild(el('td', 'tp-updated', t.updatedAt));
    tbody.appendChild(tr);
  });
}

/* ---------- 08 渲染阻塞事项 + 固定协助清单 ---------- */
function renderBlocked(pipeline) {
  const wrap = document.getElementById('blockedCards');
  wrap.innerHTML = '';
  const blocked = pipeline.filter((p) => p.status === 'Blocked');
  if (!blocked.length) {
    wrap.appendChild(el('div', 'blocked-none', '✓ 当前无阻塞事项，继续保持'));
  }
  blocked.forEach((item) => {
    const card = el('div', 'blocked-card');
    card.appendChild(el('h4', null, '⛔ ' + item.module));
    card.appendChild(el('p', null, '当前状态：' + item.progress));
    card.appendChild(el('p', null, '下一步：' + item.next));
    card.appendChild(el('div', 'bc-meta', '负责人：' + item.owner + ' · 优先级：' + item.priority + ' · PIP 目标：' + item.pipGoal));
    wrap.appendChild(card);
  });

  // 固定列出需要思源哥协助的 5 件事
  const asks = document.getElementById('fixedAsks');
  asks.innerHTML = '';
  FIXED_ASKS.forEach((a) => asks.appendChild(el('li', null, a)));
}

/* ---------- 01 Export：导出 Pipeline JSON 下载 ---------- */
function exportPipeline() {
  const date = (state.crmSummary && state.crmSummary.updatedAt) || '2026-07-21';
  const blob = new Blob([JSON.stringify(state.pipeline, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pipeline-' + date + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  // 主题切换：Day / Night，写入 localStorage 记忆
  document.getElementById('themeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    setTheme(btn.dataset.mode);
  });

  // 搜索框：实时过滤
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterState.query = e.target.value;
    applyFilters();
  });

  // 状态筛选按钮组：全部 / Done / Doing / Next / Blocked
  document.getElementById('statusFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('#statusFilters .filter-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    filterState.status = btn.dataset.status;
    applyFilters();
  });

  // Export 按钮
  document.getElementById('btnExport').addEventListener('click', exportPipeline);
  // Update / New Item 为占位样式按钮，暂不绑定功能
}

/* ---------- 启动：加载 5 个 JSON，任一失败自动用 FALLBACK ---------- */
async function init() {
  const [kpi, pipeline, designDelivery, crmSummary, taskProgress] = await Promise.all([
    loadJson('data/kpi.json', FALLBACK.kpi),
    loadJson('data/pipeline.json', FALLBACK.pipeline),
    loadJson('data/design-delivery.json', FALLBACK.designDelivery),
    loadJson('data/crm-summary.json', FALLBACK.crmSummary),
    loadJson('data/task-progress.json', FALLBACK.taskProgress)
  ]);
  state.kpi = kpi;
  state.pipeline = pipeline;
  state.designDelivery = designDelivery;
  state.crmSummary = crmSummary;
  state.taskProgress = taskProgress;

  initHero();
  syncThemeButtons();
  renderKpi(state.kpi);
  renderStatusChart(state.pipeline);
  renderKanban(state.pipeline);
  renderCrm(state.crmSummary);
  renderDesign(state.designDelivery);
  renderTaskProgress(state.taskProgress);
  renderBlocked(state.pipeline);
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
