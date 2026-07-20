/* ============================================================
   HTX OTC BD Progress Hub — app.js
   纯原生 JS：fetch 加载 data/*.json，失败自动回退内置 FALLBACK
   双主题（Day/Night 默认 Day，localStorage 记忆）
   PIP 升级版：11 区块 · 10 个数据源
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
      "status": "next",
      "done": 0,
      "total": 6
    },
    {
      "label": "个人注册",
      "target": "≥19人",
      "current": "待推进",
      "trend": "TG存量客户优先唤醒",
      "status": "next",
      "done": 0,
      "total": 19
    },
    {
      "label": "交易收入",
      "target": "≥26,000 USDT",
      "current": "待首单",
      "trend": "优先推进五星客户",
      "status": "next",
      "done": 0,
      "total": 26000
    },
    {
      "label": "设计交付包",
      "target": "1套",
      "current": "已完成",
      "trend": "明天提交设计团队",
      "status": "done",
      "done": 1,
      "total": 1
    },
    {
      "label": "客户Pipeline",
      "target": "1套",
      "current": "已完成初版",
      "trend": "TG客户资料已汇总",
      "status": "done",
      "done": 1,
      "total": 1
    },
    {
      "label": "Partner/中介",
      "target": "≥7家",
      "current": "待推进",
      "trend": "从Partner线索池筛选",
      "status": "next",
      "done": 0,
      "total": 7
    },
    {
      "label": "KOL",
      "target": "≥10位",
      "current": "待启动",
      "trend": "需制定外部获客计划",
      "status": "next",
      "done": 0,
      "total": 10
    },
    {
      "label": "销售对接",
      "target": "≥6次",
      "current": "待启动",
      "trend": "需Oscar/销售团队名单",
      "status": "next",
      "done": 0,
      "total": 6
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
        "count": 42,
        "next": "初筛"
      },
      {
        "stage": "信息收集",
        "count": 30,
        "next": "补充字段"
      },
      {
        "stage": "注册",
        "count": 18,
        "next": "推动注册"
      },
      {
        "stage": "KYC/KYB",
        "count": 10,
        "next": "跟进审核"
      },
      {
        "stage": "报价",
        "count": 5,
        "next": "确认金额"
      },
      {
        "stage": "首单",
        "count": 0,
        "next": "交易测试"
      },
      {
        "stage": "长期维护",
        "count": 0,
        "next": "例行维护"
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
      "status": "Done",
      "progress": 100,
      "owner": "Kimi",
      "updatedAt": "2026-07-21",
      "next": "收集使用反馈，按需微调日间主题细节"
    },
    {
      "id": "T004",
      "task": "私密部署（Cloudflare Pages + Access）",
      "status": "Doing",
      "progress": 30,
      "owner": "Kimi / Sera",
      "updatedAt": "2026-07-21",
      "next": "公网 Pages 已下线；待 Cloudflare 账号创建项目并配置 Access"
    },
    {
      "id": "T005",
      "task": "首单交易测试",
      "status": "Next",
      "progress": 0,
      "owner": "Sera / 静格",
      "updatedAt": "2026-07-21",
      "next": "周四/周五配合测试"
    },
    {
      "id": "T006",
      "task": "PIP 甘特图/任务树看板升级",
      "status": "Done",
      "progress": 100,
      "owner": "Kimi",
      "updatedAt": "2026-07-21",
      "next": "进入每周数据更新节奏"
    }
  ],
  "roadmap": [
    {
      "id": "WS01",
      "name": "设计交付线",
      "goal": "向设计团队提交 OTC USD 大宗交易资料包",
      "progress": 90,
      "status": "Doing",
      "owner": "Sera",
      "target": "完成设计交付包并确认排期"
    },
    {
      "id": "WS02",
      "name": "CRM客户线",
      "goal": "完成TG存量客户资料汇总与分级",
      "progress": 80,
      "status": "Doing",
      "owner": "Sera",
      "target": "筛选五星重点客户"
    },
    {
      "id": "WS03",
      "name": "客户转化线",
      "goal": "推动客户完成注册、KYC及首单",
      "progress": 15,
      "status": "Next",
      "owner": "Sera",
      "target": "个人注册≥19，机构注册≥6"
    },
    {
      "id": "WS04",
      "name": "交易测试线",
      "goal": "完成第一笔交易测试并沉淀SOP",
      "progress": 20,
      "status": "Next",
      "owner": "Sera / 静格",
      "target": "周四/周五完成首单测试"
    },
    {
      "id": "WS05",
      "name": "渠道拓展线",
      "goal": "推进大数据、销售转介、Partner/KOL获客",
      "progress": 10,
      "status": "Next",
      "owner": "Sera / Siyuan / Oscar",
      "target": "销售对接≥6，Partner≥7，KOL≥10"
    },
    {
      "id": "WS06",
      "name": "私密看板线",
      "goal": "交付仅思源哥可访问的私密进度看板",
      "progress": 65,
      "status": "Doing",
      "owner": "Sera / Kimi",
      "target": "完成私密部署与访问控制"
    }
  ],
  "gantt": [
    {
      "id": "G001",
      "workstream": "设计交付线",
      "task": "整理设计交付包",
      "start": "2026-07-21",
      "end": "2026-07-22",
      "progress": 100,
      "status": "Done",
      "dependsOn": []
    },
    {
      "id": "G002",
      "workstream": "设计交付线",
      "task": "提交设计团队",
      "start": "2026-07-22",
      "end": "2026-07-23",
      "progress": 60,
      "status": "Doing",
      "dependsOn": ["G001"]
    },
    {
      "id": "G003",
      "workstream": "CRM客户线",
      "task": "TG客户CRM初版",
      "start": "2026-07-20",
      "end": "2026-07-21",
      "progress": 100,
      "status": "Done",
      "dependsOn": []
    },
    {
      "id": "G004",
      "workstream": "CRM客户线",
      "task": "五星客户筛选",
      "start": "2026-07-22",
      "end": "2026-07-25",
      "progress": 30,
      "status": "Doing",
      "dependsOn": ["G003"]
    },
    {
      "id": "G005",
      "workstream": "客户转化线",
      "task": "第一批注册/KYC推进",
      "start": "2026-07-25",
      "end": "2026-08-08",
      "progress": 0,
      "status": "Next",
      "dependsOn": ["G004"]
    },
    {
      "id": "G006",
      "workstream": "交易测试线",
      "task": "首单交易测试",
      "start": "2026-07-24",
      "end": "2026-07-25",
      "progress": 0,
      "status": "Next",
      "dependsOn": ["G002"]
    },
    {
      "id": "G007",
      "workstream": "渠道拓展线",
      "task": "大数据客户筛选条件",
      "start": "2026-07-22",
      "end": "2026-07-26",
      "progress": 20,
      "status": "Blocked",
      "dependsOn": []
    },
    {
      "id": "G008",
      "workstream": "渠道拓展线",
      "task": "Oscar大客户名单对接",
      "start": "2026-07-25",
      "end": "2026-08-01",
      "progress": 0,
      "status": "Next",
      "dependsOn": []
    },
    {
      "id": "G009",
      "workstream": "私密看板线",
      "task": "访问控制方案确认",
      "start": "2026-07-21",
      "end": "2026-07-23",
      "progress": 70,
      "status": "Doing",
      "dependsOn": []
    }
  ],
  "taskTree": [
    {
      "id": "T001",
      "title": "设计交付包",
      "owner": "Sera",
      "status": "Doing",
      "progress": 90,
      "children": [
        { "title": "业务背景说明", "done": true },
        { "title": "页面结构与模块", "done": true },
        { "title": "COBO买币流程", "done": true },
        { "title": "POBO卖币流程", "done": true },
        { "title": "FAQ与客户话术", "done": true },
        { "title": "设计禁用词与合规注意", "done": true },
        { "title": "视觉参考图", "done": true },
        { "title": "提交设计团队并确认排期", "done": false }
      ]
    },
    {
      "id": "T002",
      "title": "TG客户CRM",
      "owner": "Sera",
      "status": "Doing",
      "progress": 80,
      "children": [
        { "title": "解析TG压缩包", "done": true },
        { "title": "生成客户CRM表", "done": true },
        { "title": "提取UID与KYC状态", "done": true },
        { "title": "五星客户筛选", "done": false },
        { "title": "注册/KYC推进名单", "done": false }
      ]
    },
    {
      "id": "T003",
      "title": "客户注册/KYC转化",
      "owner": "Sera",
      "status": "Next",
      "progress": 15,
      "children": [
        { "title": "确认首批唤醒客户", "done": false },
        { "title": "推动个人注册", "done": false },
        { "title": "推动机构注册", "done": false },
        { "title": "跟进KYC/KYB", "done": false },
        { "title": "推动首单成交", "done": false }
      ]
    }
  ],
  "todo": [
    {
      "task": "提交设计交付包给设计团队",
      "owner": "Sera",
      "due": "2026-07-22",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "从CRM筛选TOP五星客户",
      "owner": "Sera",
      "due": "2026-07-23",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "确认思源哥访问方式",
      "owner": "Sera",
      "due": "2026-07-23",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "配合静格完成首单测试",
      "owner": "Sera / 静格",
      "due": "2026-07-25",
      "priority": "P0",
      "status": "Next"
    },
    {
      "task": "请思源哥协助调取大数据客户名单",
      "owner": "Sera / 思源哥",
      "due": "2026-07-26",
      "priority": "P1",
      "status": "Blocked"
    }
  ],
  "milestones": [
    {
      "date": "2026-07-22",
      "title": "提交设计团队",
      "status": "Doing"
    },
    {
      "date": "2026-07-25",
      "title": "首单交易测试",
      "status": "Next"
    },
    {
      "date": "2026-07-31",
      "title": "第一批客户注册/KYC推进复盘",
      "status": "Next"
    },
    {
      "date": "2026-08-15",
      "title": "机构/个人注册目标中期检查",
      "status": "Next"
    },
    {
      "date": "2026-08-31",
      "title": "PIP阶段复盘与CRIB总结",
      "status": "Next"
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

/* 状态顺序与样式映射（Done 绿 / Doing 蓝 / Next 黄或灰 / Blocked 红） */
const STATUS_ORDER = ['Done', 'Doing', 'Next', 'Blocked'];
const STATUS_CLS = { Done: 'done', Doing: 'doing', Next: 'next', Blocked: 'blocked' };

