/* ============================================================
   HTX OTC PIP 执行看板 — app.js
   纯原生 JS：fetch 加载 data/*.json，失败自动回退内置 FALLBACK
   日间 / 夜间双主题 · 左侧目录 scroll-spy · 11 大模块 · 10 个数据源
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
      "label": "客户资料 / 手册",
      "component": "ring",
      "done": 1,
      "total": 1,
      "unit": "套",
      "target": "1套",
      "current": "1/1",
      "trend": "资料包已整理完成",
      "next": "提交设计团队排版",
      "status": "done"
    },
    {
      "label": "客户 Pipeline",
      "component": "funnel",
      "done": 1,
      "total": 1,
      "unit": "套",
      "target": "1套",
      "current": "1/1",
      "trend": "TG 客户资料已汇总",
      "next": "筛选五星客户",
      "status": "done"
    },
    {
      "label": "渠道拓展",
      "component": "multi",
      "done": 0,
      "total": 26,
      "unit": "个",
      "target": "Partner≥7 · KOL≥10 · 销售≥6 · 活动≥3",
      "current": "0/26",
      "trend": "需大数据名单与销售名单",
      "next": "确认名单来源并启动触达",
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
        },
        {
          "label": "活动",
          "done": 0,
          "total": 3
        }
      ]
    }
  ],
  "gantt": [
    {
      "id": "L1",
      "name": "业务手册 / FAQ",
      "owner": "Sera",
      "status": "Doing",
      "progress": 80,
      "start": "2026-07-21",
      "end": "2026-07-29",
      "next": "补充 FAQ 话术与禁用词审校",
      "children": [
        {
          "task": "客户手册框架与内容",
          "start": "2026-07-21",
          "end": "2026-07-23",
          "status": "Doing",
          "progress": 70
        },
        {
          "task": "FAQ 与客户话术",
          "start": "2026-07-23",
          "end": "2026-07-25",
          "status": "Next",
          "progress": 0
        },
        {
          "task": "禁用词与合规审校",
          "start": "2026-07-25",
          "end": "2026-07-29",
          "status": "Next",
          "progress": 0
        }
      ]
    },
    {
      "id": "L2",
      "name": "BD 计划文档",
      "owner": "Sera",
      "status": "Doing",
      "progress": 70,
      "start": "2026-07-21",
      "end": "2026-07-31",
      "next": "完善渠道拓展与目标拆解章节",
      "children": [
        {
          "task": "绩效目标拆解",
          "start": "2026-07-21",
          "end": "2026-07-24",
          "status": "Doing",
          "progress": 60
        },
        {
          "task": "获客路径与渠道计划",
          "start": "2026-07-24",
          "end": "2026-07-28",
          "status": "Next",
          "progress": 0
        },
        {
          "task": "文档定稿与内部对齐",
          "start": "2026-07-28",
          "end": "2026-07-31",
          "status": "Next",
          "progress": 0
        }
      ]
    },
    {
      "id": "L3",
      "name": "设计交付包",
      "owner": "Sera",
      "status": "Doing",
      "progress": 90,
      "start": "2026-07-21",
      "end": "2026-07-24",
      "next": "提交设计团队并确认排期",
      "children": [
        {
          "task": "资料整理（背景/流程/FAQ/禁用词/参考图）",
          "start": "2026-07-21",
          "end": "2026-07-22",
          "status": "Done",
          "progress": 100
        },
        {
          "task": "提交设计团队",
          "start": "2026-07-22",
          "end": "2026-07-23",
          "status": "Doing",
          "progress": 60
        },
        {
          "task": "确认排期与反馈",
          "start": "2026-07-23",
          "end": "2026-07-24",
          "status": "Next",
          "progress": 0
        }
      ]
    },
    {
      "id": "L4",
      "name": "客户 Pipeline 建档",
      "owner": "Sera",
      "status": "Doing",
      "progress": 80,
      "start": "2026-07-21",
      "end": "2026-07-25",
      "next": "输出五星重点客户名单",
      "children": [
        {
          "task": "TG 客户 CRM 初版",
          "start": "2026-07-21",
          "end": "2026-07-21",
          "status": "Done",
          "progress": 100
        },
        {
          "task": "五星重点客户筛选",
          "start": "2026-07-22",
          "end": "2026-07-25",
          "status": "Doing",
          "progress": 30
        },
        {
          "task": "注册/KYC 推进名单",
          "start": "2026-07-25",
          "end": "2026-07-25",
          "status": "Next",
          "progress": 0
        }
      ]
    },
    {
      "id": "L5",
      "name": "注册 / KYC / 首单推进",
      "owner": "Sera / 静格",
      "status": "Next",
      "progress": 15,
      "start": "2026-07-25",
      "end": "2026-08-08",
      "next": "确认首批唤醒客户并启动注册推进",
      "children": [
        {
          "task": "确认首批唤醒客户",
          "start": "2026-07-25",
          "end": "2026-07-26",
          "status": "Next",
          "progress": 0
        },
        {
          "task": "推动个人/机构注册",
          "start": "2026-07-26",
          "end": "2026-08-04",
          "status": "Next",
          "progress": 0
        },
        {
          "task": "跟进 KYC/KYB",
          "start": "2026-07-28",
          "end": "2026-08-06",
          "status": "Next",
          "progress": 0
        },
        {
          "task": "首单交易测试（配合静格）",
          "start": "2026-07-24",
          "end": "2026-07-25",
          "status": "Next",
          "progress": 0
        }
      ]
    },
    {
      "id": "L6",
      "name": "周报 / CRIB 复盘",
      "owner": "Sera",
      "status": "Doing",
      "progress": 20,
      "start": "2026-07-21",
      "end": "2026-08-31",
      "next": "本周五完成首次周更",
      "children": [
        {
          "task": "每周看板数据更新",
          "start": "2026-07-21",
          "end": "2026-08-31",
          "status": "Doing",
          "progress": 20
        },
        {
          "task": "月度 CRIB 复盘",
          "start": "2026-08-25",
          "end": "2026-08-31",
          "status": "Next",
          "progress": 0
        }
      ]
    }
  ],
  "roadmap": [
    {
      "id": "WS01",
      "name": "业务资料建设",
      "goal": "业务手册/FAQ、BD 计划文档、设计交付包",
      "progress": 80,
      "status": "Doing",
      "owner": "Sera",
      "subLabel": "手册 / FAQ / 流程说明",
      "subDone": 9,
      "subTotal": 12,
      "next": "提交设计团队",
      "risk": "设计排期待确认"
    },
    {
      "id": "WS02",
      "name": "客户 Pipeline 建档",
      "goal": "TG 存量客户汇总分级与五星客户筛选",
      "progress": 80,
      "status": "Doing",
      "owner": "Sera",
      "subLabel": "CRM / 分级 / UID / KYC状态",
      "subDone": 4,
      "subTotal": 5,
      "next": "筛选五星客户",
      "risk": "数据需持续清洗"
    },
    {
      "id": "WS03",
      "name": "客户转化推进",
      "goal": "注册/KYC/首单（个人≥19、机构≥6、收入≥26,000 USDT）",
      "progress": 15,
      "status": "Next",
      "owner": "Sera",
      "subLabel": "注册 / KYC / 首单",
      "subDone": 0,
      "subTotal": 5,
      "next": "启动首批客户跟进",
      "risk": "交易测试未完成"
    },
    {
      "id": "WS04",
      "name": "渠道拓展",
      "goal": "大数据名单、销售转介、Partner/KOL",
      "progress": 10,
      "status": "Blocked",
      "owner": "Sera",
      "subLabel": "销售 / Partner / KOL",
      "subDone": 0,
      "subTotal": 3,
      "next": "获取名单和资源",
      "risk": "需 Simon 协助"
    },
    {
      "id": "WS05",
      "name": "周报与复盘",
      "goal": "每周更新看板，月底 CRIB 复盘",
      "progress": 20,
      "status": "Doing",
      "owner": "Sera",
      "subLabel": "周报 / CRIB / 反馈",
      "subDone": 1,
      "subTotal": 4,
      "next": "建立每周更新机制",
      "risk": "需持续输入"
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
      "status": "Done",
      "workstream": "设计交付包",
      "due": "2026-07-22"
    },
    {
      "module": "TG客户资料汇总",
      "pipGoal": "客户Pipeline建设",
      "progress": "已完成初版CRM表",
      "output": "客户等级、UID、地区、方向、金额、KYC状态、当前阶段",
      "next": "筛选五星重点客户，推动注册/KYC/首单",
      "owner": "Sera",
      "priority": "P0",
      "status": "Done",
      "workstream": "客户 Pipeline 建档",
      "due": "2026-07-21"
    },
    {
      "module": "高价值客户筛选",
      "pipGoal": "新增交易收入≥26,000 USDT",
      "progress": "进行中",
      "output": "五星客户、机构客户、Partner线索",
      "next": "按金额和成交概率安排优先跟进",
      "owner": "Sera",
      "priority": "P0",
      "status": "Doing",
      "workstream": "注册 / KYC / 首单推进",
      "due": "2026-07-25"
    },
    {
      "module": "注册/KYC推进",
      "pipGoal": "新增个人注册≥19人；机构注册≥6家",
      "progress": "待推进",
      "output": "客户资料字段表、KYC状态表",
      "next": "逐个确认UID、注册状态、KYC状态",
      "owner": "Sera",
      "priority": "P0",
      "status": "Next",
      "workstream": "注册 / KYC / 首单推进",
      "due": "2026-08-08"
    },
    {
      "module": "首单交易测试",
      "pipGoal": "推动首批交易转化",
      "progress": "待执行",
      "output": "COBO/POBO流程说明",
      "next": "配合静格完成周四/周五首单测试",
      "owner": "Sera / 静格",
      "priority": "P0",
      "status": "Next",
      "workstream": "注册 / KYC / 首单推进",
      "due": "2026-07-25"
    },
    {
      "module": "大数据客户名单",
      "pipGoal": "内部获客路径",
      "progress": "待协作",
      "output": "客户筛选条件草案",
      "next": "请 Simon 协助调取名单",
      "owner": "Sera / Simon",
      "priority": "P1",
      "status": "Blocked",
      "workstream": "渠道拓展",
      "due": "2026-07-26"
    },
    {
      "module": "集团销售转介",
      "pipGoal": "对接集团销售≥6次",
      "progress": "待启动",
      "output": "客户转介字段表",
      "next": "联系Oscar/销售团队获取高价值名单",
      "owner": "Sera / Oscar",
      "priority": "P1",
      "status": "Next",
      "workstream": "渠道拓展",
      "due": "2026-08-01"
    },
    {
      "module": "Partner/KOL拓展",
      "pipGoal": "Partner≥7家；KOL≥10位",
      "progress": "待启动",
      "output": "Partner/商家线索表",
      "next": "制作合作介绍物料并开始触达",
      "owner": "Sera",
      "priority": "P1",
      "status": "Next",
      "workstream": "渠道拓展",
      "due": "2026-08-05"
    },
    {
      "module": "周报与CRIB复盘",
      "pipGoal": "PIP过程管理",
      "progress": "待固化",
      "output": "Pipeline字段和周报结构",
      "next": "每周更新进度，月底输出CRIB复盘",
      "owner": "Sera",
      "priority": "P1",
      "status": "Next",
      "workstream": "周报 / CRIB 复盘",
      "due": "2026-07-25"
    }
  ],
  "todo": [
    {
      "task": "提交设计交付包",
      "owner": "Sera",
      "due": "2026-07-22",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "筛选 TOP 五星客户",
      "owner": "Sera",
      "due": "2026-07-23",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "确认访问权限",
      "owner": "Sera / Simon",
      "due": "2026-07-23",
      "priority": "P0",
      "status": "Doing"
    },
    {
      "task": "配合首单测试",
      "owner": "Sera / 静格",
      "due": "2026-07-25",
      "priority": "P0",
      "status": "Next"
    },
    {
      "task": "获取大数据名单",
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
  ],
  "weeklyLog": {
    "cadence": "本看板每周更新一次",
    "updatedAt": "2026-07-21",
    "done": [
      "完成 OTC 设计交付包整理",
      "完成 TG 客户 CRM 初版",
      "重构 PIP 绩效看板信息架构",
      "明确 KPI、甘特图、依赖关系图与 Pipeline 结构"
    ]
  },
  "blockers": {
    "updatedAt": "2026-07-21",
    "current": [
      "大数据客户名单待确认",
      "设计团队排期待确认",
      "首单测试需跨团队配合",
      "访问权限方式待确认"
    ],
    "asks": [
      "确认客户名单筛选条件",
      "协调 Oscar / 销售同步高价值客户",
      "确认设计交付优先级",
      "确认访问权限方式",
      "必要时协调首单测试资源"
    ]
  },
  "resources": [
    {
      "id": "R001",
      "title": "客户 CRM 汇总表",
      "type": "Excel",
      "module": "客户 Pipeline",
      "status": "已整理",
      "updatedAt": "2026-07-21",
      "description": "TG 存量客户汇总与分级结果，公网版本仅放脱敏摘要。",
      "url": "assets/files/customer-crm-summary.xlsx"
    },
    {
      "id": "R002",
      "title": "OTC 设计交付包",
      "type": "Markdown Pack",
      "module": "设计交付",
      "status": "待提交",
      "updatedAt": "2026-07-21",
      "description": "业务背景、页面结构、COBO/POBO、FAQ、禁用词与视觉参考。",
      "url": "assets/files/design-brief/"
    },
    {
      "id": "R003",
      "title": "设计团队交互包",
      "type": "Design Package",
      "module": "UI交付",
      "status": "待同步",
      "updatedAt": "2026-07-21",
      "description": "由设计团队提供或待设计团队确认的交互资料。",
      "url": "assets/files/design-interaction-package/"
    },
    {
      "id": "R004",
      "title": "渠道拓展执行计划",
      "type": "Document",
      "module": "渠道拓展",
      "status": "待完善",
      "updatedAt": "2026-07-21",
      "description": "集团销售、大数据名单、Partner/KOL 的触达计划与节奏。",
      "url": "assets/files/channel-expansion-plan.md"
    }
  ],
  "tasks": {
    "version": 1,
    "updatedAt": "2026-07-22T09:00:00+08:00",
    "tasks": [
      {
        "id": "T-0001",
        "title": "提交设计交付包",
        "status": "进行中",
        "priority": "P0",
        "workstream": "设计交付包",
        "owner": "Sera",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "dueAt": "2026-07-22T18:00:00+08:00",
        "remindAt": "2026-07-22T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": null,
        "progress": 80,
        "nextAction": "提交设计团队并确认排期",
        "outputCondition": "设计团队确认收到交付包并给出排期",
        "result": null,
        "source": "seed",
        "dependencies": [],
        "updatedBy": "seed",
        "completionEvidence": null
      },
      {
        "id": "T-0002",
        "title": "筛选 TOP 五星客户",
        "status": "进行中",
        "priority": "P0",
        "workstream": "注册 / KYC / 首单推进",
        "owner": "Sera",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "dueAt": "2026-07-23T18:00:00+08:00",
        "remindAt": "2026-07-23T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": null,
        "progress": 40,
        "nextAction": "按金额和成交概率安排优先跟进顺序",
        "outputCondition": "输出五星客户优先跟进清单",
        "result": null,
        "source": "seed",
        "dependencies": [],
        "updatedBy": "seed",
        "completionEvidence": null
      },
      {
        "id": "T-0003",
        "title": "确认访问权限",
        "status": "进行中",
        "priority": "P0",
        "workstream": "看板交付与访问",
        "owner": "Sera / Simon",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "dueAt": "2026-07-23T18:00:00+08:00",
        "remindAt": "2026-07-23T10:00:00+08:00",
        "remindedAt": null,
        "completedAt": null,
        "progress": 30,
        "nextAction": "与 Simon 确认 Cloudflare Access 验证方式",
        "outputCondition": "Simon 确认访问方式，Sera 提供 Cloudflare 账号",
        "result": null,
        "source": "seed",
        "dependencies": [],
        "updatedBy": "seed",
        "completionEvidence": null
      },
      {
        "id": "T-0004",
        "title": "配合首单测试",
        "status": "待启动",
        "priority": "P0",
        "workstream": "注册 / KYC / 首单推进",
        "owner": "Sera / 静格",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "dueAt": "2026-07-25T18:00:00+08:00",
        "remindAt": "2026-07-24T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": null,
        "progress": 0,
        "nextAction": "配合静格完成周四/周五首单测试",
        "outputCondition": "首单 COBO/POBO 流程跑通并记录结果",
        "result": null,
        "source": "seed",
        "dependencies": [
          "T-0002"
        ],
        "updatedBy": "seed",
        "completionEvidence": null
      },
      {
        "id": "T-0005",
        "title": "获取大数据名单",
        "status": "阻塞",
        "priority": "P1",
        "workstream": "渠道拓展",
        "owner": "Sera / Simon",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "dueAt": "2026-07-26T18:00:00+08:00",
        "remindAt": "2026-07-24T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": null,
        "progress": 0,
        "nextAction": "请 Simon 协助调取名单并确认筛选条件",
        "outputCondition": "拿到名单并完成筛选条件确认",
        "result": null,
        "source": "seed",
        "dependencies": [],
        "updatedBy": "seed",
        "completionEvidence": null
      }
    ]
  }
};
// __FALLBACK_SYNC_END__

/* 执行摘要「当前阻塞」说明用短标签映射（blockers.json 原文 → 缩略） */
const BLOCKER_SHORT = {
  '大数据客户名单待确认': '名单调取',
  '设计团队排期待确认': '设计排期',
  '首单测试需跨团队配合': '首单协作',
  '访问权限方式待确认': '访问方式'
};

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

