# 06 — 甘特图与 Pipeline 结构设计说明

> 文档版本：v1.1 ｜ 更新日期：2026-07-21 ｜ 维护人：Sera
> 适用范围：v0.3「PIP 进度管理 Dashboard」升级后的页面结构与数据文件；v1.1 增补 v2「品牌与交互升级」的字段新增与页面收敛说明（见第 8 节，品牌与动态 KPI 设计动机见 `docs/07_brand_and_interaction_upgrade.md`）

本文档说明本轮升级的信息架构设计：为什么引入甘特图与依赖图、任务之间的串行/并行关系、6 条业务主线（Workstream）的定义与进度口径、页面 11 区块结构、10 个数据 JSON 的字段约定，以及每周更新的标准操作流程。

---

## 1. 为什么新增甘特图（Trial Timeline Gantt Chart）

v0.2 及之前的看板以**卡片**为主要载体（KPI 卡片、Pipeline 卡片、任务进度条）。卡片擅长表达「状态」——某件事是 Done / Doing / Next / Blocked——但有两个结构性盲区：

1. **不表达时间顺序**。卡片无法回答「这件事排在什么时候做、横跨哪几周、是否按计划在推进」。PIP 试用期只有 6 周（W1 07/21 – W6 08/31），时间是本看板最重要的约束维度。
2. **不表达依赖关系**。卡片无法回答「这件事被谁卡住、它卡住会影响谁」。例如首单交易测试依赖设计交付包提交，这条因果链在卡片视图里是隐性的。

因此 v0.3 新增两个互补视图：

- **甘特图（区块 04）**：把任务条放进 W1–W6 的时间轴，6 条业务主线各占一条泳道，任务条按状态着色（Done=绿 / Doing=蓝 / Next=黄 / Blocked=红），一眼看出每条线的时间排布与推进健康度。
- **依赖图（区块 05）**：把串行主链路与并行获客线画成节点图，明确暴露关键路径（Critical Path）——链上任何一环 Blocked，下游全部顺延。

原有卡片视图全部保留（收编进区块 06 子区），三者分工：**甘特图看时间、依赖图看因果、卡片看细节**。

---

## 2. 串行链路（必须按顺序推进的任务）

以下任务构成 PIP 的**串行主链路**，前一项不完成，后一项无法有效启动：

```text
设计交付包整理 → 提交设计团队 → 客户资料字段确认 → 客户唤醒 → 注册 / KYC → 首单 → CRIB 复盘
```

| 链上环节 | 串行原因 |
| --- | --- |
| 设计交付包整理 → 提交设计团队 | 交付物不齐就无法提排期 |
| 提交设计团队 → 客户资料字段确认 | 客户触达话术与页面素材依赖设计排期确定后的交付物 |
| 客户资料字段确认 → 客户唤醒 | UID、注册状态、KYC 状态未确认前，唤醒动作无的放矢 |
| 客户唤醒 → 注册 / KYC | 唤醒是注册 / KYC 的前置动作 |
| 注册 / KYC → 首单 | 未完成 KYC 无法发起 OTC 首单 |
| 首单 → CRIB 复盘 | 复盘需要首单实测数据作为输入 |

**关键跨线依赖**：首单交易测试（交易测试线）依赖设计交付包提交（设计交付线）——COBO/POBO 流程说明是客户完成首单的操作依据，交付包未提交前，首单测试只能停留在内部演练。

---

## 3. 并行线（可同时推进、互不阻塞的任务）

### 3.1 三条并行获客线

大数据名单、集团销售转介、Partner / KOL 拓展三条获客路径**彼此独立、并行推进**，共同汇入客户池：

```text
大数据名单（内部获客）     ─┐
集团销售转介（Oscar 对接） ─┼→ 客户池 → 进入串行主链路的「客户唤醒」环节
Partner / KOL 拓展         ─┘
```

- 三条线各自的阻塞互不传染：例如「大数据名单」Blocked（待 Simon 协助调取）不影响 Partner/KOL 物料制作与触达。
- 任一条线产出的客户，都汇入同一个客户池，再统一进入主链路的唤醒 → 注册 / KYC → 首单流程。