/* 设计交付清单状态图标 */
const DESIGN_STATUS = {
  done:  { icon: '✓', cls: 'check-done',  text: '已完成' },
  doing: { icon: '●', cls: 'check-doing', text: '进行中' },
  next:  { icon: '○', cls: 'check-next',  text: '待启动' }
};

/* 甘特图时间轴：2026-07-21 ～ 2026-08-31，共 42 天 / 6 周 */
const GANTT_START = '2026-07-21';
const GANTT_DAYS = 42;
const GANTT_WEEKS = [
  ['W1', '07/21-07/27'],
  ['W2', '07/28-08/03'],
  ['W3', '08/04-08/10'],
  ['W4', '08/11-08/17'],
  ['W5', '08/18-08/24'],
  ['W6', '08/25-08/31']
];

/* 全局状态：当前生效的数据 + 筛选条件 */
const state = {
  kpi: [], pipeline: [], designDelivery: [], crmSummary: null, taskProgress: [],
  roadmap: [], gantt: [], taskTree: [], todo: [], milestones: []
};
const filterState = { query: '', status: 'all' };

/* ---------- 工具：创建 DOM 节点（统一用 textContent 防注入） ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* 通用迷你进度条：Done 绿 / Doing 蓝 / Next 黄 / Blocked 红 */
function buildPbar(status, pct, text) {
  // 兼容大小写（KPI 用小写 done/next，任务树/甘特用 Done/Next）
  const norm = typeof status === 'string'
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : 'Next';
  const cls = STATUS_CLS[norm] || 'next';
  const safe = Math.max(0, Math.min(100, Number(pct) || 0));
  const wrap = el('div', 'pbar');
  const track = el('div', 'pbar-track');
  const fill = el('div', 'pbar-fill pf-' + cls);
  fill.style.width = safe + '%';
  track.appendChild(fill);
  wrap.appendChild(track);
  if (text !== undefined && text !== null) wrap.appendChild(el('span', 'pbar-text', text));
  return wrap;
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

/* ---------- 02 Executive Summary（自动计算 4 张大数字卡） ---------- */
function renderSummary() {
  const grid = document.getElementById('sumGrid');
  grid.innerHTML = '';

  // 1) Overall Progress = roadmap 平均 progress
  const avg = state.roadmap.length
    ? Math.round(state.roadmap.reduce((s, r) => s + (Number(r.progress) || 0), 0) / state.roadmap.length)
    : 0;

  // 2) This Week Done = todo 中 Done 数 / 总数
  const todoDone = state.todo.filter((t) => t.status === 'Done').length;
  const todoTotal = state.todo.length;

  // 3) Active Blockers = todo + gantt + pipeline 中 Blocked 总数
  const blockers =
    state.pipeline.filter((p) => p.status === 'Blocked').length +
    state.gantt.filter((g) => g.status === 'Blocked').length +
    state.todo.filter((t) => t.status === 'Blocked').length;

  // 4) Next Milestone = milestones 中最早非 Done 项
  const nextMilestone = state.milestones
    .filter((m) => m.status !== 'Done')
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];

  const cards = [
    {
      label: 'Overall Progress',
      value: avg + '%',
      sub: state.roadmap.length + ' 条 Workstream 平均进度',
      accent: 'ac-blue'
    },
    {
      label: 'This Week Done',
      value: todoDone + '/' + todoTotal,
      sub: '本周 To Do 已完成 / 总数',
      accent: 'ac-green'
    },
    {
      label: 'Active Blockers',
      value: String(blockers),
      sub: 'Pipeline + 甘特 + To Do 阻塞总数',
      accent: blockers > 0 ? 'ac-red' : 'ac-green'
    },
    {
      label: 'Next Milestone',
      value: nextMilestone ? nextMilestone.date.slice(5) : '–',
      sub: nextMilestone ? nextMilestone.title + ' · ' + nextMilestone.date : '暂无待办里程碑',
      accent: 'ac-yellow'
    }
  ];

  cards.forEach((c) => {
    const card = el('div', 'sum-card ' + c.accent);
    card.appendChild(el('div', 'sum-label', c.label));
    card.appendChild(el('div', 'sum-value', c.value));
    card.appendChild(el('div', 'sum-sub', c.sub));
    grid.appendChild(card);
  });
}