/* 当前日期（与数据快照一致） */
const TODAY = '2026-07-21';

/* ------------------------------------------------------------
 * 依赖关系图配置（viewBox 1000x700，节点坐标为画布坐标）
 * 主链路（黄） / 支线 A 获客（浅色） / 支线 B 看板（淡蓝） / 支线 C 设计（浅灰）
 * ---------------------------------------------------------- */
const DEP_NODES = [
  // 主链路
  { id: 'm1', label: '绩效评估表目标', meta: 'PIP 已立项', x: 70,  y: 240, st: 'done' },
  { id: 'm2', label: 'BD计划文档',     meta: '撰写中 60%', x: 208, y: 240, st: 'doing' },
  { id: 'm3', label: '客户手册/FAQ',   meta: '完善中 70%', x: 346, y: 240, st: 'doing' },
  { id: 'm4', label: '设计交付包',     meta: '90% · 待提交', x: 484, y: 240, st: 'hub' },
  { id: 'm5', label: '客户 Pipeline',  meta: '初版已建', x: 622, y: 240, st: 'hub' },
  { id: 'm6', label: '注册/KYC/首单',  meta: '待推进', x: 760, y: 240, st: 'next' },
  { id: 'm7', label: '周报/CRIB复盘',  meta: '每周五更新', x: 898, y: 240, st: 'doing' },
  // 支线 C：设计物料制作（汇入 设计交付包）
  { id: 'c1', label: '文字稿整理', meta: 'Done', x: 200, y: 70, st: 'done' },
  { id: 'c2', label: '提交设计团队', meta: 'Doing · 07-22', x: 340, y: 70, st: 'doing' },
  { id: 'c3', label: 'UI出图', meta: 'Next', x: 480, y: 70, st: 'next' },
  { id: 'c4', label: '反馈修改', meta: 'Next', x: 620, y: 70, st: 'next' },
  // 支线 A：获客线索（四源并行汇入 客户筛选 → 客户 Pipeline）
  { id: 'a1', label: 'TG客户资料', meta: 'Done · CRM 初版', x: 484, y: 400, st: 'done' },
  { id: 'a2', label: '销售转介', meta: 'Next · 对接 Oscar', x: 760, y: 400, st: 'next' },
  { id: 'a3', label: '存量客户池', meta: 'Done · 已汇总分级', x: 484, y: 556, st: 'done' },
  { id: 'a4', label: 'Partner / KOL', meta: 'Next · 待触达', x: 760, y: 556, st: 'next' },
  { id: 'a5', label: '客户筛选', meta: 'Doing · 五星名单', x: 622, y: 480, st: 'doing' },
  // 支线 B：看板交付与访问
  { id: 'b1', label: '看板结构整理', meta: 'Done', x: 110, y: 650, st: 'done' },
  { id: 'b2', label: '页面内容收敛', meta: 'Done', x: 300, y: 650, st: 'done' },
  { id: 'b3', label: '访问权限控制', meta: 'Doing · 确认方式', x: 490, y: 650, st: 'doing' },
  { id: 'b4', label: 'Simon访问', meta: 'Next', x: 680, y: 650, st: 'next' },
  { id: 'b5', label: '每周更新', meta: 'Doing · 每周五', x: 870, y: 650, st: 'doing' }
];

