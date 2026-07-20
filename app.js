/* ============================================================
   HTX OTC BD Progress Hub — app.js
   纯原生 JS：fetch 加载 data/*.json，失败自动回退内置 FALLBACK
   双主题（日间/夜间，默认日间，localStorage 记忆）
   收敛版：10 区块 · 9 个数据源 · 动态 KPI 组件 · 克制动效
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
 * 内置兜底数据（与 data/*.json 文件内容完全一致，由脚本同步生成）
 * 直接双击 index.html（file:// 协议）时浏览器会拦截 fetch，
 * 此时自动使用 FALLBACK，保证离线也能完整渲染所有区块。
 * __FALLBACK_SYNC__ 标记之间由脚本维护，请勿手改。
 * ---------------------------------------------------------- */
// __FALLBACK_SYNC_BEGIN__
const FALLBACK = {
  "kpi": [
    {
      "label": "机构注册",
      "component": "segments",
      "done": 0,
      "total": 6,
      "unit": "家",
      "target": "≥6家",
      "current": "0/6",
      "trend": "待从CRM和销售转介中筛选",
      "next": "从 CRM 与销售转介中筛选机构线索",
      "status": "next"
    },
    {
      "label": "个人注册",
      "component": "water",
      "done": 0,
      "total": 19,
      "unit": "人",
      "target": "≥19人",
      "current": "0/19",
      "trend": "TG存量客户优先唤醒",
      "next": "按客户等级逐个推进注册",
      "status": "next"
    },
    {
      "label": "交易收入",
      "component": "money",
      "done": 0,
      "total": 26000,
      "unit": "USDT",
      "target": "≥26,000 USDT",
      "current": "0 / 26,000",
      "trend": "优先推进五星客户",
      "next": "配合首单测试完成首批成交",
      "status": "next"
    },
    {
      "label": "设计交付包",
      "component": "ring",
      "done": 8,
      "total": 8,
      "unit": "项",
      "target": "8项资料",
      "current": "8/8",
      "trend": "明天提交设计团队",
      "next": "提交设计团队并确认排期",
      "status": "done"
    },
    {
      "label": "客户Pipeline",
      "component": "funnel",
      "done": 1,
      "total": 1,
      "unit": "套",
      "target": "1套",
      "current": "已建初版",
      "trend": "TG客户资料已汇总",
      "next": "筛选五星重点客户",
      "status": "done"
    },
    {
      "label": "渠道拓展",
      "component": "multi",
      "done": 0,
      "total": 23,
      "unit": "个",
      "target": "Partner≥7 · KOL≥10 · 销售≥6",
      "current": "0/23",
      "trend": "需大数据名单与销售名单",
      "next": "制定站外获客计划并开始触达",
      "status": "next",
      "sub": [
        {
          "label": "Partner",
          "done": 0,
          "total": 7
        },
        {
          "label": "KOL",
          "done": 0,
          "total": 10
        },
        {
          "label": "销售对接",
          "done": 0,
          "total": 6
        }
      ]
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
      "next": "请 Simon 协助调取名单",
      "owner": "Sera / Simon",
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
      "owner": "Sera / Simon / Oscar",
      "target": "销售对接≥6，Partner≥7，KOL≥10"
    },
    {
      "id": "WS06",
      "name": "私密看板线",
      "goal": "交付仅 Simon 可访问的私密进度看板",
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
      "dependsOn": [],
      "owner": "Sera",
      "next": "提交设计团队"
    },
    {
      "id": "G002",
      "workstream": "设计交付线",
      "task": "提交设计团队",
      "start": "2026-07-22",
      "end": "2026-07-23",
      "progress": 60,
      "status": "Doing",
      "dependsOn": [
        "G001"
      ],
      "owner": "Sera",
      "next": "确认设计排期与反馈时间"
    },
    {
      "id": "G003",
      "workstream": "CRM客户线",
      "task": "TG客户CRM初版",
      "start": "2026-07-20",
      "end": "2026-07-21",
      "progress": 100,
      "status": "Done",
      "dependsOn": [],
      "owner": "Sera",
      "next": "筛选五星重点客户"
    },
    {
      "id": "G004",
      "workstream": "CRM客户线",
      "task": "五星客户筛选",
      "start": "2026-07-22",
      "end": "2026-07-25",
      "progress": 30,
      "status": "Doing",
      "dependsOn": [
        "G003"
      ],
      "owner": "Sera",
      "next": "输出五星重点客户名单"
    },
    {
      "id": "G005",
      "workstream": "客户转化线",
      "task": "第一批注册/KYC推进",
      "start": "2026-07-25",
      "end": "2026-08-08",
      "progress": 0,
      "status": "Next",
      "dependsOn": [
        "G004"
      ],
      "owner": "Sera",
      "next": "按名单逐个推进注册与KYC"
    },
    {
      "id": "G006",
      "workstream": "交易测试线",
      "task": "首单交易测试",
      "start": "2026-07-24",
      "end": "2026-07-25",
      "progress": 0,
      "status": "Next",
      "dependsOn": [
        "G002"
      ],
      "owner": "Sera / 静格",
      "next": "周四/周五配合完成首单测试"
    },
    {
      "id": "G007",
      "workstream": "渠道拓展线",
      "task": "大数据客户筛选条件",
      "start": "2026-07-22",
      "end": "2026-07-26",
      "progress": 20,
      "status": "Blocked",
      "dependsOn": [],
      "owner": "Sera / Simon",
      "next": "请 Simon 协助调取大数据名单"
    },
    {
      "id": "G008",
      "workstream": "渠道拓展线",
      "task": "Oscar大客户名单对接",
      "start": "2026-07-25",
      "end": "2026-08-01",
      "progress": 0,
      "status": "Next",
      "dependsOn": [],
      "owner": "Sera / Oscar",
      "next": "获取高价值客户名单"
    },
    {
      "id": "G009",
      "workstream": "私密看板线",
      "task": "访问控制方案确认",
      "start": "2026-07-21",
      "end": "2026-07-23",
      "progress": 70,
      "status": "Doing",
      "dependsOn": [],
      "owner": "Sera / Kimi",
      "next": "完成 Cloudflare 私密部署与 Access 配置"
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
        {
          "title": "业务背景说明",
          "done": true
        },
        {
          "title": "页面结构与模块",
          "done": true
        },
        {
          "title": "COBO买币流程",
          "done": true
        },
        {
          "title": "POBO卖币流程",
          "done": true
        },
        {
          "title": "FAQ与客户话术",
          "done": true
        },
        {
          "title": "设计禁用词与合规注意",
          "done": true
        },
        {
          "title": "视觉参考图",
          "done": true
        },
        {
          "title": "提交设计团队并确认排期",
          "done": false
        }
      ]
    },
    {
      "id": "T002",
      "title": "TG客户CRM",
      "owner": "Sera",
      "status": "Doing",
      "progress": 80,
      "children": [
        {
          "title": "解析TG压缩包",
          "done": true
        },
        {
          "title": "生成客户CRM表",
          "done": true
        },
        {
          "title": "提取UID与KYC状态",
          "done": true
        },
        {
          "title": "五星客户筛选",
          "done": false
        },
        {
          "title": "注册/KYC推进名单",
          "done": false
        }
      ]
    },
    {
      "id": "T003",
      "title": "客户注册/KYC转化",
      "owner": "Sera",
      "status": "Next",
      "progress": 15,
      "children": [
        {
          "title": "确认首批唤醒客户",
          "done": false
        },
        {
          "title": "推动个人注册",
          "done": false
        },
        {
          "title": "推动机构注册",
          "done": false
        },
        {
          "title": "跟进KYC/KYB",
          "done": false
        },
        {
          "title": "推动首单成交",
          "done": false
        }
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
      "task": "确认 Simon 访问方式",
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
      "task": "请 Simon 协助调取大数据客户名单",
      "owner": "Sera / Simon",
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
// __FALLBACK_SYNC_END__

/* 需要 Supervisor 协助的 5 件事（固定展示） */
const FIXED_ASKS = [
  '大数据客户名单',
  'Oscar 大客户项目名单',
  '设计团队排期确认',
  '首单测试配合',
  '客户 KYC 状态确认'
];

/* 状态顺序与样式映射（Done 绿 / Doing 蓝 / Next 黄 / Blocked 红） */
const STATUS_ORDER = ['Done', 'Doing', 'Next', 'Blocked'];
const STATUS_CLS = { Done: 'done', Doing: 'doing', Next: 'next', Blocked: 'blocked' };
const STATUS_TEXT = { Done: '已完成', Doing: '进行中', Next: '待启动', Blocked: '已阻塞' };

/* KPI 小写状态 → 中文 */
const KPI_STATUS_TEXT = { done: '已完成', doing: '进行中', next: '待启动', blocked: '已阻塞' };

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

/* CRM 漏斗阶段简称（KPI 迷你漏斗条用） */
const FUNNEL_SHORT = ['咨询', '信息', '注册', 'KYC', '报价', '首单', '维护'];

/* 全局状态：当前生效的数据 + 筛选条件 */
const state = {
  kpi: [], pipeline: [], crmSummary: null, taskProgress: [],
  roadmap: [], gantt: [], taskTree: [], todo: [], milestones: []
};
const filterState = { query: '', status: 'all' };

/* 动效偏好：系统开启「减少动态效果」时跳过滚动动画 */
const REDUCED_MOTION = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 工具：创建 DOM 节点（统一用 textContent 防注入） ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* 千分位格式化 */
function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/* 通用迷你进度条：Done 绿 / Doing 蓝 / Next 黄 / Blocked 红 */
function buildPbar(status, pct, text) {
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

/* ---------- 数值滚动 count-up（进入视口后执行一次） ---------- */
function countUp(node, target, opts) {
  const options = opts || {};
  const format = options.format || ((v) => String(Math.round(v)));
  const duration = options.duration || 900;
  const finalText = () => format(target);

  // 先落终值：未进入视口 / 减少动效时也能正确呈现数据；
  // 进入视口后再从 0 播放一次滚动动画（纯增强，不影响可读性）
  node.textContent = finalText();
  if (REDUCED_MOTION || target === 0) return;
  const run = () => {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      node.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { run(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(node);
  } else {
    run();
  }
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

/* ---------- 01 主题切换（日间 / 夜间，localStorage 记忆） ---------- */
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
  syncThemeButtons(); // 品牌字标由 CSS 随主题自动切换
}

/* ---------- 02 执行摘要（4 卡 · 主数据突出 · 底部 next action） ---------- */
function renderSummary() {
  const grid = document.getElementById('sumGrid');
  grid.innerHTML = '';

  // 1) 总体进度 = roadmap 平均 progress
  const avg = state.roadmap.length
    ? Math.round(state.roadmap.reduce((s, r) => s + (Number(r.progress) || 0), 0) / state.roadmap.length)
    : 0;
  const slowest = state.roadmap.slice().sort((a, b) => a.progress - b.progress)[0];

  // 2) 本周完成 = todo 中 Done 数 / 总数
  const todoDone = state.todo.filter((t) => t.status === 'Done').length;
  const todoTotal = state.todo.length;
  const nextTodo = state.todo
    .filter((t) => t.status !== 'Done')
    .slice()
    .sort((a, b) => (a.priority + a.due < b.priority + b.due ? -1 : 1))[0];

  // 3) 当前阻塞 = pipeline + gantt + todo 中 Blocked 总数
  const blockedItems = state.pipeline.filter((p) => p.status === 'Blocked');
  const blockers =
    blockedItems.length +
    state.gantt.filter((g) => g.status === 'Blocked').length +
    state.todo.filter((t) => t.status === 'Blocked').length;

  // 4) 下一里程碑 = milestones 中最早非 Done 项
  const nextMilestone = state.milestones
    .filter((m) => m.status !== 'Done')
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const milestoneGantt = nextMilestone
    ? state.gantt.find((g) => g.task === nextMilestone.title)
    : null;

  const cards = [
    {
      label: '总体进度',
      badge: null,
      accent: 'ac-blue',
      build(body) {
        const num = el('div', 'sum-value', '0%');
        countUp(num, avg, { format: (v) => Math.round(v) + '%' });
        body.appendChild(num);
        body.appendChild(el('div', 'sum-sub', state.roadmap.length + ' 条主线平均进度'));
      },
      next: slowest ? '重点推进「' + slowest.name + '」：' + slowest.target : '保持当前节奏'
    },
    {
      label: '本周完成',
      badge: null,
      accent: 'ac-green',
      build(body) {
        const num = el('div', 'sum-value', '0/' + todoTotal);
        countUp(num, todoDone, { format: (v) => Math.round(v) + '/' + todoTotal });
        body.appendChild(num);
        body.appendChild(el('div', 'sum-sub', '本周待办已完成 / 总数'));
      },
      next: nextTodo ? nextTodo.task + '（' + nextTodo.due.slice(5) + ' 截止）' : '本周待办全部完成'
    },
    {
      label: '当前阻塞',
      badge: blockers > 0 ? { cls: 'badge-blocked', text: '需协助' } : { cls: 'badge-done', text: '畅通' },
      accent: blockers > 0 ? 'ac-red' : 'ac-green',
      build(body) {
        const num = el('div', 'sum-value', '0');
        countUp(num, blockers, { format: (v) => String(Math.round(v)) });
        body.appendChild(num);
        body.appendChild(el('div', 'sum-sub', 'Pipeline + 甘特 + 待办阻塞总数'));
      },
      next: blockedItems.length ? blockedItems[0].next : '无阻塞，保持推进节奏'
    },
    {
      label: '下一里程碑',
      badge: nextMilestone ? { cls: 'badge-' + (STATUS_CLS[nextMilestone.status] || 'next'), text: STATUS_TEXT[nextMilestone.status] || nextMilestone.status } : null,
      accent: 'ac-yellow',
      isMilestone: true,
      build(body) {
        body.appendChild(el('div', 'sum-value sum-value-text', nextMilestone ? nextMilestone.title : '暂无'));
        body.appendChild(el('div', 'sum-sub', nextMilestone ? nextMilestone.date + ' · ' + (STATUS_TEXT[nextMilestone.status] || nextMilestone.status) : '暂无待办里程碑'));
      },
      next: milestoneGantt ? milestoneGantt.next : '按期推进，提前同步风险'
    }
  ];

  cards.forEach((c) => {
    const card = el('div', 'sum-card ' + c.accent);
    const head = el('div', 'sum-head');
    head.appendChild(el('div', 'sum-label', c.label));
    if (c.badge) head.appendChild(el('span', 'badge ' + c.badge.cls, c.badge.text));
    card.appendChild(head);
    c.build(card);
    const next = el('div', 'sum-next');
    next.appendChild(el('span', 'sn-k', '下一步'));
    next.appendChild(el('span', null, c.next));
    card.appendChild(next);
    grid.appendChild(card);
  });
}

/* ---------- 03 动态图形 KPI（按 component 字段渲染 6 卡） ---------- */

/* 统一卡片骨架：顶部 label + badge / 中部组件 / 数值 / 底部 next action */
function kpiCardShell(item) {
  const card = el('div', 'kpi-card st-' + item.status);
  const head = el('div', 'kpi-head');
  head.appendChild(el('div', 'kpi-label', item.label));
  head.appendChild(el('span', 'badge badge-' + (STATUS_CLS[item.status.charAt(0).toUpperCase() + item.status.slice(1)] || 'next'), KPI_STATUS_TEXT[item.status] || item.status));
  card.appendChild(head);
  return card;
}

function kpiValueRow(item, numNode, extraText) {
  const row = el('div', 'kpi-value-row');
  row.appendChild(numNode);
  const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
  row.appendChild(el('span', 'kpi-pct', (extraText ? extraText + ' · ' : '') + pct + '%'));
  row.appendChild(el('span', 'kpi-target', '目标：' + item.target));
  return row;
}

function kpiNextRow(item) {
  const next = el('div', 'kpi-next');
  next.appendChild(el('span', 'sn-k', '下一步'));
  next.appendChild(el('span', null, item.next || item.trend || '—'));
  return next;
}

/* segments：机构注册 —— 6 分段格，完成点亮 */
function kpiBodySegments(item) {
  const body = el('div', 'kpi-body');
  const segs = el('div', 'kpi-segments');
  for (let i = 0; i < item.total; i++) {
    const seg = el('div', 'kpi-seg' + (i < item.done ? ' seg-on' : ''));
    seg.title = (i < item.done ? '已完成 ' : '待推进 ') + (i + 1) + '/' + item.total;
    segs.appendChild(seg);
  }
  body.appendChild(segs);
  return body;
}

/* water：个人注册 —— 垂直水箱 + 波纹 */
function kpiBodyWater(item) {
  const body = el('div', 'kpi-body');
  const pct = item.total > 0 ? item.done / item.total : 0;

  const tank = el('div', 'kpi-tank');
  const water = el('div', 'kpi-water');
  // 视觉保留少量底水以便呈现波纹，数值以文本为准
  water.style.height = Math.max(pct * 100, 5) + '%';
  tank.appendChild(water);
  tank.appendChild(el('div', 'kpi-water-label', Math.round(pct * 100) + '%'));
  body.appendChild(tank);

  const side = el('div', 'kpi-side');
  side.appendChild(el('div', 'ks-note', item.trend || ''));
  side.appendChild(el('div', 'ks-note', '水位 = 已完成注册占比'));
  body.appendChild(side);
  return body;
}

/* money：交易收入 —— 发光液态条 */
function kpiBodyMoney(item) {
  const body = el('div', 'kpi-body');
  const pct = item.total > 0 ? (item.done / item.total) * 100 : 0;

  const wrap = el('div', 'kpi-money');
  const track = el('div', 'money-track');
  const fill = el('div', 'money-fill');
  // 0 进度时保留一丝光泽底条，数值以文本为准
  fill.style.width = Math.max(pct, 3) + '%';
  track.appendChild(fill);
  wrap.appendChild(track);
  wrap.appendChild(el('div', 'ks-note', item.trend || ''));
  body.appendChild(wrap);
  return body;
}

/* ring：设计交付包 —— SVG 进度环 */
function kpiBodyRing(item) {
  const body = el('div', 'kpi-body');
  const pct = item.total > 0 ? item.done / item.total : 0;
  const R = 30;
  const CIRC = 2 * Math.PI * R;

  const wrap = el('div', 'kpi-ring-wrap');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kpi-ring');
  svg.setAttribute('width', '74');
  svg.setAttribute('height', '74');
  svg.setAttribute('viewBox', '0 0 74 74');

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'ringGrad');
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '1'); grad.setAttribute('y2', '1');
  [['0%', '#FFE000'], ['100%', '#18A7E3']].forEach(([off, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', off);
    stop.setAttribute('stop-color', color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const bg = document.createElementNS(NS, 'circle');
  bg.setAttribute('class', 'ring-bg');
  bg.setAttribute('cx', '37'); bg.setAttribute('cy', '37'); bg.setAttribute('r', String(R));
  svg.appendChild(bg);

  const fg = document.createElementNS(NS, 'circle');
  fg.setAttribute('class', 'ring-fg');
  fg.setAttribute('cx', '37'); fg.setAttribute('cy', '37'); fg.setAttribute('r', String(R));
  fg.setAttribute('stroke-dasharray', CIRC.toFixed(1));
  fg.setAttribute('stroke-dashoffset', CIRC.toFixed(1));
  svg.appendChild(fg);
  wrap.appendChild(svg);

  const label = el('div', 'kpi-ring-label');
  const pctNode = el('span', null, '0%');
  countUp(pctNode, Math.round(pct * 100), { format: (v) => Math.round(v) + '%' });
  label.appendChild(pctNode);
  label.appendChild(el('small', null, item.done + '/' + item.total + ' 项'));
  wrap.appendChild(label);
  body.appendChild(wrap);

  // 进入视口后动画收环
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fg.setAttribute('stroke-dashoffset', (CIRC * (1 - pct)).toFixed(1));
    });
  });

  const side = el('div', 'kpi-side');
  side.appendChild(el('div', 'ks-note', item.trend || ''));
  body.appendChild(side);
  return body;
}

/* funnel：客户 Pipeline —— 迷你多阶段条 */
function kpiBodyFunnel(item) {
  const body = el('div', 'kpi-body');
  const wrap = el('div', 'kpi-minifunnel');

  const stages = el('div', 'mf-stages');
  const labels = el('div', 'mf-labels');
  const funnel = (state.crmSummary && state.crmSummary.funnel) || [];
  const max = Math.max.apply(null, funnel.map((f) => f.count).concat([1]));
  FUNNEL_SHORT.forEach((short, i) => {
    const count = funnel[i] ? funnel[i].count : 0;
    const seg = el('div', 'mf-seg' + (count > 0 ? '' : ' mf-empty'));
    seg.style.height = count > 0 ? Math.max((count / max) * 100, 12) + '%' : '8%';
    seg.title = (funnel[i] ? funnel[i].stage : short) + '：' + count;
    stages.appendChild(seg);
    labels.appendChild(el('span', null, short));
  });
  wrap.appendChild(stages);
  wrap.appendChild(labels);
  body.appendChild(wrap);
  return body;
}

/* multi：渠道拓展 —— 3 条子轨 + 合计 */
function kpiBodyMulti(item) {
  const body = el('div', 'kpi-body');
  const wrap = el('div', 'kpi-multi');
  (item.sub || []).forEach((s) => {
    const pct = s.total > 0 ? (s.done / s.total) * 100 : 0;
    const row = el('div', 'multi-row');
    row.appendChild(el('span', 'multi-name', s.label));
    const track = el('div', 'multi-track');
    const fill = el('div', 'multi-fill');
    fill.style.width = Math.max(pct, 0) + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'multi-val', s.done + '/' + s.total));
    wrap.appendChild(row);
  });
  body.appendChild(wrap);
  return body;
}

function renderKpi(list) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  list.forEach((item) => {
    const card = kpiCardShell(item);

    // 中部动态组件
    let numNode;
    switch (item.component) {
      case 'segments':
        card.appendChild(kpiBodySegments(item));
        numNode = el('div', 'kpi-num', '0/' + item.total);
        countUp(numNode, item.done, { format: (v) => Math.round(v) + '/' + item.total });
        card.appendChild(kpiValueRow(item, numNode, item.unit));
        break;
      case 'water':
        card.appendChild(kpiBodyWater(item));
        numNode = el('div', 'kpi-num', '0/' + item.total);
        countUp(numNode, item.done, { format: (v) => Math.round(v) + '/' + item.total });
        card.appendChild(kpiValueRow(item, numNode, item.unit));
        break;
      case 'money':
        card.appendChild(kpiBodyMoney(item));
        numNode = el('div', 'kpi-num', '0');
        countUp(numNode, item.done, { format: (v) => fmtNum(Math.round(v)), duration: 1200 });
        card.appendChild(kpiValueRow(item, numNode, '/ ' + fmtNum(item.total) + ' ' + (item.unit || '')));
        break;
      case 'ring':
        card.appendChild(kpiBodyRing(item));
        numNode = el('div', 'kpi-num', item.current);
        card.appendChild(kpiValueRow(item, numNode, item.unit));
        break;
      case 'funnel': {
        card.appendChild(kpiBodyFunnel(item));
        numNode = el('div', 'kpi-num', item.current);
        const row = el('div', 'kpi-value-row');
        row.appendChild(numNode);
        row.appendChild(el('span', 'kpi-target', '目标：' + item.target));
        card.appendChild(row);
        break;
      }
      case 'multi':
        card.appendChild(kpiBodyMulti(item));
        numNode = el('div', 'kpi-num', '0/' + item.total);
        countUp(numNode, item.done, { format: (v) => Math.round(v) + '/' + item.total });
        card.appendChild(kpiValueRow(item, numNode, '合计 ' + item.unit));
        break;
      default: {
        const body = el('div', 'kpi-body');
        body.appendChild(buildPbar(item.status, item.total ? (item.done / item.total) * 100 : 0, item.done + '/' + item.total));
        card.appendChild(body);
        numNode = el('div', 'kpi-num', item.current);
        card.appendChild(kpiValueRow(item, numNode, item.unit));
      }
    }

    card.appendChild(kpiNextRow(item));
    grid.appendChild(card);
  });
}

/* ---------- 04 甘特图（玻璃时间推进图 · 胶囊条 · 悬浮详情） ---------- */
function ganttDayOffset(dateStr) {
  const base = new Date(GANTT_START + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - base) / 86400000);
}