/* ---------- 03 渲染 PIP KPI 卡片（含 done/total 进度条） ---------- */
function renderKpi(list) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  list.forEach((item) => {
    const card = el('div', 'kpi-card st-' + item.status);
    card.appendChild(el('div', 'kpi-label', item.label));
    card.appendChild(el('div', 'kpi-value', item.current));
    // 进度条：Done 绿 / 进行中蓝 / Next 黄 / 阻塞红
    if (typeof item.done === 'number' && typeof item.total === 'number' && item.total > 0) {
      const pct = Math.round((item.done / item.total) * 100);
      card.appendChild(buildPbar(item.status, pct, item.done + '/' + item.total + ' · ' + pct + '%'));
    }
    card.appendChild(el('div', 'kpi-target', '目标：' + item.target));
    card.appendChild(el('div', 'kpi-trend st-' + item.status, item.trend));
    grid.appendChild(card);
  });
}

/* ---------- 04 渲染 Trial Timeline 甘特图（纯 CSS Grid） ---------- */
function ganttDayOffset(dateStr) {
  const base = new Date(GANTT_START + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - base) / 86400000);
}

function renderGantt(list) {
  const wrap = document.getElementById('ganttChart');
  wrap.innerHTML = '';

  // 表头：左列占位 + 6 个周列
  const head = el('div', 'gantt-head');
  head.appendChild(el('div', 'gantt-corner', 'Workstream / Task'));
  const weeks = el('div', 'gantt-weeks');
  GANTT_WEEKS.forEach(([w, range]) => {
    const cell = el('div', 'gantt-week');
    cell.appendChild(el('b', null, w));
    cell.appendChild(document.createTextNode(' ' + range));
    weeks.appendChild(cell);
  });
  head.appendChild(weeks);
  wrap.appendChild(head);

  // 任务行：日期换算为 42 天时间轴上的百分比位置，越界截断
  list.forEach((g) => {
    const row = el('div', 'gantt-row');

    const label = el('div', 'gantt-label');
    label.appendChild(el('div', 'gl-task', g.task));
    label.appendChild(el('div', 'gl-ws', g.workstream + ' · ' + g.id));
    row.appendChild(label);

    const track = el('div', 'gantt-track');
    let startIdx = Math.max(0, ganttDayOffset(g.start));
    let endIdx = Math.min(GANTT_DAYS - 1, ganttDayOffset(g.end));
    if (endIdx < 0 || startIdx > GANTT_DAYS - 1) {
      // 完全在时间轴外：不画条
    } else {
      if (endIdx < startIdx) endIdx = startIdx;
      const bar = el('div', 'gantt-bar gb-' + (STATUS_CLS[g.status] || 'next'));
      bar.style.left = ((startIdx / GANTT_DAYS) * 100).toFixed(2) + '%';
      bar.style.width = (((endIdx - startIdx + 1) / GANTT_DAYS) * 100).toFixed(2) + '%';
      bar.textContent = g.task + ' · ' + g.progress + '%';
      const deps = g.dependsOn && g.dependsOn.length ? g.dependsOn.join('、') : '无';
      bar.title = g.task + '｜' + g.start + ' ~ ' + g.end + '｜进度 ' + g.progress + '%｜依赖：' + deps;
      track.appendChild(bar);
    }
    row.appendChild(track);
    wrap.appendChild(row);
  });

  // 图例：Done 绿 / Doing 蓝 / Next 黄 / Blocked 红
  const legend = document.getElementById('ganttLegend');
  legend.innerHTML = '';
  STATUS_ORDER.forEach((s) => {
    const item = el('span', 'legend-item');
    item.appendChild(el('span', 'legend-swatch gantt-bar gb-' + STATUS_CLS[s]));
    item.appendChild(document.createTextNode(s));
    legend.appendChild(item);
  });
}