const DEP_LINKS = [
  // 主链路（黄色渐变）
  ['m1', 'm2', 'main'], ['m2', 'm3', 'main'], ['m3', 'm4', 'main'],
  ['m4', 'm5', 'main'], ['m5', 'm6', 'main'], ['m6', 'm7', 'main'],
  // 支线 C（浅灰）→ 设计交付包
  ['c1', 'c2', 'c'], ['c2', 'c3', 'c'], ['c3', 'c4', 'c'], ['c4', 'm4', 'c'],
  // 支线 A（浅色）：四源并行 → 客户筛选 → 客户 Pipeline
  ['a1', 'a5', 'a'], ['a2', 'a5', 'a'], ['a3', 'a5', 'a'], ['a4', 'a5', 'a'], ['a5', 'm5', 'a'],
  // 支线 B（淡蓝）链式
  ['b1', 'b2', 'b'], ['b2', 'b3', 'b'], ['b3', 'b4', 'b'], ['b4', 'b5', 'b']
];

const DEP_LABELS = [
  { text: '支线 C · 设计物料制作', x: 200, y: 18 },
  { text: '主链路 · 绩效交付', x: 70, y: 184 },
  { text: '支线 A · 获客线索汇入', x: 484, y: 352 },
  { text: '支线 B · 看板交付与访问', x: 110, y: 606 }
];

