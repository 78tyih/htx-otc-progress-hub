/* ============================================================
   HTX OTC PIP 执行看板 — app.js
   纯原生 JS：fetch 加载 data/*.json，失败自动回退内置 FALLBACK
   日间 / 夜间双主题 · 左侧目录 scroll-spy · 12 大模块 · 11 个数据源
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
      "next": "OTC 设计交付包已交付设计团队",
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
      "trend": "高价值客户名单及优先级已确认",
      "next": "按客户优先级逐一推进注册、KYC 和首单",
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
      "status": "Done",
      "progress": 100,
      "start": "2026-07-21",
      "end": "2026-07-24",
      "next": "等待设计团队排期反馈",
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
          "status": "Done",
          "progress": 100
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
      "progress": 90,
      "start": "2026-07-21",
      "end": "2026-07-25",
      "next": "按客户优先级逐一推进注册 / KYC / 首单",
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
          "status": "Done",
          "progress": 100
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
          "task": "每周总结与复盘",
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
      "progress": 100,
      "status": "Done",
      "owner": "Sera",
      "subLabel": "手册 / FAQ / 流程说明",
      "subDone": 12,
      "subTotal": 12,
      "next": "等待设计团队排期反馈",
      "risk": "—"
    },
    {
      "id": "WS02",
      "name": "客户 Pipeline 建档",
      "goal": "TG 存量客户汇总分级与五星客户筛选",
      "progress": 100,
      "status": "Done",
      "owner": "Sera",
      "subLabel": "CRM / 分级 / UID / KYC状态",
      "subDone": 5,
      "subTotal": 5,
      "next": "按客户优先级推进注册 / KYC / 首单",
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
      "goal": "每周总结与复盘，月底 CRIB 复盘",
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
      "progress": "已完成优先级筛选",
      "output": "五星客户、机构客户、Partner线索",
      "next": "按照客户优先级逐一推进注册、KYC 和首单，并记录每周转化结果",
      "owner": "Sera",
      "priority": "P0",
      "status": "Done",
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
      "status": "Done"
    },
    {
      "task": "高价值客户筛选",
      "owner": "Sera",
      "due": "2026-07-23",
      "priority": "P0",
      "status": "Done"
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
      "status": "Done"
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
    "updatedAt": "2026-07-22",
    "done": [
      "完成 OTC 设计交付包整理",
      "设计团队交互包已传回品牌 Skill 包（Sera，2026-07-22）",
      "完成 TG 客户 CRM 初版",
      "完成「提交设计交付包」：OTC 设计交付包已完成交付",
      "完成「高价值客户筛选」：已根据客户金额、成交概率和推进条件完成优先级筛选"
    ]
  },
  "blockers": {
    "updatedAt": "2026-07-22",
    "current": [
      "大数据客户名单待确认",
      "设计团队排期待确认",
      "首单测试需跨团队配合"
    ],
    "asks": [
      "确认客户名单筛选条件",
      "协调 Oscar / 销售同步高价值客户",
      "确认设计交付优先级",
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
      "status": "已交付",
      "updatedAt": "2026-07-22",
      "description": "业务背景、页面结构、COBO/POBO、FAQ、禁用词与视觉参考。",
      "url": "assets/files/design-brief/",
      "progress": 100,
      "completionEvidence": "OTC 设计交付包已完成交付",
      "updatedBy": "Sera",
      "changeSource": "manual"
    },
    {
      "id": "R003",
      "title": "设计团队交互包",
      "type": "Design Package",
      "module": "UI交付",
      "status": "已传回",
      "updatedAt": "2026-07-22",
      "description": "由设计团队提供或待设计团队确认的交互资料。",
      "url": "assets/files/design-interaction-package/",
      "result": "设计团队品牌 Skill 包",
      "progress": 100,
      "completionEvidence": "已传回设计团队品牌 Skill 包",
      "updatedBy": "Sera",
      "changeSource": "manual"
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
    "updatedAt": "2026-07-22T15:38:32.928Z",
    "tasks": [
      {
        "id": "T-0001",
        "title": "提交设计交付包",
        "status": "已完成",
        "priority": "P0",
        "workstream": "设计交付包",
        "owner": "Sera",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "updatedAt": "2026-07-22T20:16:36+08:00",
        "dueAt": "2026-07-22T18:00:00+08:00",
        "remindAt": "2026-07-22T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": "2026-07-22T20:16:36+08:00",
        "progress": 100,
        "nextAction": "等待设计团队排期反馈",
        "outputCondition": "设计团队确认收到交付包并给出排期",
        "result": "OTC 设计交付包已完成交付",
        "source": "seed",
        "dependencies": [],
        "updatedBy": "Sera",
        "completionEvidence": "OTC 设计交付包已完成交付",
        "changeSource": "manual"
      },
      {
        "id": "T-0002",
        "title": "高价值客户筛选",
        "status": "已完成",
        "priority": "P0",
        "workstream": "注册 / KYC / 首单推进",
        "owner": "Sera",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "updatedAt": "2026-07-22T22:59:54+08:00",
        "dueAt": "2026-07-23T18:00:00+08:00",
        "remindAt": "2026-07-23T09:00:00+08:00",
        "remindedAt": null,
        "completedAt": "2026-07-22T12:21:35.913Z",
        "progress": 100,
        "nextAction": "按照客户优先级逐一推进注册、KYC 和首单，并记录每周转化结果",
        "outputCondition": "输出高价值客户优先跟进清单",
        "result": "已根据客户金额、成交概率和推进条件完成优先级筛选",
        "source": "seed",
        "dependencies": [],
        "updatedBy": "Sera",
        "completionEvidence": "高价值客户名单及优先级已完成确认",
        "changeSource": "manual"
      },
      {
        "id": "T-0004",
        "title": "配合首单测试",
        "status": "待启动",
        "priority": "P0",
        "workstream": "注册 / KYC / 首单推进",
        "owner": "Sera / 静格",
        "createdAt": "2026-07-21T09:00:00+08:00",
        "updatedAt": "2026-07-21T09:00:00+08:00",
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
        "updatedAt": "2026-07-21T09:00:00+08:00",
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
  },
  "weeklyReviews": {
    "version": 1,
    "reviews": []
  }
};
// __FALLBACK_SYNC_END__

/* 执行摘要「当前阻塞」说明用短标签映射（blockers.json 原文 → 缩略） */
const BLOCKER_SHORT = {
  '大数据客户名单待确认': '名单调取',
  '设计团队排期待确认': '设计排期',
  '首单测试需跨团队配合': '首单协作'
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
 * 主链路（黄） / 支线 A 获客（浅色） / 支线 C 设计（浅灰）
 * （看板交付与访问属系统建设工作，不计入 PIP 业务成果，已从图中移除）
 * ---------------------------------------------------------- */
const DEP_NODES = [
  // 主链路
  { id: 'm1', label: '绩效评估表目标', meta: 'PIP 已立项', x: 70,  y: 240, st: 'done' },
  { id: 'm2', label: 'BD计划文档',     meta: '撰写中 60%', x: 208, y: 240, st: 'doing' },
  { id: 'm3', label: '客户手册/FAQ',   meta: '完善中 70%', x: 346, y: 240, st: 'doing' },
  { id: 'm4', label: '设计交付包',     meta: '已交付 100%', x: 484, y: 240, st: 'done' },
  { id: 'm5', label: '客户 Pipeline',  meta: '初版已建', x: 622, y: 240, st: 'hub' },
  { id: 'm6', label: '注册/KYC/首单',  meta: '待推进', x: 760, y: 240, st: 'next' },
  { id: 'm7', label: '周报/CRIB复盘',  meta: '每周五更新', x: 898, y: 240, st: 'doing' },
  // 支线 C：设计物料制作（汇入 设计交付包）
  { id: 'c1', label: '文字稿整理', meta: 'Done', x: 200, y: 70, st: 'done' },
  { id: 'c2', label: '提交设计团队', meta: 'Done · 07-22', x: 340, y: 70, st: 'done' },
  { id: 'c3', label: '品牌 Skill 包', meta: 'Done · 已传回', x: 480, y: 70, st: 'done' },
  { id: 'c4', label: '反馈修改', meta: 'Next', x: 620, y: 70, st: 'next' },
  // 支线 A：获客线索（四源并行汇入 客户筛选 → 客户 Pipeline）
  { id: 'a1', label: 'TG客户资料', meta: 'Done · CRM 初版', x: 484, y: 400, st: 'done' },
  { id: 'a2', label: '销售转介', meta: 'Next · 对接 Oscar', x: 760, y: 400, st: 'next' },
  { id: 'a3', label: '存量客户池', meta: 'Done · 已汇总分级', x: 484, y: 556, st: 'done' },
  { id: 'a4', label: 'Partner / KOL', meta: 'Next · 待触达', x: 760, y: 556, st: 'next' },
  { id: 'a5', label: '客户筛选', meta: 'Done · 优先级已确认', x: 622, y: 480, st: 'done' }
];

const DEP_LINKS = [
  // 主链路（黄色渐变）
  ['m1', 'm2', 'main'], ['m2', 'm3', 'main'], ['m3', 'm4', 'main'],
  ['m4', 'm5', 'main'], ['m5', 'm6', 'main'], ['m6', 'm7', 'main'],
  // 支线 C（浅灰）→ 设计交付包
  ['c1', 'c2', 'c'], ['c2', 'c3', 'c'], ['c3', 'c4', 'c'], ['c4', 'm4', 'c'],
  // 支线 A（浅色）：四源并行 → 客户筛选 → 客户 Pipeline
  ['a1', 'a5', 'a'], ['a2', 'a5', 'a'], ['a3', 'a5', 'a'], ['a4', 'a5', 'a'], ['a5', 'm5', 'a']
];

const DEP_LABELS = [
  { text: '支线 C · 设计物料制作', x: 200, y: 18 },
  { text: '主链路 · 绩效交付', x: 70, y: 184 },
  { text: '支线 A · 获客线索汇入', x: 484, y: 352 }
];

/* 全局状态：当前生效的数据 + 筛选条件 */
const state = {
  kpi: [], gantt: [], roadmap: [], pipeline: [],
  todo: [], milestones: [], weeklyLog: null, blockers: null,
  resources: [], tasks: null, weeklyReviews: null
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
const RES_STATUS_CLS = { '已整理': 'done', '已交付': 'done', '已传回': 'done', '待提交': 'doing', '待同步': 'next', '待完善': 'next' };

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
      // 用 GET 而非 HEAD 探测：HEAD 响应无 Content-Length 时 Chromium 会在控制台报 net::ERR_ABORTED 噪音
      fetch(resTargetUrl(item), { cache: 'no-store' })
        .then(async (res) => {
          await res.arrayBuffer(); // 消费响应体，避免连接悬挂
          if (!res.ok) throw new Error('HTTP ' + res.status);
        })
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
  defs.appendChild(mainGrad);
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

/* ---------- 12 每周总结与复盘（weekly-reviews.json 驱动 · PIP 助手生成草稿 · 确认归档） ---------- */
const RV_MISSING = '该项缺少记录，待人工补充。';
const rvState = { period: 'prev', weekStart: null, editing: false, working: null, busy: false };

/* 周期计算（UTC 字段 = 上海墙钟，与系统时区无关） */
function rvShanghaiNow() { return new Date(Date.now() + 8 * 3600000); }
function rvIsoDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}
function rvWeekRangeOf(shDate) {
  const offset = (shDate.getUTCDay() + 6) % 7; // 周一=0
  const start = new Date(shDate.getTime() - offset * 86400000);
  return { weekStart: rvIsoDate(start), weekEnd: rvIsoDate(new Date(start.getTime() + 6 * 86400000)) };
}
function rvPrevWeekRange() { return rvWeekRangeOf(new Date(rvShanghaiNow().getTime() - 7 * 86400000)); }
function rvThisWeekRange() { return rvWeekRangeOf(rvShanghaiNow()); }

function rvReviews() { return (state.weeklyReviews && state.weeklyReviews.reviews) || []; }
function rvFind(weekStart) { return rvReviews().find((r) => r.weekStart === weekStart); }
function rvUpsert(review) {
  if (!state.weeklyReviews) state.weeklyReviews = { version: 1, reviews: [] };
  const arr = state.weeklyReviews.reviews;
  const i = arr.findIndex((r) => r.id === review.id);
  if (i >= 0) arr[i] = review; else arr.push(review);
}

/* 当前选中的 weekStart / weekEnd */
function rvCurrentRange() {
  if (rvState.period === 'this') return rvThisWeekRange();
  if (rvState.period === 'history' && rvState.weekStart) {
    const hit = rvFind(rvState.weekStart);
    return { weekStart: rvState.weekStart, weekEnd: hit ? hit.weekEnd : '' };
  }
  return rvPrevWeekRange();
}

function rvFmtTs(iso) { return String(iso || '').slice(5, 16).replace('T', ' ') || '—'; }

/* 通用表格（textContent 防注入；空数据 → 缺记录提示） */
function rvTable(headers, rows) {
  const wrap = el('div', 'rv-table-wrap');
  const table = el('table', 'data-table rv-table');
  const thead = document.createElement('thead');
  const htr = document.createElement('tr');
  headers.forEach((h) => htr.appendChild(el('th', null, h)));
  thead.appendChild(htr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = el('td', 'rv-missing', RV_MISSING);
    td.colSpan = headers.length;
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach((cells) => {
      const tr = document.createElement('tr');
      cells.forEach((c) => {
        if (c && c.__html) { const td = el('td', null); td.innerHTML = c.__html; tr.appendChild(td); }
        else tr.appendChild(el('td', c == null || c === '' ? 'rv-muted' : null, c == null || c === '' ? '—' : String(c)));
      });
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function rvSectionEl(no, title, node) {
  const sec = el('div', 'rv-sec');
  const head = el('h3', 'rv-sec-title');
  head.appendChild(el('span', 'rv-sec-no', no));
  head.appendChild(document.createTextNode(title));
  sec.appendChild(head);
  sec.appendChild(node);
  return sec;
}

const RV_METRICS = [
  ['completedThisWeek', '本周完成任务数'],
  ['uncompleted', '未完成任务数'],
  ['newBlocked', '新增阻塞数'],
  ['unblocked', '已解除阻塞数'],
  ['highValueCustomer', '高价值客户推进数'],
  ['registration', '注册推进数'],
  ['kyc', 'KYC 推进数'],
  ['firstOrder', '首单推进数']
];

/* 查看模式：7 个内容模块 */
function renderRvView(review) {
  const body = el('div', 'rv-view');

  // 1. 上周工作概览
  const summary = el('div', 'rv-summary');
  (review.summary ? String(review.summary).split('\n') : [RV_MISSING]).forEach((line) => {
    summary.appendChild(el('p', line === RV_MISSING ? 'rv-missing' : null, line));
  });
  body.appendChild(rvSectionEl('1', '上周工作概览', summary));

  // 2. 已完成任务
  body.appendChild(rvSectionEl('2', '已完成任务', rvTable(
    ['任务名称', '负责人', '完成时间', '完成结果', '完成证据'],
    (review.completedTasks || []).map((t) => [t.title, t.owner, rvFmtTs(t.completedAt), t.result, t.completionEvidence])
  )));

  // 3. 未完成及顺延任务
  body.appendChild(rvSectionEl('3', '未完成及顺延任务', rvTable(
    ['任务名称', '未完成原因', '当前进度', '是否顺延至本周', '新的计划时间'],
    (review.deferredTasks || []).map((t) => [
      t.title, t.reason, t.progress != null ? t.progress + '%' : null,
      t.carriedOver ? '是' : '否', t.newDueAt ? rvFmtTs(t.newDueAt) : null
    ])
  )));

  // 4. 遇到的问题
  body.appendChild(rvSectionEl('4', '遇到的问题', rvTable(
    ['问题描述', '影响范围', '当前处理状态', '是否需要 Simon 协助'],
    (review.problems || []).map((p) => [p.description, p.scope, p.status, p.needsSimon ? '是' : '否'])
  )));

  // 5. 可以改进的空间
  body.appendChild(rvSectionEl('5', '可以改进的空间', rvTable(
    ['改进方向', '内容', '下一周的具体调整动作'],
    (review.improvements || []).map((i) => [i.area, i.note, i.action])
  )));

  // 6. 下周重点
  body.appendChild(rvSectionEl('6', '下周重点', rvTable(
    ['优先任务', '负责人', '截止时间', '预期结果'],
    (review.nextWeekPriorities || []).map((n) => [n.title, n.owner, n.dueAt ? rvFmtTs(n.dueAt) : null, n.expected])
  )));

  // 7. 数据变化
  const grid = el('div', 'rv-metrics');
  const snap = review.metricSnapshot || {};
  RV_METRICS.forEach(([key, label]) => {
    const card = el('div', 'rv-metric');
    card.appendChild(el('div', 'rv-metric-val', String(snap[key] != null ? snap[key] : 0)));
    card.appendChild(el('div', 'rv-metric-label', label));
    grid.appendChild(card);
  });
  body.appendChild(rvSectionEl('7', '数据变化', grid));

  return body;
}

/* 编辑模式：可编辑列表的字段规格 */
const RV_EDIT_LISTS = [
  ['deferredTasks', '未完成及顺延任务', [
    ['title', '任务名称'], ['reason', '未完成原因'], ['progress', '进度%'],
    ['carriedOver', '顺延', 'checkbox'], ['newDueAt', '新的计划时间']
  ]],
  ['problems', '遇到的问题', [
    ['description', '问题描述'], ['scope', '影响范围'], ['status', '处理状态'],
    ['needsSimon', '需 Simon', 'checkbox']
  ]],
  ['improvements', '可以改进的空间', [
    ['area', '改进方向'], ['note', '内容'], ['action', '下周调整动作']
  ]],
  ['nextWeekPriorities', '下周重点', [
    ['title', '优先任务'], ['owner', '负责人'], ['dueAt', '截止时间'], ['expected', '预期结果']
  ]]
];

function renderRvEdit(review) {
  const body = el('div', 'rv-edit');

  // 概览 → textarea
  const ta = el('textarea', 'rv-summary-edit');
  ta.value = review.summary || '';
  ta.rows = 4;
  ta.addEventListener('input', () => { rvState.working.summary = ta.value; });
  body.appendChild(rvSectionEl('1', '上周工作概览（可编辑）', ta));

  // 4 个可编辑列表
  RV_EDIT_LISTS.forEach(([key, title, cols], idx) => {
    const items = rvState.working[key] || (rvState.working[key] = []);
    const box = el('div', 'rv-edit-list');
    items.forEach((item, i) => {
      const row = el('div', 'rv-edit-row');
      cols.forEach(([f, label, type]) => {
        const cell = el('label', 'rv-edit-cell');
        cell.appendChild(el('span', 'rv-edit-label', label));
        if (type === 'checkbox') {
          const cb = el('input', 'rv-edit-cb');
          cb.type = 'checkbox';
          cb.checked = !!item[f];
          cb.addEventListener('change', () => { item[f] = cb.checked; });
          cell.appendChild(cb);
        } else {
          const inp = el('input', 'rv-edit-input');
          inp.type = 'text';
          inp.value = item[f] != null ? String(item[f]) : '';
          inp.addEventListener('input', () => {
            item[f] = f === 'progress' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
          });
          cell.appendChild(inp);
        }
        row.appendChild(cell);
      });
      const del = el('button', 'rv-row-del', '删除');
      del.type = 'button';
      del.addEventListener('click', () => { items.splice(i, 1); renderWeeklyReview(); });
      row.appendChild(del);
      box.appendChild(row);
    });
    if (!items.length) box.appendChild(el('div', 'rv-missing', RV_MISSING + '（可点击下方按钮添加）'));
    const add = el('button', 'rv-row-add', '+ 添加一行');
    add.type = 'button';
    add.addEventListener('click', () => {
      const blank = {};
      cols.forEach(([f, , type]) => { blank[f] = type === 'checkbox' ? false : null; });
      items.push(blank);
      renderWeeklyReview();
    });
    box.appendChild(add);
    body.appendChild(rvSectionEl(String(idx + 3), title + '（可编辑）', box));
  });

  body.appendChild(el('div', 'rv-edit-note', '已完成任务与数据变化由任务数据派生，不可手工编辑；保存后生效。'));
  return body;
}

function renderWeeklyReview() {
  const metabar = document.getElementById('reviewMetabar');
  const bodyBox = document.getElementById('reviewBody');
  if (!metabar || !bodyBox) return;

  // 历史周报下拉（保留选中）
  const sel = document.getElementById('rvHistory');
  const prevVal = sel.value;
  sel.innerHTML = '';
  const opt0 = el('option', null, '历史周报');
  opt0.value = '';
  sel.appendChild(opt0);
  rvReviews().slice().sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)).forEach((r) => {
    const o = el('option', null, `${r.weekStart.slice(5)} ~ ${r.weekEnd.slice(5)}（${r.status === 'confirmed' ? '已归档' : '草稿'}）`);
    o.value = r.weekStart;
    sel.appendChild(o);
  });
  sel.value = rvState.period === 'history' ? (rvState.weekStart || '') : (prevVal && rvState.period === 'history' ? prevVal : '');
  if (rvState.period === 'history' && rvState.weekStart) sel.value = rvState.weekStart;

  // 周期按钮高亮
  document.getElementById('rvPrevWeek').classList.toggle('active', rvState.period === 'prev');
  document.getElementById('rvThisWeek').classList.toggle('active', rvState.period === 'this');

  const range = rvCurrentRange();
  const review = rvFind(range.weekStart);

  // 元信息栏：周期 + 状态 + 时间戳
  metabar.innerHTML = '';
  metabar.appendChild(el('span', 'rv-range', range.weekEnd ? `周期 ${range.weekStart} ~ ${range.weekEnd}` : `周期 ${range.weekStart}`));
  if (review) {
    const chip = el('span', 'rv-chip ' + (review.status === 'confirmed' ? 'rv-chip-confirmed' : 'rv-chip-draft'),
      review.status === 'confirmed' ? '已归档' : '草稿（确认后归档）');
    metabar.appendChild(chip);
    metabar.appendChild(el('span', 'rv-meta',
      `生成：${rvFmtTs(review.generatedAt)}（${review.generatedBy === 'pip-assistant' ? 'PIP 助手' : '人工'}）` +
      (review.confirmedAt ? ` · 归档：${rvFmtTs(review.confirmedAt)}` : '')));
  } else {
    metabar.appendChild(el('span', 'rv-chip rv-chip-none', '未生成'));
  }

  // 主体
  bodyBox.innerHTML = '';
  if (!review) {
    rvState.editing = false;
    rvState.working = null;
    const empty = el('div', 'rv-empty');
    empty.appendChild(el('p', null, '该周期暂无复盘。'));
    empty.appendChild(el('p', 'rv-muted', '点击「PIP 助手生成复盘」基于真实任务数据生成草稿；缺数据的栏目会标注「' + RV_MISSING + '」'));
    bodyBox.appendChild(empty);
  } else if (rvState.editing && review.status === 'draft') {
    if (!rvState.working) rvState.working = JSON.parse(JSON.stringify(review));
    bodyBox.appendChild(renderRvEdit(review));
  } else {
    rvState.editing = false;
    rvState.working = null;
    bodyBox.appendChild(renderRvView(review));
  }

  // 按钮状态
  const btnGen = document.getElementById('btnReviewGenerate');
  const btnEdit = document.getElementById('btnReviewEdit');
  const btnConfirm = document.getElementById('btnReviewConfirm');
  const confirmed = review && review.status === 'confirmed';
  btnGen.disabled = rvState.busy || confirmed || rvState.editing;
  btnGen.textContent = rvState.busy ? '生成中…' : (review && review.status === 'draft' ? '重新生成复盘' : 'PIP 助手生成复盘');
  if (rvState.editing) {
    btnEdit.textContent = '保存';
    btnEdit.disabled = rvState.busy;
    btnConfirm.textContent = '取消';
    btnConfirm.disabled = rvState.busy;
  } else {
    btnEdit.textContent = '编辑';
    btnEdit.disabled = rvState.busy || !review || confirmed;
    btnConfirm.textContent = '确认归档';
    btnConfirm.disabled = rvState.busy || !review || confirmed;
  }
}

/* 生成（PIP 助手）：默认上一周；也供 PIP 抽屉快捷操作复用 */
async function rvGenerate(weekStart, fromDrawer) {
  if (rvState.busy) return null;
  rvState.busy = true;
  renderWeeklyReview();
  try {
    const r = await apiFetch('/api/weekly/generate', {
      method: 'POST',
      body: JSON.stringify({ weekStart, operator: agentState.operator })
    });
    rvUpsert(r.review);
    rvState.busy = false;
    renderWeeklyReview();
    return r.review;
  } catch (e) {
    rvState.busy = false;
    renderWeeklyReview();
    if (fromDrawer) throw e;
    alert('生成失败：' + e.message);
    return null;
  }
}

async function rvSaveEdit() {
  const review = rvFind(rvCurrentRange().weekStart);
  if (!review || !rvState.working) return;
  rvState.busy = true;
  renderWeeklyReview();
  try {
    const patch = {
      summary: rvState.working.summary,
      deferredTasks: rvState.working.deferredTasks || [],
      problems: rvState.working.problems || [],
      improvements: rvState.working.improvements || [],
      nextWeekPriorities: rvState.working.nextWeekPriorities || []
    };
    const r = await apiFetch('/api/weekly/update', {
      method: 'POST',
      body: JSON.stringify({ id: review.id, operator: agentState.operator, patch })
    });
    rvUpsert(r.review);
    rvState.editing = false;
    rvState.working = null;
    rvState.busy = false;
    renderWeeklyReview();
  } catch (e) {
    rvState.busy = false;
    renderWeeklyReview();
    alert('保存失败：' + e.message);
  }
}

async function rvConfirmReview() {
  const review = rvFind(rvCurrentRange().weekStart);
  if (!review) return;
  if (!window.confirm(`确认归档 ${review.weekStart} ~ ${review.weekEnd} 的周报吗？归档后不可再编辑或重新生成。`)) return;
  rvState.busy = true;
  renderWeeklyReview();
  try {
    const r = await apiFetch('/api/weekly/confirm', {
      method: 'POST',
      body: JSON.stringify({ id: review.id, operator: agentState.operator })
    });
    rvUpsert(r.review);
    rvState.busy = false;
    renderWeeklyReview();
  } catch (e) {
    rvState.busy = false;
    renderWeeklyReview();
    alert('归档失败：' + e.message);
  }
}

/* PIP 抽屉触发：生成上周复盘并跳转到复盘板块 */
async function runWeeklyGenerateFromAgent() {
  const weekStart = rvPrevWeekRange().weekStart;
  try {
    const review = await rvGenerate(weekStart, true);
    if (!review) return;
    rvState.period = 'prev';
    rvState.weekStart = null;
    renderWeeklyReview();
    const done = (review.completedTasks || []).length;
    const missing = [];
    if (!(review.improvements || []).length) missing.push('改进空间');
    agentBubble('agent',
      '✅ 上周复盘草稿已生成（<b>' + escapeHtml(review.weekStart) + ' ~ ' + escapeHtml(review.weekEnd) + '</b>）：' +
      '完成任务 ' + done + ' 项，下周重点 ' + (review.nextWeekPriorities || []).length + ' 项。' +
      (missing.length ? '<br><span class="ag-muted">' + escapeHtml(missing.join('、')) + '缺少记录，待人工补充。</span>' : '') +
      '<br>已在「每周总结与复盘」板块打开，请检查并编辑后点击「确认归档」。');
    document.getElementById('sec-review').scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  } catch (e) {
    agentBubble('sys', '⚠️ 生成复盘失败：' + escapeHtml(e.message));
  }
}

function initReview() {
  document.getElementById('rvPrevWeek').addEventListener('click', () => {
    rvState.period = 'prev'; rvState.weekStart = null; rvState.editing = false; rvState.working = null;
    renderWeeklyReview();
  });
  document.getElementById('rvThisWeek').addEventListener('click', () => {
    rvState.period = 'this'; rvState.weekStart = null; rvState.editing = false; rvState.working = null;
    renderWeeklyReview();
  });
  document.getElementById('rvHistory').addEventListener('change', (e) => {
    if (!e.target.value) return;
    rvState.period = 'history'; rvState.weekStart = e.target.value; rvState.editing = false; rvState.working = null;
    renderWeeklyReview();
  });
  document.getElementById('btnReviewGenerate').addEventListener('click', () => {
    const range = rvCurrentRange();
    rvGenerate(range.weekStart, false);
  });
  document.getElementById('btnReviewEdit').addEventListener('click', () => {
    if (rvState.editing) { rvSaveEdit(); return; }
    rvState.editing = true; rvState.working = null;
    renderWeeklyReview();
  });
  document.getElementById('btnReviewConfirm').addEventListener('click', () => {
    if (rvState.editing) {
      rvState.editing = false; rvState.working = null;
      renderWeeklyReview();
      return;
    }
    rvConfirmReview();
  });
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

/* ---------- 启动：加载 11 个 JSON，任一失败自动用 FALLBACK ---------- */
async function init() {
  const [kpi, gantt, roadmap, pipeline, todo, milestones, weeklyLog, blockers, resources, tasks, weeklyReviews] = await Promise.all([
    loadJson('data/kpi.json', FALLBACK.kpi),
    loadJson('data/gantt.json', FALLBACK.gantt),
    loadJson('data/roadmap.json', FALLBACK.roadmap),
    loadJson('data/pipeline.json', FALLBACK.pipeline),
    loadJson('data/todo.json', FALLBACK.todo),
    loadJson('data/milestones.json', FALLBACK.milestones),
    loadJson('data/weekly-log.json', FALLBACK.weeklyLog),
    loadJson('data/blockers.json', FALLBACK.blockers),
    loadJson('data/resources.json', FALLBACK.resources),
    loadJson('data/tasks.json', FALLBACK.tasks),
    loadJson('data/weekly-reviews.json', FALLBACK.weeklyReviews)
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
  state.weeklyReviews = weeklyReviews;

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
  renderWeeklyReview();
  initReview();
  updateSidebarBlockedDot();
  initTheme();
  bindEvents();
  initScrollSpy();
  initDrawer();
  initAgent();
  loadHubStatus();
}

/* ============================================================
 * PIP 助手（服务端 /api/* 驱动；纯静态托管时自动降级提示）
 * 安全约定：前端不含任何密钥；状态变更必须经确认卡二次确认。
 * ============================================================ */
const agentState = { open: false, busy: false, apiOnline: null, operator: 'Sera' };

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* markdown-lite：转义后支持 **加粗** 与换行 */
function mdLite(text) {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function fmtDueLocal(iso) {
  return String(iso || '').slice(5, 16).replace('T', ' ');
}

function fmtUpdTs(iso) {
  return String(iso || '').slice(5, 16).replace('T', ' ');
}

async function apiFetch(path, options) {
  const opts = Object.assign({}, options || {});
  opts.headers = Object.assign({ 'content-type': 'application/json' }, opts.headers || {});
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (err) { /* 非 JSON 响应 */ }
    throw new Error(msg);
  }
  return res.json();
}

function agentBubble(kind, html) {
  const log = document.getElementById('agentLog');
  const div = el('div', 'agent-msg agent-msg-' + kind);
  div.innerHTML = html;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

const AGENT_CLASS_BADGE = {
  done: 'done',
  in_progress: 'doing',
  blocked: 'blocked',
  overdue: 'late',
  pending: 'next',
  needs_confirmation: 'warn',
};

function renderAgentTaskCards(tasks) {
  const log = document.getElementById('agentLog');
  const wrap = el('div', 'agent-tasks');
  tasks.forEach((t) => {
    const card = el('div', 'agent-task');
    card.innerHTML =
      '<div class="at-head"><b>' + escapeHtml(t.id) + '</b>｜' + escapeHtml(t.title) +
      '<span class="badge badge-' + (AGENT_CLASS_BADGE[t.class] || 'next') + '">' + escapeHtml(t.label) + '</span></div>' +
      '<div class="at-meta">状态 ' + escapeHtml(t.status) + ' ｜ 负责人 ' + escapeHtml(t.owner) + ' ｜ 截止 ' + fmtDueLocal(t.dueAt) + '</div>' +
      '<div class="at-row">判定依据：' + escapeHtml((t.basis || []).join('；') || '—') + '</div>' +
      '<div class="at-row">建议下一步：' + escapeHtml(t.suggestion || '—') + '</div>';
    wrap.appendChild(card);
  });
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

/* 状态变更确认卡：用户点「确认更新」后才调用写接口 */
function renderConfirmCard(confirm) {
  const log = document.getElementById('agentLog');
  const card = el('div', 'agent-confirm');
  card.innerHTML =
    '<div class="ac-title">确认把 <b>' + escapeHtml(confirm.taskId) + '｜' + escapeHtml(confirm.title) + '</b> 修改为「' + escapeHtml(confirm.newStatus) + '」吗？</div>' +
    '<div class="ac-meta">当前状态：' + escapeHtml(confirm.previousStatus) + ' ｜ 负责人：' + escapeHtml(confirm.owner || '—') + ' ｜ 操作人：' + escapeHtml(agentState.operator) + '</div>';

  let evidenceInput = null;
  if (confirm.needsEvidence) {
    evidenceInput = el('input', 'ac-evidence');
    evidenceInput.type = 'text';
    evidenceInput.placeholder = '交付证据（可选）：如「交付包已提交设计团队」';
    card.appendChild(evidenceInput);
  }

  const row = el('div', 'ac-actions');
  const okBtn = el('button', 'btn btn-confirm', '确认更新');
  okBtn.type = 'button';
  const cancelBtn = el('button', 'btn btn-outline', '取消');
  cancelBtn.type = 'button';
  row.appendChild(okBtn);
  row.appendChild(cancelBtn);
  card.appendChild(row);
  log.appendChild(card);
  log.scrollTop = log.scrollHeight;

  cancelBtn.addEventListener('click', () => {
    card.remove();
    agentBubble('sys', '已取消本次状态变更。');
  });
  okBtn.addEventListener('click', () => doConfirmUpdate(confirm, card, okBtn, evidenceInput));
}

async function doConfirmUpdate(confirm, card, okBtn, evidenceInput) {
  okBtn.disabled = true;
  okBtn.textContent = '更新中…';
  const evidence = evidenceInput ? evidenceInput.value.trim() : '';
  try {
    const r = await apiFetch('/api/agent/confirm', {
      method: 'POST',
      body: JSON.stringify({ taskId: confirm.taskId, newStatus: confirm.newStatus, evidence, operator: agentState.operator }),
    });
    card.remove();
    if (r.noop) {
      agentBubble('sys', escapeHtml(r.message || '无需变更'));
      return;
    }
    let html = '✅ 已更新：<b>' + escapeHtml(r.task.id) + '｜' + escapeHtml(r.task.title) + '</b> 「' + escapeHtml(r.previousStatus) + '」→「' + escapeHtml(r.newStatus) + '」';
    if (r.notify) {
      if (r.notify.configured === false) html += '<br><span class="ag-muted">手机通知：未配置 WECHAT_WEBHOOK_URL，已跳过</span>';
      else if (r.notify.skipped) html += '<br><span class="ag-muted">手机通知：10 分钟内同状态已推送过，本次跳过</span>';
      else if (r.notify.ok) html += '<br><span class="ag-ok">手机通知已推送（' + (r.notify.durationMs != null ? r.notify.durationMs + 'ms' : '—') + '）</span>';
      else html += '<br><span class="ag-warn">任务已经更新，但企业微信通知发送失败。' + (r.notify.error ? '原因：' + escapeHtml(r.notify.error) : '') + '</span>';
    }
    agentBubble('agent', html);
    await refreshHubData();
    loadHubStatus();
  } catch (e) {
    okBtn.disabled = false;
    okBtn.textContent = '确认更新';
    agentBubble('sys', '⚠️ 更新失败：' + escapeHtml(e.message));
  }
}

async function agentSend(text) {
  const msg = String(text || '').trim();
  if (!msg || agentState.busy) return;
  agentState.busy = true;
  agentBubble('user', escapeHtml(msg));
  const thinking = agentBubble('agent', '<span class="ag-muted">思考中…</span>');
  try {
    const r = await apiFetch('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
    thinking.remove();
    if (r.reply) agentBubble('agent', mdLite(r.reply));
    if (r.tasks && r.tasks.length) renderAgentTaskCards(r.tasks);
    if (r.confirm) renderConfirmCard(r.confirm);
    if (r.notifyTest) await runNotifyTest(true);
  } catch (e) {
    thinking.remove();
    if (agentState.apiOnline === false) {
      agentBubble('sys', '当前为纯静态模式（未连接服务端 API），PIP 助手与手机通知不可用。部署到 Vercel 后自动开启。');
    } else {
      agentBubble('sys', '⚠️ 请求失败：' + escapeHtml(e.message));
    }
  } finally {
    agentState.busy = false;
  }
}

/* 测试手机通知：渲染完整诊断（发送状态/HTTP/errcode/errmsg/耗时/最近成功时间），失败展示真实原因 */
async function runNotifyTest(inDrawer) {
  const box = document.getElementById('notifyResult');
  box.hidden = false;
  box.innerHTML = '<span class="ag-muted">发送中…</span>';
  if (inDrawer) agentBubble('agent', '<span class="ag-muted">手机通知发送中…</span>');
  let r;
  try {
    r = await apiFetch('/api/notifications/wecom/test', { method: 'POST', body: JSON.stringify({ operator: agentState.operator }) });
  } catch (e) {
    box.innerHTML = '<span class="ag-warn">发送失败：' + escapeHtml(e.message) + '</span>';
    if (inDrawer) agentBubble('sys', '⚠️ 发送失败：' + escapeHtml(e.message));
    return;
  }
  const rows = [
    ['发送状态', r.ok ? '发送成功' : '发送失败'],
    ['HTTP 状态码', r.httpStatus != null ? String(r.httpStatus) : '—'],
    ['企业微信 errcode', r.errcode != null ? String(r.errcode) : '—'],
    ['企业微信 errmsg', r.errmsg || '—'],
    ['响应耗时', r.durationMs != null ? r.durationMs + ' ms' : '—'],
    ['请求时间', r.requestedAt || '—'],
    ['最近一次成功', r.lastSuccessAt || '—'],
  ];
  if (!r.ok && r.error) rows.splice(1, 0, ['失败原因', r.error]);
  box.innerHTML = rows.map(([k, v]) => '<div class="nr-row"><span>' + k + '</span><b>' + escapeHtml(v) + '</b></div>').join('');
  if (inDrawer) {
    agentBubble('agent',
      '手机通知测试：' + (r.ok ? '✅ 发送成功' : '❌ 发送失败') +
      '（HTTP ' + (r.httpStatus != null ? r.httpStatus : '—') +
      '，errcode=' + (r.errcode != null ? r.errcode : '—') +
      ' ' + (r.errmsg || '') +
      '，' + (r.durationMs != null ? r.durationMs + 'ms' : '—') + '）' +
      (r.error ? '<br>失败原因：' + escapeHtml(r.error) : ''));
  }
  loadHubStatus();
}

/* Agent 修改后全量刷新：统计 / 倒计时 / Pipeline / 待办 / 周更 / 最近更新 */
async function refreshHubData() {
  try {
    const d = await apiFetch('/api/tasks');
    state.tasks = { version: 1, updatedAt: d.tasksUpdatedAt, tasks: d.tasks };
    state.todo = d.todo;
    state.pipeline = d.pipeline;
    state.weeklyLog = d.weeklyLog;
    renderSummary();
    renderCountdown(state.tasks);
    renderPipeline(state.pipeline);
    renderTodo(state.todo);
    renderWeekly(state.weeklyLog);
    updateSidebarBlockedDot();
    renderRecentUpdates(d.recentUpdates || []);
    applyFilters();
  } catch (e) {
    console.warn('[绩效看板] 刷新任务数据失败', e);
  }
}

function renderRecentUpdates(list) {
  const ul = document.getElementById('recentUpdates');
  if (!ul) return;
  ul.innerHTML = '';
  if (!list || !list.length) {
    ul.appendChild(el('li', 'upd-empty', '暂无 PIP 助手修改记录'));
    return;
  }
  list.forEach((u) => {
    const li = el('li', 'upd-item');
    li.innerHTML =
      '<span class="upd-time">' + fmtUpdTs(u.ts) + '</span>' +
      '<span class="upd-body"><b>' + escapeHtml(u.taskId || '—') + '</b> 「' + escapeHtml(u.previousStatus || '—') + ' → ' + escapeHtml(u.newStatus || '—') + '」</span>' +
      '<span class="upd-op">' + escapeHtml(u.operator || 'agent') + '</span>';
    ul.appendChild(li);
  });
}

function setChip(id, cls, text) {
  const chip = document.getElementById(id);
  if (!chip) return;
  chip.className = 'st-chip ' + cls;
  chip.textContent = text;
}

function paintHubStatus(s) {
  if (!s) {
    setChip('stAgent', 'st-off', 'PIP 助手未连接');
    setChip('sysAgent', 'st-off', 'PIP 助手未连接（静态模式）');
    setChip('stWebhook', 'st-off', 'Webhook 未连接');
    setChip('sysWebhook', 'st-off', 'Webhook 未连接');
    const ls = document.getElementById('sysLastSuccess');
    const lt = document.getElementById('sysLastTest');
    if (ls) ls.textContent = '—';
    if (lt) lt.textContent = '—';
    return;
  }
  const agentText = s.agent.llmConfigured ? 'PIP 助手在线（规则+LLM）' : 'PIP 助手在线（规则模式）';
  setChip('stAgent', 'st-on', agentText);
  setChip('sysAgent', 'st-on', agentText);
  const hookText = s.webhook.configured ? 'Webhook 已配置' : 'Webhook 未配置';
  setChip('stWebhook', s.webhook.configured ? 'st-on' : 'st-warn', hookText);
  setChip('sysWebhook', s.webhook.configured ? 'st-on' : 'st-warn', hookText);
  const ls = document.getElementById('sysLastSuccess');
  const lt = document.getElementById('sysLastTest');
  if (ls) ls.textContent = s.webhook.lastSuccessAt || '—';
  if (lt) lt.textContent = s.webhook.lastTest ? ((s.webhook.lastTest.ok ? '成功' : '失败') + ' · ' + s.webhook.lastTest.at) : '—';
}

async function loadHubStatus() {
  try {
    const s = await apiFetch('/api/status');
    agentState.apiOnline = true;
    paintHubStatus(s);
    renderRecentUpdates(s.recentUpdates || []);
  } catch (e) {
    agentState.apiOnline = false;
    paintHubStatus(null);
    renderRecentUpdates([]);
  }
}

function initAgent() {
  const drawer = document.getElementById('agentDrawer');
  const overlay = document.getElementById('agentOverlay');
  const input = document.getElementById('agentText');

  const setOpen = (open) => {
    agentState.open = open;
    drawer.classList.toggle('open', open);
    overlay.hidden = !open;
    if (open) {
      loadHubStatus();
      setTimeout(() => input.focus(), 220);
    }
  };
  document.getElementById('btnAgent').addEventListener('click', () => setOpen(true));
  document.getElementById('agentClose').addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && agentState.open) setOpen(false);
  });

  document.getElementById('agentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    agentSend(v);
  });

  document.querySelectorAll('.agent-quick button[data-q]').forEach((b) => {
    b.addEventListener('click', () => agentSend(b.dataset.q));
  });

  document.getElementById('btnTestNotify').addEventListener('click', () => runNotifyTest(false));

  const opInput = document.getElementById('operatorInput');
  opInput.addEventListener('input', () => {
    agentState.operator = opInput.value.trim() || 'Sera';
  });

  agentBubble('agent',
    '我是 PIP 助手，可以帮你核对已完成、未完成、逾期和阻塞任务，也可以更新任务状态并发送手机通知。');
}

document.addEventListener('DOMContentLoaded', init);