/* ---------- 06.1 渲染主任务树（可展开卡片） ---------- */
function renderTaskTree(list) {
  const wrap = document.getElementById('taskTree');
  wrap.innerHTML = '';
  list.forEach((t) => {
    const children = t.children || [];
    const doneCount = children.filter((c) => c.done).length;
    const card = el('div', 'ttree-card');

    const headBtn = el('button', 'ttree-head');
    headBtn.type = 'button';
    headBtn.setAttribute('aria-expanded', 'false');
    headBtn.appendChild(el('span', 'ttree-chevron', '▶'));
    headBtn.appendChild(el('span', 'ttree-title', t.title));
    headBtn.appendChild(el('span', 'badge badge-' + (STATUS_CLS[t.status] || 'next'), t.status));
    headBtn.appendChild(el('span', 'ttree-owner', '负责人：' + t.owner));
    const prog = el('div', 'ttree-progress');
    prog.appendChild(buildPbar(t.status, t.progress, t.progress + '%'));
    headBtn.appendChild(prog);
    headBtn.appendChild(el('span', 'ttree-count', '子任务 ' + doneCount + '/' + children.length));
    card.appendChild(headBtn);

    const childWrap = el('div', 'ttree-children');
    children.forEach((c) => {
      const row = el('div', 'ttree-child' + (c.done ? ' is-done' : ''));
      row.appendChild(el('span', 'ttree-check ' + (c.done ? 'done' : 'todo'), c.done ? '✓' : '○'));
      row.appendChild(el('span', 'ttree-child-title', c.title));
      childWrap.appendChild(row);
    });
    card.appendChild(childWrap);

    headBtn.addEventListener('click', () => {
      const open = card.classList.toggle('open');
      headBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.appendChild(card);
  });
}

/* ---------- 06.3 渲染本周核心进展（纯 CSS/Div 柱状图） ---------- */
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

/* ---------- 06.2 渲染工作 Pipeline 看板 ---------- */
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

/* ---------- 搜索 + 状态筛选（联动：看板卡片 + To Do 行） ---------- */
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

  // To Do 行同步按搜索词过滤
  const todoBody = document.getElementById('todoTableBody');
  if (todoBody) {
    let todoVisible = 0;
    todoBody.querySelectorAll('.todo-row').forEach((row) => {
      const show = !q || row.dataset.search.indexOf(q) !== -1;
      row.classList.toggle('is-hidden', !show);
      if (show) todoVisible++;
    });
    let emptyRow = todoBody.querySelector('.todo-empty-row');
    if (todoVisible === 0) {
      if (!emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.className = 'todo-empty-row';
        const td = el('td', 'todo-empty', '暂无匹配的 To Do 项');
        td.colSpan = 5;
        emptyRow.appendChild(td);
        todoBody.appendChild(emptyRow);
      }
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }
}

/* ---------- 07 渲染 CRM 转化漏斗（新增转化率 / 下一步两列） + CRM 分级 ---------- */
function renderCrm(crm) {
  // 表头行
  const rows = document.getElementById('funnelRows');
  rows.innerHTML = '';
  const head = el('div', 'funnel-row funnel-head');
  ['阶段', '占比', '数量', '转化率', '下一步'].forEach((h) => head.appendChild(el('span', null, h)));
  rows.appendChild(head);

  // 横向条形漏斗：宽度按 count 与最大值比例；转化率 = 本阶段 / 上一阶段（首阶段 100%）
  const max = Math.max.apply(null, crm.funnel.map((f) => f.count).concat([1]));
  const base = crm.funnel.length ? crm.funnel[0].count : 1; // 首阶段为 100% 基准
  crm.funnel.forEach((f, i) => {
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
    // 转化率：本阶段 / 上一阶段；首阶段 100%；上一阶段为 0 时显示 –
    const prev = i === 0 ? null : crm.funnel[i - 1].count;
    const convText = i === 0 ? '100%' : (prev > 0 ? Math.round((f.count / prev) * 100) + '%' : '–');
    row.appendChild(el('div', 'funnel-conv', convText));
    row.appendChild(el('div', 'funnel-next', f.next || '—'));
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

/* ---------- 06.4 渲染设计交付清单 ---------- */
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

/* ---------- 06.5 渲染 Live Task Progress ---------- */
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

    // 进度条：Done 绿 / Doing 蓝 / Next 黄 / Blocked 红
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

/* ---------- 08 渲染 Weekly To Do List（P0 高亮 / 过期标红 / 搜索过滤） ---------- */
const TODAY = '2026-07-21';

function renderTodo(list) {
  const tbody = document.getElementById('todoTableBody');
  tbody.innerHTML = '';
  // 按优先级排序：P0 在前
  const sorted = list.slice().sort((a, b) => (a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0));
  sorted.forEach((t) => {
    const tr = document.createElement('tr');
    tr.className = 'todo-row' + (t.priority === 'P0' ? ' todo-p0' : '');
    tr.dataset.search = [t.task, t.owner, t.priority, t.status].join(' ').toLowerCase();

    const tdPrio = el('td', null);
    tdPrio.appendChild(el('span', 'badge ' + (t.priority === 'P0' ? 'badge-p0' : 'badge-p1'), t.priority));
    tr.appendChild(tdPrio);

    tr.appendChild(el('td', null, t.task));
    tr.appendChild(el('td', 'tp-owner', t.owner));

    // due 早于今天且未完成 → 标红「已过期」
    const tdDue = el('td', 'todo-due', t.due);
    if (t.due < TODAY && t.status !== 'Done') {
      tdDue.appendChild(el('span', 'todo-overdue', '已过期'));
    }
    tr.appendChild(tdDue);

    const tdStatus = el('td', null);
    tdStatus.appendChild(el('span', 'badge badge-' + (STATUS_CLS[t.status] || 'next'), t.status));
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

/* ---------- 09 渲染阻塞事项 + 固定协助清单 ---------- */
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

  // 搜索框：实时过滤（看板卡片 + To Do 行）
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

/* ---------- 启动：加载 10 个 JSON，任一失败自动用 FALLBACK ---------- */
async function init() {
  const [
    kpi, pipeline, designDelivery, crmSummary, taskProgress,
    roadmap, gantt, taskTree, todo, milestones
  ] = await Promise.all([
    loadJson('data/kpi.json', FALLBACK.kpi),
    loadJson('data/pipeline.json', FALLBACK.pipeline),
    loadJson('data/design-delivery.json', FALLBACK.designDelivery),
    loadJson('data/crm-summary.json', FALLBACK.crmSummary),
    loadJson('data/task-progress.json', FALLBACK.taskProgress),
    loadJson('data/roadmap.json', FALLBACK.roadmap),
    loadJson('data/gantt.json', FALLBACK.gantt),
    loadJson('data/task-tree.json', FALLBACK.taskTree),
    loadJson('data/todo.json', FALLBACK.todo),
    loadJson('data/milestones.json', FALLBACK.milestones)
  ]);
  state.kpi = kpi;
  state.pipeline = pipeline;
  state.designDelivery = designDelivery;
  state.crmSummary = crmSummary;
  state.taskProgress = taskProgress;
  state.roadmap = roadmap;
  state.gantt = gantt;
  state.taskTree = taskTree;
  state.todo = todo;
  state.milestones = milestones;

  initHero();
  syncThemeButtons();
  renderSummary();
  renderKpi(state.kpi);
  renderGantt(state.gantt);
  renderTaskTree(state.taskTree);
  renderStatusChart(state.pipeline);
  renderKanban(state.pipeline);
  renderCrm(state.crmSummary);
  renderDesign(state.designDelivery);
  renderTaskProgress(state.taskProgress);
  renderTodo(state.todo);
  renderBlocked(state.pipeline);
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