/* 全局状态：当前生效的数据 + 筛选条件 */
const state = {
  kpi: [], gantt: [], roadmap: [], pipeline: [],
  todo: [], milestones: [], weeklyLog: null, blockers: null,
  resources: [], tasks: null
};
const filterState = { query: '' };

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
    console.warn('[绩效看板] 加载失败，使用内置兜底数据：' + url, err);
    return fallback;
  }
}

/* ---------- 01 执行摘要（4 卡 · 主数据突出 · 每卡一行下一步） ---------- */
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
    .sort((a, b) => ((a.priority + a.due) < (b.priority + b.due) ? -1 : 1))[0];

  // 3) 当前阻塞 = blockers.json current 条数（说明取前 3 条短标签）
  const blockerItems = (state.blockers && state.blockers.current) || [];
  const blockers = blockerItems.length;
  const blockerBrief = blockerItems
    .slice(0, 3)
    .map((b) => BLOCKER_SHORT[b] || b)
    .join(' / ');

  // 4) 下一里程碑 = milestones 中最早非 Done 项
  const nextMilestone = state.milestones
    .filter((m) => m.status !== 'Done')
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];

  const cards = [
    {
      label: '总体进度',
      badge: null,
      accent: 'ac-blue',
      build(body) {
        const num = el('div', 'sum-value', '0%');
        countUp(num, avg, { format: (v) => Math.round(v) + '%' });
        body.appendChild(num);
        body.appendChild(el('div', 'sum-sub', state.roadmap.length + ' 条绩效主线平均进度'));
      },
      next: slowest ? '重点推进「' + slowest.name + '」：' + slowest.next : '保持当前节奏'
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
        body.appendChild(el('div', 'sum-sub', blockers ? blockerBrief : 'blockers.json 当前无阻塞'));
      },
      next: blockers ? '详见 09 区「需要 Simon 协助」清单' : '无阻塞，保持推进节奏'
    },
    {
      label: '下一里程碑',
      badge: nextMilestone ? { cls: 'badge-' + (STATUS_CLS[nextMilestone.status] || 'next'), text: STATUS_TEXT[nextMilestone.status] || nextMilestone.status } : null,
      accent: 'ac-yellow',
      build(body) {
        // 事件名为主大字，日期为辅文
        body.appendChild(el('div', 'sum-value sum-value-text', nextMilestone ? nextMilestone.title : '暂无'));
        body.appendChild(el('div', 'sum-sub', nextMilestone ? nextMilestone.date + ' · ' + (STATUS_TEXT[nextMilestone.status] || nextMilestone.status) : '暂无待办里程碑'));
      },
      next: '按里程碑节点推进，风险提前同步 Simon'
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

/* ---------- 02 动态图形 KPI（按 component 字段渲染 6 卡） ---------- */

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
  svg.setAttribute('width', '72');
  svg.setAttribute('height', '72');
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

/* funnel：客户 Pipeline —— 阶段条（汇总 → 筛选 → 转化） */
function kpiBodyFunnel(item) {
  const body = el('div', 'kpi-body');
  const wrap = el('div', 'kpi-minifunnel');

  // 阶段与卡片的 trend / next 文案一一对应：汇总已完成 → 筛选推进中 → 转化待启动
  const stages = [
    { label: '汇总', cls: '', height: 100, tip: 'TG客户资料已汇总' },
    { label: '筛选', cls: 'mf-doing', height: 62, tip: '筛选五星重点客户（推进中）' },
    { label: '转化', cls: 'mf-empty', height: 34, tip: '注册/KYC/首单转化（待启动）' }
  ];
  const stagesRow = el('div', 'mf-stages');
  const labels = el('div', 'mf-labels');
  stages.forEach((s) => {
    const seg = el('div', 'mf-seg' + (s.cls ? ' ' + s.cls : ''));
    seg.style.height = s.height + '%';
    seg.title = s.tip;
    stagesRow.appendChild(seg);
    labels.appendChild(el('span', null, s.label));
  });
  wrap.appendChild(stagesRow);
  wrap.appendChild(labels);
  body.appendChild(wrap);

  const side = el('div', 'kpi-side');
  side.appendChild(el('div', 'ks-note', item.trend || ''));
  body.appendChild(side);
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

/* ---------- 04 资料访问中心（resources.json 驱动 · 文件存在性检测） ---------- */
/* 资料卡状态 → badge 样式映射 */
const RES_STATUS_CLS = { '已整理': 'done', '待提交': 'doing', '待同步': 'next', '待完善': 'next' };

/* 目录型 url（以 / 结尾）默认打开其 README.md */
function resTargetUrl(item) {
  const url = item.url || '';
  return url.endsWith('/') ? url + 'README.md' : url;
}

function renderResources(list) {
  const grid = document.getElementById('resGrid');
  grid.innerHTML = '';
  // file:// 协议下跳过存在性检测直接打开；http(s) 下渲染时发 HEAD 检测
  const canProbe = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  list.forEach((item) => {
    const card = el('article', 'res-card');

    const head = el('div', 'res-head');
    head.appendChild(el('h3', 'res-title', item.title));
    head.appendChild(el('span', 'res-type', item.type));
    card.appendChild(head);

    card.appendChild(el('div', 'res-desc', item.description || ''));

    const meta = el('div', 'res-meta');
    meta.appendChild(el('span', 'res-module', item.module));
    meta.appendChild(el('span', 'res-updated', '更新 ' + (item.updatedAt || '—')));
    card.appendChild(meta);

    const foot = el('div', 'res-foot');
    const statusBadge = el('span', 'badge badge-' + (RES_STATUS_CLS[item.status] || 'next'), item.status || '—');
    foot.appendChild(statusBadge);
    const btn = el('button', 'res-open', '打开');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      window.open(resTargetUrl(item), '_blank', 'noopener');
    });
    foot.appendChild(btn);
    card.appendChild(foot);
    grid.appendChild(card);

    if (canProbe) {
      fetch(resTargetUrl(item), { method: 'HEAD', cache: 'no-store' })
        .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); })
        .catch(() => {
          card.classList.add('res-missing');
          statusBadge.className = 'badge badge-blocked';
          statusBadge.textContent = '文件待上传';
          btn.disabled = true;
        });
    }
  });
}