function renderGantt(list) {
  const wrap = document.getElementById('ganttChart');
  const tip = document.getElementById('ganttTip');
  const panel = wrap.closest('.gantt-panel');
  wrap.innerHTML = '';

  // 表头：左列占位 + 6 个周列
  const head = el('div', 'gantt-head');
  head.appendChild(el('div', 'gantt-corner', 'Workstream / 任务'));
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
    if (endIdx >= 0 && startIdx <= GANTT_DAYS - 1) {
      if (endIdx < startIdx) endIdx = startIdx;
      const bar = el('div', 'gantt-bar gb-' + (STATUS_CLS[g.status] || 'next'));
      bar.style.left = ((startIdx / GANTT_DAYS) * 100).toFixed(2) + '%';
      bar.style.width = (((endIdx - startIdx + 1) / GANTT_DAYS) * 100).toFixed(2) + '%';
      bar.textContent = g.task + ' · ' + g.progress + '%';

      // 悬浮详情层：负责人 / 起止 / 进度 / 下一步 / 依赖
      bar.addEventListener('mouseenter', () => {
        tip.innerHTML = '';
        tip.appendChild(el('div', 'gt-title', g.task));
        const rows = [
          ['状态', (STATUS_TEXT[g.status] || g.status) + ' · ' + g.progress + '%'],
          ['负责人', g.owner || '—'],
          ['起止', g.start + ' ~ ' + g.end],
          ['下一步', g.next || '—'],
          ['依赖', g.dependsOn && g.dependsOn.length ? g.dependsOn.join('、') : '无']
        ];
        rows.forEach(([k, v]) => {
          const r = el('div', 'gt-row');
          r.appendChild(el('span', 'gt-k', k));
          r.appendChild(el('span', 'gt-v', v));
          tip.appendChild(r);
        });
        tip.hidden = false;
      });
      bar.addEventListener('mousemove', (e) => {
        const rect = panel.getBoundingClientRect();
        let x = e.clientX - rect.left + 14;
        let y = e.clientY - rect.top + 14;
        x = Math.max(8, Math.min(x, rect.width - 262));
        y = Math.max(8, Math.min(y, rect.height - tip.offsetHeight - 8));
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      });
      bar.addEventListener('mouseleave', () => { tip.hidden = true; });

      track.appendChild(bar);
    }
    row.appendChild(track);
    wrap.appendChild(row);
  });

  // 图例：Done 绿 / Doing 蓝 / Next 黄 / Blocked 红（中文说明）
  const legend = document.getElementById('ganttLegend');
  legend.innerHTML = '';
  STATUS_ORDER.forEach((s) => {
    const item = el('span', 'legend-item');
    item.appendChild(el('span', 'legend-swatch gantt-bar gb-' + STATUS_CLS[s]));
    item.appendChild(document.createTextNode(s + ' ' + STATUS_TEXT[s]));
    legend.appendChild(item);
  });
}