### 3.2 与主链路并行的支撑线

- **CRM 清洗 / 分层与设计交付并行**：TG 存量客户的建表、清洗、五星筛选不依赖设计交付包，两条线同步推进、在「客户唤醒」处汇合。
- **私密看板线全程并行**：看板自身的私密化部署（Cloudflare Pages + Access）与所有业务线并行，只依赖 Sera 提供 Cloudflare 账号，不阻塞任何业务任务。

---

## 4. 6 条 Workstream 总表

| # | Workstream | 目标 | 当前进度（2026-07-21） |
| --- | --- | --- | --- |
| WS1 | 设计交付线 | OTC USD 大宗交易设计交付包提交设计团队并确认排期，支撑页面与话术物料落地 | **90%**（交付包已整理完成，待提交排期） |
| WS2 | CRM 客户线 | TG 存量客户 CRM 建表、清洗、分层（五星/四星/三星/待评估），完成客户资料字段确认 | **80%**（初版 CRM 已完成，字段确认中） |
| WS3 | 客户转化线 | 唤醒 → 注册/KYC → 首单转化：个人注册 ≥19 人、机构注册 ≥6 家、交易收入 ≥26,000 USDT | **15%**（高价值客户筛选中，转化待启动） |
| WS4 | 交易测试线 | 配合静格跑通 COBO/POBO 首单交易测试，沉淀实测流程与问题清单 | **20%**（流程说明已就绪，待周四/周五实测） |
| WS5 | 渠道拓展线 | 三条并行获客：大数据名单、集团销售对接 ≥6 次、Partner ≥7 家、KOL ≥10 位 | **10%**（线索池草案已备，触达待启动） |
| WS6 | 私密看板线 | 看板从公网转为私密访问：仓库 PRIVATE、公网 Pages 下线，Cloudflare Pages + Access 仅放行 Simon | **65%**（仓库已私有、方案与文档已备，待 Cloudflare 部署） |

> 各主线进度来源与计算口径见第 7 节；数据存放于 `data/roadmap.json`。

---

## 5. 页面 11 区块信息结构

| 区块 | 名称 | 内容 | 数据源 |
| --- | --- | --- | --- |
| 01 | 顶导航 | 看板标题、搜索框（过滤 Pipeline 卡片）、状态筛选、Export 按钮、Day/Night 主题切换 | — |
| 02 | Executive Summary | 总体进度（6 主线加权）、本周完成数、阻塞事项数、下一节点 | `roadmap.json` + `milestones.json` 汇总 |
| 03 | PIP KPI | 核心 KPI 卡片，新增 done/total 进度条 | `kpi.json` |
| 04 | Trial Timeline Gantt Chart | W1 07/21 – W6 08/31 六周时间轴，6 条主线泳道，任务条按状态着色 | `gantt.json` |
| 05 | Workstream Dependency Map | 串行主链路 + 并行获客线 + 私密看板线的节点依赖图 | 结构内置（`docs/06` 第 2、3 节） |
| 06 | Main Tasks & Subtasks | 任务树（可展开）；子区：本周进展柱状图、Live Task Progress、Pipeline 四列看板、设计交付清单 | `task-tree.json`、`task-progress.json`、`pipeline.json`、`design-delivery.json` |
| 07 | CRM 漏斗 | 客户分层 + 转化漏斗（新增转化率与下一步两列） | `crm-summary.json` |
| 08 | Weekly To Do List | 本周待办：P0 高亮、过期标红、可搜索 | `todo.json` |
| 09 | 阻塞事项 | 风险与卡点集中曝光 | `pipeline.json`（Blocked 项）+ `todo.json` |
| 10 | 下周计划 | 下周排期动作 | `todo.json` / `gantt.json` 下周部分 |
| 11 | 页脚 | Last Updated 时间与说明 | `app.js` 生成 |

状态色语义全站统一：**Done=绿 / Doing=蓝 / Next=黄（或灰）/ Blocked=红**；甘特图任务条与进度条的 Next 一律用黄。

---

## 6. 数据文件说明（10 个 JSON）