/* ---------- 03 任务倒计时（tasks.json 驱动 · 秒级实时刷新） ---------- */
/* 七态 → badge 样式映射（warn=黄 / late=橙 / blocked=红 / doing=蓝 / next=灰 / done=绿） */
const CD_STATUS_BADGE = {
  '待启动': 'next', '进行中': 'doing', '待输出': 'warn', '已提醒': 'warn',
  '已完成': 'done', '已延期': 'late', '阻塞': 'blocked'
};
const CD_DAY_MS = 24 * 3600 * 1000;

/* 剩余毫秒 → 倒计时文案（如 "1天 04:12:33" / "04:12:33"） */
function cdFmtDuration(ms) {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = String(Math.floor((totalSec % 86400) / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return (d > 0 ? d + '天 ' : '') + h + ':' + m + ':' + s;
}

/* 任务紧迫度：done=完成绿 / overdue=逾期红 / soon=24h 内黄 / normal=常规 */
function cdUrgency(task, nowMs) {
  if (task.status === '已完成') return 'done';
  const due = Date.parse(task.dueAt);
  if (Number.isNaN(due)) return 'normal';
  if (due < nowMs) return 'overdue';
  if (due - nowMs <= CD_DAY_MS) return 'soon';
  return 'normal';
}

function cdTimerText(task, nowMs) {
  if (task.status === '已完成') return '已完成';
  const due = Date.parse(task.dueAt);
  if (Number.isNaN(due)) return '—';
  return due < nowMs ? '已逾期 ' + cdFmtDuration(nowMs - due) : '距截止 ' + cdFmtDuration(due - nowMs);
}

/* 秒级滴答：只更新计时文案与卡片紧迫度 class，不重建 DOM */
function tickCountdown() {
  const nowMs = Date.now();
  document.querySelectorAll('#cdGrid .cd-timer').forEach((timer) => {
    const card = timer.closest('.cd-card');
    const status = card ? card.dataset.status : '';
    const dueMs = Date.parse(timer.dataset.cdDue || '');
    if (status === '已完成') return;
    const fakeTask = { status, dueAt: timer.dataset.cdDue };
    timer.textContent = cdTimerText(fakeTask, nowMs);
    if (card && !Number.isNaN(dueMs)) {
      const urgency = cdUrgency(fakeTask, nowMs);
      card.classList.toggle('cd-soon', urgency === 'soon');
      card.classList.toggle('cd-overdue', urgency === 'overdue');
    }
  });
}

function renderCountdown(tasksData) {
  const grid = document.getElementById('cdGrid');
  grid.innerHTML = '';
  const list = (tasksData && Array.isArray(tasksData.tasks)) ? tasksData.tasks.slice() : [];
  if (!list.length) {
    grid.appendChild(el('div', 'cd-empty', '暂无任务 · 可通过终端 npm run task 新增'));
    return;
  }
  // 未完成按截止升序在前，已完成按完成时间降序在后
  const rank = (t) => (t.status === '已完成' ? 1 : 0);
  list.sort((a, b) => rank(a) - rank(b)
    || (a.status === '已完成' ? Date.parse(b.completedAt || 0) - Date.parse(a.completedAt || 0)
      : Date.parse(a.dueAt) - Date.parse(b.dueAt)));

  const nowMs = Date.now();
  list.forEach((t) => {
    const urgency = cdUrgency(t, nowMs);
    const card = el('article', 'cd-card'
      + (urgency === 'soon' ? ' cd-soon' : '')
      + (urgency === 'overdue' ? ' cd-overdue' : '')
      + (urgency === 'done' ? ' cd-done' : ''));
    card.dataset.status = t.status;

    const head = el('div', 'cd-head');
    head.appendChild(el('span', 'cd-id', t.id));
    head.appendChild(el('span', 'badge badge-' + (t.priority === 'P0' ? 'p0' : 'p1'), t.priority));
    head.appendChild(el('span', 'badge badge-' + (CD_STATUS_BADGE[t.status] || 'next'), t.status));
    card.appendChild(head);

    card.appendChild(el('h3', 'cd-title', t.title));

    const timer = el('div', 'cd-timer', cdTimerText(t, nowMs));
    timer.dataset.cdDue = t.dueAt || '';
    card.appendChild(timer);

    const bar = el('div', 'cd-progress');
    const fill = el('span');
    fill.style.width = Math.max(0, Math.min(100, t.progress || 0)) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);

    const meta = el('div', 'cd-meta');
    meta.appendChild(el('span', null, '截止 ' + (t.dueAt || '').slice(0, 16).replace('T', ' ')));
    meta.appendChild(el('span', null, '提醒 ' + (t.remindAt || '').slice(0, 16).replace('T', ' ')));
    if (t.workstream) meta.appendChild(el('span', null, t.workstream));
    meta.appendChild(el('span', null, t.owner));
    card.appendChild(meta);

    card.appendChild(el('div', 'cd-next', '下一步：' + (t.nextAction || '—')));

    const out = el('div', 'cd-out');
    out.appendChild(el('span', 'cd-out-label', '输出条件：' + (t.outputCondition || '—')));
    if (t.status === '待输出') out.appendChild(el('span', 'cd-out-badge', '已具备结果输出条件'));
    card.appendChild(out);

    if (t.status === '已完成' && t.result) {
      card.appendChild(el('div', 'cd-result', '结果：' + t.result));
    }

    grid.appendChild(card);
  });

  // 秒级实时刷新（防止重复挂定时器）
  if (state.cdTimer) clearInterval(state.cdTimer);
  state.cdTimer = setInterval(tickCountdown, 1000);
}

/* ---------- 05 时间推进图（6 条主线 · 点击展开子任务 · 悬浮详情） ---------- */
function ganttDayOffset(dateStr) {
  const base = new Date(GANTT_START + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - base) / 86400000);
}

function ganttBar(item, isChild) {
  let startIdx = Math.max(0, ganttDayOffset(item.start));
  let endIdx = Math.min(GANTT_DAYS - 1, ganttDayOffset(item.end));
  if (endIdx < 0 || startIdx > GANTT_DAYS - 1) return null;
  if (endIdx < startIdx) endIdx = startIdx;
  const bar = el('div', 'gantt-bar gb-' + (STATUS_CLS[item.status] || 'next') + (isChild ? ' gantt-bar-child' : ''));
  bar.style.left = ((startIdx / GANTT_DAYS) * 100).toFixed(2) + '%';
  bar.style.width = (((endIdx - startIdx + 1) / GANTT_DAYS) * 100).toFixed(2) + '%';
  bar.textContent = item.progress + '%';
  return bar;
}