/* ---------- 5.1 Workstream Progress Cards（roadmap.json 6 条主线） ---------- */
function renderWorkstreams(list) {
  const grid = document.getElementById('wsGrid');
  grid.innerHTML = '';
  list.forEach((ws) => {
    const card = el('div', 'ws-card');

    const head = el('div', 'ws-head');
    head.appendChild(el('span', 'ws-id', ws.id));
    head.appendChild(el('span', 'ws-name', ws.name));
    head.appendChild(el('span', 'badge badge-' + (STATUS_CLS[ws.status] || 'next'), STATUS_TEXT[ws.status] || ws.status));
    card.appendChild(head);

    card.appendChild(el('div', 'ws-goal', ws.goal));

    const barRow = el('div', 'ws-bar-row');
    const track = el('div', 'ws-track');
    const fill = el('div', 'ws-fill wf-' + (STATUS_CLS[ws.status] || 'next'));
    track.appendChild(fill);
    barRow.appendChild(track);
    const pctNode = el('span', 'ws-pct', '0%');
    countUp(pctNode, ws.progress, { format: (v) => Math.round(v) + '%' });
    barRow.appendChild(pctNode);
    card.appendChild(barRow);
    // 进度条直接落终值（与百分比数字一致，CSS transition 负责展开动效）
    fill.style.width = ws.progress + '%';

    card.appendChild(el('div', 'ws-owner', '负责人：' + ws.owner));

    const next = el('div', 'ws-next');
    next.appendChild(el('span', 'sn-k', '下一步'));
    next.appendChild(el('span', null, ws.target));
    card.appendChild(next);

    grid.appendChild(card);
  });
}