所有业务数据与代码完全分离，存放于 `data/`；改数据不改代码，刷新页面即生效。`app.js` 内置同名 FALLBACK 兜底数据（逐字一致，见第 7.4 节硬规则）。

| 文件 | 结构 | 用途 | 更新频率 |
| --- | --- | --- | --- |
| `kpi.json` | 数组 | 区块 03 PIP KPI 卡片 + 进度条 | 每周五 |
| `pipeline.json` | 数组 | 区块 06 子区 Pipeline 四列看板；区块 09 阻塞事项来源 | 每周五 |
| `crm-summary.json` | 对象 | 区块 07 客户分层 + 转化漏斗 | 每周五（按真实 CRM 表统计汇总后替换） |
| `design-delivery.json` | 数组 | 区块 06 子区设计交付清单 | 提交设计团队后 / 验收反馈有变化时 |
| `task-progress.json` | 数组 | 区块 06 子区 Live Task Progress | 任务状态一变即更新 |
| `roadmap.json` | 数组 | 6 条 Workstream 主线（区块 02、04 的泳道框架） | 每周五 |
| `gantt.json` | 数组 | 区块 04 甘特图任务条（泳道 / 起止日期 / 依赖） | 每周五 |
| `task-tree.json` | 数组（树） | 区块 06 Main Tasks & Subtasks 可展开任务树 | 每周五 |
| `todo.json` | 数组 | 区块 08 Weekly To Do、区块 10 下周计划 | 每周五（平时可随时增补） |
| `milestones.json` | 数组 | 区块 02 Executive Summary 的「下一节点」及关键节点标记 | 里程碑达成 / 新增时 |

### 6.1 既有 5 个 JSON（含本轮新增字段）

**`kpi.json`** — 数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `label` | 指标名称（如「个人注册」） |
| `target` | 目标值（如「≥19人」） |
| `current` | 当前值描述 |
| `trend` | 趋势描述 |
| `status` | `done` / `doing` / `next` / `blocked` |
| `done` | 【v0.3 新增】已完成数值（进度条分子，如已注册人数） |
| `total` | 【v0.3 新增】目标数值（进度条分母，如 19） |

**`pipeline.json`** — 数组，每个元素：`module`（业务线）、`pipGoal`、`progress`、`output`、`next`、`owner`、`priority`（P0/P1）、`status`（Done/Doing/Next/Blocked）。

**`crm-summary.json`** — 对象：`updatedAt`、`total`、`byLevel[]`（`level`/`count`）、`funnel[]`、`note`。
其中 `funnel[]` 每个阶段元素【v0.3 新增两列】：

| 字段 | 含义 |
| --- | --- |
| `stage` | 阶段名：咨询 → 信息收集 → 注册 → KYC/KYB → 报价 → 首单 → 长期维护 |
| `count` | 该阶段客户数 |
| `rate` | 【新增】相对上一阶段的转化率（如 `"71%"`；首阶段为 `"—"`） |
| `next` | 【新增】该阶段的下一步动作 |

**`design-delivery.json`** — 数组，每个元素：`item`、`category`、`status`（done/doing/next）、`note`。

**`task-progress.json`** — 数组，每个元素：`id`、`task`、`status`（Done/Doing/Next/Blocked）、`progress`（0–100）、`owner`、`updatedAt`、`next`。

### 6.2 本轮新增 5 个 JSON

**`roadmap.json`** — 6 条主线数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `id` | 主线编号（`WS01`–`WS06`） |
| `name` | 主线名称（如「设计交付线」） |
| `goal` | 主线目标（与第 4 节一致） |
| `progress` | 当前进度 0–100（口径见 7.3） |
| `status` | `Done` / `Doing` / `Next` / `Blocked` |
| `owner` | 负责人 |
| `target` | 当前阶段目标（如「个人注册≥19，机构注册≥6」） |

**`gantt.json`** — 任务条**扁平数组**（前端按 `workstream` 归入 6 条泳道，按起止日期渲染到 W1 07/21 – W6 08/31 时间轴），每个元素：