function renderGantt(list) {
  const wrap = document.getElementById('ganttChart');
  const tip = document.getElementById('ganttTip');
  const panel = wrap.closest('.gantt-panel');
  wrap.innerHTML = '';

  // 表头：左列占位 + 6 个周列
  const head = el('div', 'gantt-head');
  head.appendChild(el('div', 'gantt-corner', '主线 / 任务'));
  const weeks = el('div', 'gantt-weeks');
  GANTT_WEEKS.forEach(([w, range]) => {
    const cell = el('div', 'gantt-week');
    cell.appendChild(el('b', null, w));
    cell.appendChild(document.createTextNode(' ' + range));
    weeks.appendChild(cell);
  });
  head.appendChild(weeks);
  wrap.appendChild(head);

  // 悬浮详情层：负责人 / 起止 / 进度 / 下一步
  function bindTip(bar, titleText, rows) {
    bar.addEventListener('mouseenter', () => {
      tip.innerHTML = '';
      tip.appendChild(el('div', 'gt-title', titleText));
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
  }

  // 主线行（默认折叠，点击左列展开子任务）
  list.forEach((line) => {
    const rowWrap = el('div', 'gantt-row-wrap');
    const row = el('div', 'gantt-row');

    // 左列：展开箭头 + 主线名 + owner + 进度%
    const label = el('div', 'gantt-label');
    const btn = el('button', 'gantt-label-btn');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.title = '点击展开 / 折叠子任务';
    btn.appendChild(el('span', 'gantt-chevron', '▶'));
    const text = el('div', 'gl-text');
    text.appendChild(el('div', 'gl-task', line.name));
    text.appendChild(el('div', 'gl-ws', line.id + ' · 负责人：' + line.owner + ' · ' + (STATUS_TEXT[line.status] || line.status)));
    btn.appendChild(text);
    btn.appendChild(el('span', 'gl-pct', line.progress + '%'));
    label.appendChild(btn);
    row.appendChild(label);

    // 右侧胶囊任务条
    const track = el('div', 'gantt-track');
    const bar = ganttBar(line, false);
    if (bar) {
      bindTip(bar, line.name, [
        ['状态', (STATUS_TEXT[line.status] || line.status) + ' · ' + line.progress + '%'],
        ['负责人', line.owner || '—'],
        ['起止', line.start + ' ~ ' + line.end],
        ['下一步', line.next || '—']
      ]);
      track.appendChild(bar);
    }
    row.appendChild(track);
    rowWrap.appendChild(row);

    // 子任务区（默认折叠）：子任务条更细、同色浅色
    const childrenWrap = el('div', 'gantt-children');
    (line.children || []).forEach((c) => {
      const crow = el('div', 'gantt-row');
      const clabel = el('div', 'gantt-label-child');
      clabel.appendChild(el('div', 'gl-task', c.task));
      crow.appendChild(clabel);
      const ctrack = el('div', 'gantt-track gantt-track-child');
      const cbar = ganttBar(c, true);
      if (cbar) {
        bindTip(cbar, c.task, [
          ['状态', (STATUS_TEXT[c.status] || c.status) + ' · ' + c.progress + '%'],
          ['负责人', line.owner || '—'],
          ['起止', c.start + ' ~ ' + c.end],
          ['所属主线', line.name]
        ]);
        ctrack.appendChild(cbar);
      }
      crow.appendChild(ctrack);
      childrenWrap.appendChild(crow);
    });
    rowWrap.appendChild(childrenWrap);

    // 展开 / 折叠切换
    btn.addEventListener('click', () => {
      const open = rowWrap.classList.toggle('open');
      row.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.appendChild(rowWrap);
  });

  // 图例：Done 绿胶囊 / Doing 黄渐变胶囊 / Next 灰半透明 / Blocked 红边条
  const legend = document.getElementById('ganttLegend');
  legend.innerHTML = '';
  STATUS_ORDER.forEach((s) => {
    const item = el('span', 'legend-item');
    item.appendChild(el('span', 'legend-swatch gantt-bar gb-' + STATUS_CLS[s]));
    item.appendChild(document.createTextNode(s + ' ' + STATUS_TEXT[s]));
    legend.appendChild(item);
  });
  legend.appendChild(el('span', 'legend-hint', '点击左侧主线名可展开 / 折叠子任务'));
}

/* ---------- 06 依赖关系图（SVG 贝塞尔曲线 + 玻璃节点） ---------- */
function renderDepMap() {
  const canvas = document.getElementById('depCanvas');
  canvas.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const VB_W = 1000;
  const VB_H = 700;

  const byId = {};
  DEP_NODES.forEach((n) => { byId[n.id] = n; });

  // SVG 曲线层（贝塞尔，节点下方）
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dep-svg');
  svg.setAttribute('viewBox', '0 0 ' + VB_W + ' ' + VB_H);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(NS, 'defs');
  // userSpaceOnUse：水平直线路径包围盒高度为 0，objectBoundingBox 渐变会失效
  const mainGrad = document.createElementNS(NS, 'linearGradient');
  mainGrad.setAttribute('id', 'depMainGrad2');
  mainGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
  mainGrad.setAttribute('x1', '0'); mainGrad.setAttribute('y1', '0');
  mainGrad.setAttribute('x2', String(VB_W)); mainGrad.setAttribute('y2', '0');
  [['0%', '#FFE000'], ['100%', '#FFB800']].forEach(([off, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', off);
    stop.setAttribute('stop-color', color);
    mainGrad.appendChild(stop);
  });
  const boardGrad = document.createElementNS(NS, 'linearGradient');
  boardGrad.setAttribute('id', 'depBoardGrad2');
  boardGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
  boardGrad.setAttribute('x1', '0'); boardGrad.setAttribute('y1', '0');
  boardGrad.setAttribute('x2', String(VB_W)); boardGrad.setAttribute('y2', '0');
  [['0%', '#18A7E3'], ['100%', '#4CC0F0']].forEach(([off, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', off);
    stop.setAttribute('stop-color', color);
    boardGrad.appendChild(stop);
  });
  defs.appendChild(mainGrad);
  defs.appendChild(boardGrad);
  svg.appendChild(defs);

  // 贝塞尔曲线：方向射线与节点矩形求交，从节点边缘起止（避免线段被节点卡片遮住）
  const HALF_W = 58; // 节点水平半径（viewBox 单位，略大于 11% 宽度的一半）
  const HALF_H = 33; // 节点垂直半径
  function edgeOffset(ux, uy) {
    const tx = ux === 0 ? Infinity : HALF_W / Math.abs(ux);
    const ty = uy === 0 ? Infinity : HALF_H / Math.abs(uy);
    return Math.min(tx, ty) + 2;
  }
  DEP_LINKS.forEach(([fromId, toId, cls]) => {
    const f = byId[fromId];
    const t = byId[toId];
    if (!f || !t) return;
    const ddx = t.x - f.x;
    const ddy = t.y - f.y;
    const len = Math.hypot(ddx, ddy) || 1;
    const ux = ddx / len;
    const uy = ddy / len;
    const off = edgeOffset(ux, uy);
    const sx = f.x + ux * off;
    const sy = f.y + uy * off;
    const ex = t.x - ux * off;
    const ey = t.y - uy * off;
    // 水平偏置控制点，形成平滑 S 曲线
    const c1x = sx + (ex - sx) * 0.5;
    const c2x = ex - (ex - sx) * 0.5;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', 'dl-' + (cls === 'main' ? 'main2' : cls));
    path.setAttribute('d',
      'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) +
      ' C' + c1x.toFixed(1) + ' ' + sy.toFixed(1) +
      ' ' + c2x.toFixed(1) + ' ' + ey.toFixed(1) +
      ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1));
    svg.appendChild(path);
  });
  canvas.appendChild(svg);

  // 链路分区标签
  DEP_LABELS.forEach((lb, i) => {
    const node = el('div', 'dep-chain-label', lb.text);
    node.style.left = (lb.x / VB_W * 100) + '%';
    node.style.top = (lb.y / VB_H * 100) + '%';
    canvas.appendChild(node);
  });

  // 玻璃节点层（轻 3D：偶数节点轻微浮起）
  DEP_NODES.forEach((n, i) => {
    const node = el('div', 'dep-node2 dn-' + n.st + (i % 2 ? ' dep-z' : ''));
    node.style.left = (n.x / VB_W * 100) + '%';
    node.style.top = (n.y / VB_H * 100) + '%';
    node.appendChild(el('div', 'dn-title', n.label));
    node.appendChild(el('div', 'dn-meta', n.meta));
    canvas.appendChild(node);
  });
}

/* ---------- 07 主线任务进度（roadmap.json 5 条主线卡） ---------- */
function renderWorkstreams(list) {
  const grid = document.getElementById('wsGrid');
  grid.innerHTML = '';
  list.forEach((ws) => {
    const statusCls = STATUS_CLS[ws.status] || 'next';
    const card = el('div', 'ws-card' + (ws.status === 'Blocked' ? ' ws-blocked' : ''));

    // 名称 + 状态 badge
    const head = el('div', 'ws-head');
    head.appendChild(el('span', 'ws-id', ws.id));
    head.appendChild(el('span', 'ws-name', ws.name));
    head.appendChild(el('span', 'badge badge-' + statusCls, STATUS_TEXT[ws.status] || ws.status));
    card.appendChild(head);

    card.appendChild(el('div', 'ws-goal', ws.goal));

    // 进度条 + 百分比
    const barRow = el('div', 'ws-bar-row');
    const track = el('div', 'ws-track');
    const fill = el('div', 'ws-fill wf-' + statusCls);
    track.appendChild(fill);
    barRow.appendChild(track);
    const pctNode = el('span', 'ws-pct', '0%');
    countUp(pctNode, ws.progress, { format: (v) => Math.round(v) + '%' });
    barRow.appendChild(pctNode);
    card.appendChild(barRow);
    // 进度条直接落终值（CSS transition 负责展开动效）
    fill.style.width = ws.progress + '%';

    // 子任务范围标签（roadmap subLabel，紧贴进度条下方）
    if (ws.subLabel) card.appendChild(el('div', 'ws-sublabel', ws.subLabel));

    // 关键子任务数 + 负责人
    const metaRow = el('div', 'ws-meta-row');
    metaRow.appendChild(el('span', 'ws-sub', '关键子任务：' + ws.subDone + '/' + ws.subTotal));
    metaRow.appendChild(el('span', null, '负责人：' + ws.owner));
    card.appendChild(metaRow);

    // 风险点（无风险显示「无」并弱化；Blocked 红色强调）
    const hasRisk = ws.risk && ws.risk !== '无';
    const risk = el('div', 'ws-risk ' + (hasRisk ? (ws.status === 'Blocked' ? 'risk-hot' : '') : 'risk-none'));
    risk.appendChild(el('span', 'rk-k', '风险'));
    risk.appendChild(el('span', null, hasRisk ? ws.risk : '无'));
    card.appendChild(risk);

    // 下一步动作
    const next = el('div', 'ws-next');
    next.appendChild(el('span', 'sn-k', '下一步'));
    next.appendChild(el('span', null, ws.next));
    card.appendChild(next);

    grid.appendChild(card);
  });
}

/* ---------- 08 工作 Pipeline（折叠分组看板） ---------- */
/* 分组定义：本周重点（P0 合集）+ 四状态分组，defaultOpen 控制默认展开 */
const PIPE_GROUPS = [
  { key: 'focus',   name: '本周重点 · P0', dot: 'next',    defaultOpen: true,
    pick: (list) => list.filter((p) => p.priority === 'P0') },
  { key: 'Doing',   name: '进行中 Doing',  dot: 'doing',   defaultOpen: true,
    pick: (list) => list.filter((p) => p.status === 'Doing') },
  { key: 'Blocked', name: '阻塞 Blocked',  dot: 'blocked', defaultOpen: true,
    pick: (list) => list.filter((p) => p.status === 'Blocked') },
  { key: 'Next',    name: '待开始 Next',   dot: 'next',    defaultOpen: false,
    pick: (list) => list.filter((p) => p.status === 'Next') },
  { key: 'Done',    name: '已完成 Done',   dot: 'done',    defaultOpen: false,
    pick: (list) => list.filter((p) => p.status === 'Done') }
];

function buildTaskCard(item) {
  const card = el('article', 'task-card');
  card.dataset.status = item.status;
  card.dataset.search = [item.module, item.workstream, item.next, item.priority, item.status]
    .join(' ').toLowerCase();

  // 任务名
  card.appendChild(el('h3', 'task-title', item.module));

  // 所属主线 + 下一步动作（字段收敛）
  const rows = [
    ['所属主线', item.workstream],
    ['下一步', item.next]
  ];
  rows.forEach(([k, v]) => {
    const row = el('div', 'task-row');
    row.appendChild(el('span', 'k', k));
    row.appendChild(el('span', v ? 'v' : 'v muted', v || '—'));
    card.appendChild(row);
  });

  // 底部：优先级 + 状态 + 截止日期
  const footer = el('div', 'task-footer');
  footer.appendChild(el('span', 'badge ' + (item.priority === 'P0' ? 'badge-p0' : 'badge-p1'), item.priority));
  footer.appendChild(el('span', 'badge badge-' + (STATUS_CLS[item.status] || 'next'), STATUS_TEXT[item.status] || item.status));
  const overdue = item.due && item.due < TODAY && item.status !== 'Done';
  footer.appendChild(el('span', 'task-due' + (overdue ? ' overdue' : ''), '截止 ' + (item.due ? item.due.slice(5) : '—') + (overdue ? ' · 已过期' : '')));
  card.appendChild(footer);
  return card;
}

function renderPipeline(pipeline) {
  const wrap = document.getElementById('pipeGroups');
  wrap.innerHTML = '';

  PIPE_GROUPS.forEach((g) => {
    const items = g.pick(pipeline);
    const group = el('div', 'pipe-group' + (g.defaultOpen ? ' open' : ''));
    group.dataset.openState = g.defaultOpen ? '1' : '0';

    // 组标题栏：箭头 + 状态点 + 名称 + 数量徽标（点击折叠 / 展开）
    const headBtn = el('button', 'pg-head');
    headBtn.type = 'button';
    headBtn.setAttribute('aria-expanded', g.defaultOpen ? 'true' : 'false');
    headBtn.appendChild(el('span', 'pg-arrow', '▶'));
    headBtn.appendChild(el('span', 'dot dot-' + g.dot));
    headBtn.appendChild(el('span', 'pg-name', g.name));
    headBtn.appendChild(el('span', 'pg-count', String(items.length)));
    group.appendChild(headBtn);

    // 卡片网格
    const body = el('div', 'pg-body');
    items.forEach((item) => body.appendChild(buildTaskCard(item)));
    group.appendChild(body);

    headBtn.addEventListener('click', () => {
      const open = group.classList.toggle('open');
      group.dataset.openState = open ? '1' : '0';
      headBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.appendChild(group);
  });

  applyFilters(); // 初次渲染后刷新计数与空组提示
}

/* ---------- 搜索过滤（Pipeline 卡片 + 待办行联动） ---------- */
function applyFilters() {
  const q = filterState.query.trim().toLowerCase();

  document.querySelectorAll('#pipeGroups .pipe-group').forEach((group) => {
    const body = group.querySelector('.pg-body');
    const cards = body.querySelectorAll('.task-card');
    let visible = 0;
    cards.forEach((card) => {
      const show = !q || card.dataset.search.indexOf(q) !== -1;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    group.querySelector('.pg-count').textContent = visible;

    let empty = body.querySelector('.pg-empty');
    if (visible === 0) {
      if (!empty) body.appendChild(el('div', 'pg-empty', q ? '暂无匹配的工作项' : '暂无工作项'));
    } else if (empty) {
      empty.remove();
    }

    // 搜索时强制展开全部分组，清空搜索后恢复用户折叠状态
    if (q) {
      group.classList.add('open');
    } else {
      group.classList.toggle('open', group.dataset.openState === '1');
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

/* ---------- 09 本周待办（P0 高亮 / 过期标红 / 搜索过滤） ---------- */
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

/* ---------- 10 阻塞事项与需要协助（blockers.json 双栏驱动） ---------- */
function renderBlocked() {
  const current = (state.blockers && state.blockers.current) || [];
  const asks = (state.blockers && state.blockers.asks) || [];

  // 左栏：当前阻塞（红色调列表）
  const curList = document.getElementById('currentBlockers');
  curList.innerHTML = '';
  if (!current.length) {
    curList.appendChild(el('li', 'blk-empty', '✓ 当前无阻塞事项，继续保持'));
  }
  current.forEach((b) => {
    const li = el('li', null);
    li.appendChild(el('span', 'blk-dot', '⛔'));
    li.appendChild(el('span', 'blk-text', b));
    curList.appendChild(li);
  });

  // 右栏：需要 Simon 协助（黄色调列表）
  const askList = document.getElementById('simonAsks');
  askList.innerHTML = '';
  asks.forEach((a) => {
    const li = el('li', null);
    li.appendChild(el('span', 'blk-text', a));
    askList.appendChild(li);
  });
}

/* ---------- 11 周更记录（轻量版：done bullets + cadence / 最近更新） ---------- */
function renderWeekly(log) {
  const list = document.getElementById('weeklyDone');
  list.innerHTML = '';
  ((log && log.done) || []).forEach((d) => list.appendChild(el('li', null, d)));

  document.getElementById('weeklyCadence').textContent = (log && log.cadence) || '每周更新一次';
  document.getElementById('weeklyUpdated').textContent = (log && log.updatedAt) || TODAY;

  // 侧栏与页脚更新时间与周更数据保持一致
  if (log && log.updatedAt) {
    document.getElementById('sideUpdated').textContent = log.updatedAt;
    document.getElementById('footerUpdated').textContent = log.updatedAt;
  }
  if (log && log.cadence) {
    document.getElementById('sideCadence').textContent = log.cadence;
  }
}

/* ---------- 侧栏 08 阻塞事项状态点（Blocked 数 > 0 红，否则绿） ---------- */
function updateSidebarBlockedDot() {
  const dot = document.getElementById('navDotBlocked');
  if (!dot) return;
  const n = ((state.blockers && state.blockers.current) || []).length;
  dot.classList.toggle('dot-red', n > 0);
  dot.classList.toggle('dot-green', n === 0);
}

/* ---------- 导出：导出 Pipeline JSON 下载 ---------- */
function exportPipeline() {
  const date = (state.weeklyLog && state.weeklyLog.updatedAt) || TODAY;
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

/* ---------- 左侧目录 scroll-spy（滚动高亮当前区块） ---------- */
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('#sideNav .nav-link'));
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;

  const setActive = (id) => {
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  };
  setActive(sections[0].id);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
  sections.forEach((s) => io.observe(s));
}

/* ---------- 移动端目录抽屉 ---------- */
function initDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sideOverlay');
  const menuBtn = document.getElementById('menuBtn');

  const close = () => {
    sidebar.classList.remove('open');
    overlay.hidden = true;
  };
  menuBtn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.hidden = !open;
  });
  overlay.addEventListener('click', close);
  // 移动端点击导航项后自动收起抽屉
  document.getElementById('sideNav').addEventListener('click', (e) => {
    if (e.target.closest('.nav-link') && window.innerWidth <= 900) close();
  });
}

/* ---------- 主题切换（日间 / 夜间 · 当前主题高亮 · localStorage 持久化） ---------- */
function initTheme() {
  const root = document.documentElement;
  const btns = Array.from(document.querySelectorAll('.theme-btn'));
  const apply = (theme) => {
    root.dataset.theme = theme;
    btns.forEach((b) => b.classList.toggle('active', b.dataset.setTheme === theme));
  };
  btns.forEach((b) => b.addEventListener('click', () => {
    const theme = b.dataset.setTheme;
    try { localStorage.setItem('theme', theme); } catch (err) { /* 隐私模式下静默降级 */ }
    apply(theme);
  }));
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  // 搜索框：实时过滤（Pipeline 卡片 + 待办行）
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterState.query = e.target.value;
    applyFilters();
  });

  // 导出按钮
  document.getElementById('btnExport').addEventListener('click', exportPipeline);
}

/* ---------- 启动：加载 10 个 JSON，任一失败自动用 FALLBACK ---------- */
async function init() {
  const [kpi, gantt, roadmap, pipeline, todo, milestones, weeklyLog, blockers, resources, tasks] = await Promise.all([
    loadJson('data/kpi.json', FALLBACK.kpi),
    loadJson('data/gantt.json', FALLBACK.gantt),
    loadJson('data/roadmap.json', FALLBACK.roadmap),
    loadJson('data/pipeline.json', FALLBACK.pipeline),
    loadJson('data/todo.json', FALLBACK.todo),
    loadJson('data/milestones.json', FALLBACK.milestones),
    loadJson('data/weekly-log.json', FALLBACK.weeklyLog),
    loadJson('data/blockers.json', FALLBACK.blockers),
    loadJson('data/resources.json', FALLBACK.resources),
    loadJson('data/tasks.json', FALLBACK.tasks)
  ]);
  state.kpi = kpi;
  state.gantt = gantt;
  state.roadmap = roadmap;
  state.pipeline = pipeline;
  state.todo = todo;
  state.milestones = milestones;
  state.weeklyLog = weeklyLog;
  state.blockers = blockers;
  state.resources = resources;
  state.tasks = tasks;

  renderSummary();
  renderKpi(state.kpi);
  renderCountdown(state.tasks);
  renderResources(state.resources);
  renderGantt(state.gantt);
  renderDepMap();
  renderWorkstreams(state.roadmap);
  renderPipeline(state.pipeline);
  renderTodo(state.todo);
  renderBlocked();
  renderWeekly(state.weeklyLog);
  updateSidebarBlockedDot();
  initTheme();
  bindEvents();
  initScrollSpy();
  initDrawer();
}

document.addEventListener('DOMContentLoaded', init);