/* ---------- 06.1 主任务树（可展开卡片） ---------- */
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
    headBtn.appendChild(el('span', 'badge badge-' + (STATUS_CLS[t.status] || 'next'), STATUS_TEXT[t.status] || t.status));
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

/* ---------- 06.2 工作 Pipeline 看板（紧凑版） ---------- */
function buildTaskCard(item) {
  const card = el('article', 'task-card');
  card.dataset.status = item.status;
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
  footer.appendChild(el('span', 'badge badge-' + STATUS_CLS[item.status], STATUS_TEXT[item.status] || item.status));
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

/* ---------- 搜索 + 状态筛选（联动：看板卡片 + 待办行） ---------- */
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
    document.getElementById('count-' + s).textContent = visible;
    let empty = body.querySelector('.col-empty');
    if (visible === 0) {
      if (!empty) body.appendChild(el('div', 'col-empty', '暂无匹配的工作项'));
    } else if (empty) {
      empty.remove();
    }
  });

  // 待办行同步按搜索词过滤
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
        const td = el('td', 'todo-empty', '暂无匹配的待办项');
        td.colSpan = 5;
        emptyRow.appendChild(td);
        todoBody.appendChild(emptyRow);
      }
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }
}

/* ---------- 07 CRM 转化漏斗（含转化率 / 下一步） + CRM 分级 ---------- */
function renderCrm(crm) {
  const rows = document.getElementById('funnelRows');
  rows.innerHTML = '';
  const head = el('div', 'funnel-row funnel-head');
  ['阶段', '占比', '数量', '转化率', '下一步'].forEach((h) => head.appendChild(el('span', null, h)));
  rows.appendChild(head);

  const max = Math.max.apply(null, crm.funnel.map((f) => f.count).concat([1]));
  const base = crm.funnel.length ? crm.funnel[0].count : 1;
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
    const prev = i === 0 ? null : crm.funnel[i - 1].count;
    const convText = i === 0 ? '100%' : (prev > 0 ? Math.round((f.count / prev) * 100) + '%' : '–');
    row.appendChild(el('div', 'funnel-conv', convText));
    row.appendChild(el('div', 'funnel-next', f.next || '—'));
    rows.appendChild(row);
  });

  document.getElementById('crmNote').textContent = crm.note || '';

  const totalNode = document.getElementById('crmTotal');
  countUp(totalNode, crm.total, { format: (v) => String(Math.round(v)) });
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