| 字段 | 含义 |
| --- | --- |
| `id` | 任务条编号（`G001`…） |
| `workstream` | 所属泳道名，与 6 条主线名称一致（如「设计交付线」） |
| `task` | 任务条名称 |
| `start` | 开始日期（`YYYY-MM-DD`） |
| `end` | 结束日期（`YYYY-MM-DD`） |
| `progress` | 进度 0–100（与 `task-tree.json` 同名任务一致） |
| `status` | `Done` / `Doing` / `Next` / `Blocked`（决定任务条着色） |
| `dependsOn` | 前置任务条 `id` 数组（如 `["G001"]`；无前置为空数组 `[]`） |
| `owner` | 【v2 新增】负责人（如 `"Sera / Simon"`），在任务条悬浮详情中展示 |
| `next` | 【v2 新增】该任务的下一步动作，在任务条悬浮详情中展示 |

**`task-tree.json`** — 任务树数组，每个主任务节点：

| 字段 | 含义 |
| --- | --- |
| `id` | 节点编号（`T001`…） |
| `title` | 主任务名 |
| `owner` | 负责人 |
| `status` | `Done` / `Doing` / `Next` / `Blocked` |
| `progress` | 0–100（= 已完成子项数 / 子项总数） |
| `children[]` | 子项数组，元素为 `{ "title": 子项名, "done": true/false }` |

**`todo.json`** — 周待办数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `task` | 待办事项描述 |
| `owner` | 负责人 |
| `due` | 截止日期（`YYYY-MM-DD`）；**过期未完成自动标红** |
| `priority` | `P0`（高亮）/ `P1` |
| `status` | `Done` / `Doing` / `Next` / `Blocked` |

**`milestones.json`** — 里程碑数组，每个元素：`date`（`YYYY-MM-DD`）、`title`、`status`（`Done` / `Doing` / `Next`）。Executive Summary 的「下一节点」取日期最近且未完成的里程碑。

---

## 7. 每周更新操作指南

### 7.1 更新顺序（建议）

每周五按依赖关系从底向上更新，避免口径漂移：

1. `todo.json` — 先复盘本周待办：完成的标 `done`，未完成且过期的保留原 `due`（页面自动标红），新增下周待办
2. `task-progress.json` — Live Task Progress 与待办对齐
3. `task-tree.json` — 任务树节点状态 / 进度同步
4. `kpi.json` — 更新 `current` / `trend` / `status` 及 `done` / `total` 数值
5. `roadmap.json` — 按口径重算 6 条主线 `progress`
6. `gantt.json` — 移动任务条状态与进度；下一周的任务条排入时间轴
7. `crm-summary.json` — 按真实 TG CRM 表统计汇总后整体替换（含 `rate` / `next` 两列）
8. `pipeline.json` — 更新各业务线 `progress` / `output` / `next` / `status`
9. `milestones.json` — 已达成的标 `done`，新增下一节点
10. `design-delivery.json` — 有验收反馈或排期变化时更新

### 7.2 更新后自查清单

1. 本地 `python3 -m http.server 8080` 预览，**日间 / 夜间两种主题**各过一遍
2. 执行 FALLBACK 一致性比对（见 7.4）
3. 脱敏自查：无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话（同事名 Sera/Simon/静格/Oscar/Kimi 除外）
4. `git commit && git push`

### 7.3 进度百分比口径（统一算法）

进度条与百分比全站使用同一套口径，**禁止凭感觉填数**：

| 指标 | 口径 |
| --- | --- |
| 个人注册 | 已完成注册人数 / 19 |
| 机构注册 | 已完成注册家数 / 6 |
| 交易收入 | 累计交易收入 / 26,000 USDT |
| 设计交付包 | 已完成交付文件数 / 应交付文件总数（当前 8 项） |
| Partner / 中介 | 已确认合作家数 / 7 |
| KOL | 已确认合作位数 / 10 |
| 销售对接 | 已完成对接次数 / 6 |
| Workstream 总进度 | 该主线全部任务进度按子项数加权平均；无子项的任务：Done=100%、Next=0%、Doing 按已完成子步骤估算、Blocked 按已完成部分计 |
| 甘特任务条进度 | 该任务已完成子项数 / 子项总数（与 `task-tree.json` 同名节点保持一致） |
| 漏斗转化率 `rate` | 本阶段 count / 上一阶段 count（首阶段为 `—`） |