/* ---------- 06.3 Live Task Progress ---------- */
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
    tdStatus.appendChild(el('span', 'badge badge-' + statusCls, STATUS_TEXT[t.status] || t.status));
    tr.appendChild(tdStatus);

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

/* ---------- 08 每周待办（P0 高亮 / 过期标红 / 搜索过滤） ---------- */
const TODAY = '2026-07-21';

function renderTodo(list) {
  const tbody = document.getElementById('todoTableBody');
  tbody.innerHTML = '';
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

    const tdDue = el('td', 'todo-due', t.due);
    if (t.due < TODAY && t.status !== 'Done') {
      tdDue.appendChild(el('span', 'todo-overdue', '已过期'));
    }
    tr.appendChild(tdDue);

    const tdStatus = el('td', null);
    tdStatus.appendChild(el('span', 'badge badge-' + (STATUS_CLS[t.status] || 'next'), STATUS_TEXT[t.status] || t.status));
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

/* ---------- 09 阻塞事项 + 固定协助清单 ---------- */
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

  const asks = document.getElementById('fixedAsks');
  asks.innerHTML = '';
  FIXED_ASKS.forEach((a) => asks.appendChild(el('li', null, a)));
}

/* ---------- 10 关键里程碑列表 ---------- */
function renderMilestones(list) {
  const wrap = document.getElementById('milestoneList');
  wrap.innerHTML = '';
  list
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((m) => {
      const li = document.createElement('li');
      li.appendChild(el('span', 'ms-date', m.date.slice(5)));
      li.appendChild(el('span', 'ms-title', m.title));
      li.appendChild(el('span', 'badge badge-' + (STATUS_CLS[m.status] || 'next'), STATUS_TEXT[m.status] || m.status));
      wrap.appendChild(li);
    });
}

/* ---------- 导出：导出 Pipeline JSON 下载 ---------- */
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
  // 主题切换：日间 / 夜间，写入 localStorage 记忆
  document.getElementById('themeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    setTheme(btn.dataset.mode);
  });

  // 搜索框：实时过滤（看板卡片 + 待办行）
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

  // 导出按钮
  document.getElementById('btnExport').addEventListener('click', exportPipeline);
  // 更新数据 / 新建工作项 为占位样式按钮，暂不绑定功能
}

/* ---------- 启动：加载 9 个 JSON，任一失败自动用 FALLBACK ---------- */
async function init() {
  const [
    kpi, pipeline, crmSummary, taskProgress,
    roadmap, gantt, taskTree, todo, milestones
  ] = await Promise.all([
    loadJson('data/kpi.json', FALLBACK.kpi),
    loadJson('data/pipeline.json', FALLBACK.pipeline),
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
  state.crmSummary = crmSummary;
  state.taskProgress = taskProgress;
  state.roadmap = roadmap;
  state.gantt = gantt;
  state.taskTree = taskTree;
  state.todo = todo;
  state.milestones = milestones;

  syncThemeButtons();
  renderSummary();
  renderKpi(state.kpi);
  renderGantt(state.gantt);
  renderWorkstreams(state.roadmap);
  renderTaskTree(state.taskTree);
  renderKanban(state.pipeline);
  renderCrm(state.crmSummary);
  renderTaskProgress(state.taskProgress);
  renderTodo(state.todo);
  renderBlocked(state.pipeline);
  renderMilestones(state.milestones);
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