`kpi.json` 的 `done` / `total` 两个数值字段必须与上述口径一致，前端进度条直接渲染 `done / total`。

### 7.4 ⚠️ FALLBACK 硬规则

`app.js` 内置 `FALLBACK` 离线兜底数据（键名：`kpi` / `pipeline` / `designDelivery` / `crmSummary` / `taskProgress` / `roadmap` / `gantt` / `taskTree` / `todo` / `milestones`），与 `data/*.json` **逐字一致**。

- 凡新增 / 修改任何 `data/*.json`，**必须同步更新 `app.js` 中 FALLBACK 的对应部分**；
- 改完后运行一致性比对脚本验证两者逐字相同，不一致不允许提交；
- 这是 `file://` 双击打开时页面仍能完整渲染的唯一保障。

---

## 8. v2 品牌与交互升级：字段新增与页面收敛（2026-07-21）

### 8.1 甘特任务条新增 owner / next 悬浮详情字段

`gantt.json` 每个任务条新增两个字段（见 6.2 节字段表）：

- `owner`：负责人（如 `"Sera / Simon"`）；
- `next`：该任务的下一步动作。

前端在甘特图任务条上提供**悬浮详情**（hover tooltip）：除原有的任务名、起止日期、进度、状态外，同时展示 `owner` 与 `next`。设计动机：上级扫甘特图时最常问的两个问题是「这条谁在做」和「下一步是什么」，悬浮详情让这两个答案零跳转可得，甘特图从「时间视图」升级为「时间 + 责任 + 行动」三合一视图。

### 8.2 页面收敛说明

v2 对页面信息架构做减法，三个变化：

1. **设计交付清单独立区块移除，并入任务树**：原独立的设计交付清单区块取消，内容收编为 **06 Main Tasks & Subtasks** 任务树的子区（数据源仍为 `design-delivery.json`，更新频率不变）。理由：交付包本质是「设计交付线」这条主线的子任务集合，独立成区会造成同一主线两处查看；并入任务树后，主任务节点（设计交付包）与其 8 项子项在同一展开层级内呈现，进度口径（已完成子项数 / 子项总数）与任务树天然一致。
2. **下周计划并入 Next Milestones 区块**：原「10 下周计划」独立区块取消，下周排期动作并入 **Next Milestones**（里程碑与下一节点）区块呈现，数据源仍为 `todo.json` / `gantt.json` 的下周部分与 `milestones.json`。理由：「下周要做什么」与「下一个节点是什么」回答的是同一个向前看的问题，分两区反而割裂；合并后按时间顺序一屏呈现，上级对近期节奏的判断更连贯。
3. **KPI 从 8 卡收敛为 6 张动态图形卡**：原 8 张统一静态卡片（机构注册 / 个人注册 / 交易收入 / Partner / KOL / 销售对接 / 设计交付包 / 客户 Pipeline）收敛为 6 张按指标性质选型的动态图形卡——Partner、KOL、销售对接三张合并为「渠道拓展」多轨条卡（`sub[]` 三线合计 23），其余五张分别改为水箱水位（`water`）、6 分段格（`segments`）、发光金额条（`money`）、进度环（`ring`）、迷你漏斗（`funnel`）。组件类型由 `kpi.json` 的 `component` 字段驱动；各组件设计 rationale 与 `done` / `total` 口径表见 `docs/07_brand_and_interaction_upgrade.md` 第 6、7 节。收敛后区块 03 一屏看全 PIP 核心目标，信息密度与扫读效率同时提升。

> 第 5 节「页面 11 区块信息结构」描述的是 v0.3 结构；v2 收敛后以上述三条变化为准，其余区块与数据源不变。

---

> 相关文档：私密部署操作清单见 `docs/04_private_deployment.md`；安全与脱敏规范见 `SECURITY.md`；品牌与动态 KPI 设计说明见 `docs/07_brand_and_interaction_upgrade.md`；版本变更见 `docs/CHANGELOG.md`。
