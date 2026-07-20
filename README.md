# HTX OTC BD Progress Hub

> 给 Simon（Primary Reviewer）查看的 HTX OTC BD / PIP 工作进度看板（**私密版本**）

## 一、项目说明

这是一个**纯前端的 PIP 进度管理 Dashboard**，用于展示 Sera 围绕 PIP 目标推进的 HTX OTC BD 工作进度，包括：

- **Executive Summary**：总体进度、本周完成、阻塞数、下一节点
- **Trial Timeline Gantt Chart**：W1 07/21 – W6 08/31 六周时间轴，6 条业务主线泳道，任务条按状态着色
- **Workstream Dependency Map**：串行主链路（设计交付包 → 提交设计团队 → 客户资料字段确认 → 客户唤醒 → 注册/KYC → 首单 → CRIB 复盘）+ 并行获客线 + 私密看板线
- **Main Tasks & Subtasks**：可展开任务树（含本周进展柱状图、Live Task Progress、Pipeline 四列看板、设计交付清单子区）
- **PIP KPI**：核心指标 + done/total 进度条
- **TG 存量客户 CRM 漏斗**：分层 + 转化漏斗（含转化率与下一步）
- **Weekly To Do List**：P0 高亮、过期标红、可搜索
- **阻塞事项 / 下周计划**：风险曝光与周度节奏管理

6 条业务主线：设计交付线（90%）、CRM 客户线（80%）、客户转化线（15%）、交易测试线（20%）、渠道拓展线（10%）、私密看板线（65%）。结构设计详见 `docs/06_gantt_and_pipeline_structure.md`。

技术特点：

- **纯 HTML / CSS / JS**，无构建工具、无后端、无依赖安装
- 数据与代码完全分离：所有业务数据放在 `data/*.json`，改数据不用改代码
- **日间 / 夜间双主题**：默认日间（light），夜间（dark）战情室风格完整保留；状态语义统一：Done=绿、Doing=蓝、Next=黄、Blocked=红
- 内置离线数据兜底：即使直接双击打开（`file://` 协议下无法 fetch JSON），页面也能用内置示例数据正常渲染

## 二、目录结构

```
htx-otc-progress-hub/
├── index.html                  # 主页面（11 区块看板入口，含右上角 Day/Night 切换）
├── style.css                   # 全局样式（日间/夜间双主题、色板、组件）
├── app.js                      # 前端逻辑（加载 JSON → 渲染各模块，含离线兜底数据）
├── data/                       # 业务数据（改这里即可更新看板，无需改代码）
│   ├── kpi.json                # 核心 KPI（component 组件类型 / done / total / 目标 / 趋势）
│   ├── pipeline.json           # 各业务线 Pipeline（PIP 目标 / 进度 / 产出 / 下一步）
│   ├── design-delivery.json    # OTC USD 大宗交易设计交付包清单
│   ├── crm-summary.json        # TG 存量客户 CRM 汇总（分层 + 漏斗转化率 + 下一步）
│   ├── task-progress.json      # Live Task Progress 任务进度
│   ├── roadmap.json            # 6 条 Workstream 主线（目标 / 进度 / 状态）
│   ├── gantt.json              # 甘特图任务条（泳道 / 起止日期 / 依赖 / owner / next）
│   ├── task-tree.json          # Main Tasks & Subtasks 任务树
│   ├── todo.json               # Weekly To Do List（P0 / 截止日 / 状态）
│   └── milestones.json         # 里程碑与下一节点
├── docs/                       # 设计说明、部署清单、复盘文档等
│   ├── 01_reference_breakdown.md
│   ├── 02_project_brief.md
│   ├── 03_design_spec.md
│   ├── 04_private_deployment.md # Cloudflare Pages + Access 私密部署操作清单
│   ├── 05_access_control.md     # 访问控制与身份验证说明（邮箱 OTP / Google 登录）
│   ├── 06_gantt_and_pipeline_structure.md # 甘特图与 Pipeline 结构设计
│   ├── 07_brand_and_interaction_upgrade.md # 品牌与交互升级说明（动态 KPI / Logo / 命名规范）
│   └── CHANGELOG.md            # 版本变更记录
├── assets/                     # 静态资源
│   └── reference-dashboard.png # 视觉参考图（深色工地运营 Dashboard）
├── TASK_STATUS.md              # 升级任务状态日志（[Progress] 格式）
├── SECURITY.md                 # 安全与数据脱敏规范
├── .env.example                # 私密部署所需环境变量模板（不含真实值）
├── .nojekyll                   # 历史遗留文件（原 GitHub Pages 兼容用，现已下线，保留无副作用）
└── README.md                   # 本文件
```

## 三、本地预览

### 方式一：本地起服务（推荐，能看到真实 JSON 数据）

在项目目录下运行：

```bash
cd htx-otc-progress-hub
python3 -m http.server 8080
```

然后浏览器访问 **http://localhost:8080** 。此方式下页面通过 `fetch` 读取 `data/*.json` 的真实内容，改完 JSON 刷新页面立即生效，是日常更新数据时的推荐姿势。

### 方式二：直接双击 index.html（最快）

直接双击 `index.html` 用浏览器打开即可。由于浏览器安全限制，`file://` 协议下无法读取本地 JSON 文件，页面会自动切换到**内置离线兜底数据**渲染，不影响浏览版式与交互。适合快速预览。

## 四、主题切换（Day / Night）

- **默认日间（light）**：首次打开即为日间主题，白天汇报、投影场景更清晰。
- **夜间（dark）**：保留原深色战情室风格。
- 点击页面**右上角 Day/Night 按钮**即可切换；选择会写入浏览器 `localStorage`，**刷新或下次打开自动保持**所选主题，无需重复设置。

## 五、访问链接

- **私密部署后更新（仅授权邮箱可访问）**：Cloudflare Pages + Access 部署完成后，将把私密链接单独发给 Simon，验证邮箱另行告知，不写入本文档。
- 仓库地址：https://github.com/78tyih/htx-otc-progress-hub （**PRIVATE**，仅授权成员可见）
- ⚠️ 原公网 GitHub Pages 地址已**永久下线**（旧链接返回 404），请勿再使用或转发。

## 六、私密部署（Cloudflare Pages + Access）

- **部署目标**：私密访问（仅 Simon 本人）。任何访客必须通过真实身份验证（邮箱 OTP 一次性验证码 / Google 登录）才能打开页面；**禁止前端 JS 假登录**（纯前端校验可被绕过，不算数）。
- **当前状态**：GitHub 仓库已转为 **PRIVATE**；公网 GitHub Pages 已删除（旧链接已 404）；私密部署方案与安全文档已就绪。
- **推荐方案**：**Cloudflare Pages + Cloudflare Access**——Pages 托管静态站点，Access 在边缘网关做身份验证，策略仅放行 Simon 的邮箱；访问者输入邮箱收取 OTP 验证码，或直接用 Google 账号登录，验证通过后方可访问。
- **待执行**：待 Sera 提供 Cloudflare 账号后，按 `docs/04_private_deployment.md` 操作清单执行；访问控制细节见 `docs/05_access_control.md`；环境变量模板见 `.env.example`；安全规范见 `SECURITY.md`。
- **部署完成后**：将私密链接发给 Simon，并单独告知用于验证的邮箱地址。

## 七、⚠️ 数据脱敏警示（公网 / 私网均适用，务必阅读）

> **即使已转为私密部署，脱敏规则不放松**：私密仓库同样可能被截图、转发或误开权限，敏感信息一律不入库、不入页。

- ❌ **不要上传真实 CRM 明细或客户身份信息**：包括真实客户姓名、HTX UID、TG 用户名 / 群组路径、银行账户、邮箱、电话等。
- ✅ **只放汇总数据和脱敏编号**：客户一律使用占位编号（如 `Client-001`、`Client-002`），数字只放汇总统计。
- 👤 **同事名例外**：Sera / Simon / 静格 / Oscar / Kimi 可在页面与数据中出现。
- 🔒 **真实 CRM 表留本地或私有文件夹**（如本地加密目录 / 公司私有云盘），每周从中统计汇总数据后再更新到本仓库。
- 当前仓库内所有数据均为脱敏占位数据，已通过脱敏扫描；后续每次提交前请自查一遍 `data/*.json`，规范详见 `SECURITY.md`。

## 八、如何更新 data/*.json

十个 JSON 文件与前端渲染一一对应，**改完 JSON 无需改任何代码，刷新页面即生效**。

> ⚠️ 硬规则：`app.js` 内置的 FALLBACK 离线兜底数据（键名：`kpi` / `pipeline` / `designDelivery` / `crmSummary` / `taskProgress` / `roadmap` / `gantt` / `taskTree` / `todo` / `milestones`）与 `data/*.json` 保持**逐字一致**。修改任何 JSON 后，必须同步更新 `app.js` 中对应的 FALLBACK，并用脚本比对验证两者逐字相同，不一致不允许提交。

| 文件 | 用途 | 更新频率 |
| --- | --- | --- |
| `kpi.json` | 03 PIP KPI 动态图形卡（6 张，component 驱动） | 每周五 |
| `pipeline.json` | 06 Pipeline 四列看板；09 阻塞事项来源 | 每周五 |
| `crm-summary.json` | 07 客户分层 + 转化漏斗 | 每周五（按真实 CRM 表统计汇总后替换） |
| `design-delivery.json` | 06 设计交付清单子区 | 提交设计团队后 / 验收反馈有变化时 |
| `task-progress.json` | 06 Live Task Progress 子区 | 任务状态一变即更新 |
| `roadmap.json` | 02 Executive Summary、04 甘特泳道框架 | 每周五 |
| `gantt.json` | 04 甘特图（含 owner / next 悬浮详情） | 每周五 |
| `task-tree.json` | 06 Main Tasks & Subtasks 任务树 | 每周五 |
| `todo.json` | 08 Weekly To Do、10 下周计划 | 每周五（平时可随时增补） |
| `milestones.json` | 02 「下一节点」及关键节点 | 里程碑达成 / 新增时 |

### 字段说明

**1. `data/kpi.json`**（数组，v2 起为 6 张动态图形卡）— `label`（指标名）、`component`（组件类型：`water` 水位 / `segments` 分段格 / `money` 金额条 / `ring` 进度环 / `funnel` 迷你漏斗 / `multi` 多轨条）、`done`（已完成数值，组件分子）、`total`（目标数值，组件分母）、`unit`（单位）、`target`（目标值文案）、`current`（当前值文案）、`trend`（趋势）、`next`（下一步动作）、`status`（done/doing/next/blocked）；`multi` 组件另含 `sub[]` 子轨（元素为 `{ "label", "done", "total" }`，顶层 `done` / `total` 必须等于各子轨之和）。组件设计 rationale 与 done/total 口径表见 `docs/07_brand_and_interaction_upgrade.md` 第 6、7 节。

**2. `data/pipeline.json`**（数组）— `module`（业务线）、`pipGoal`（PIP 目标）、`progress`（进度描述）、`output`（本周产出）、`next`（下一步）、`owner`、`priority`（P0/P1）、`status`（Done/Doing/Next/Blocked）。

**3. `data/crm-summary.json`**（对象）— `updatedAt`、`total`（客户总数）、`byLevel[]`（`level`/`count` 分层）、`funnel[]`（`stage`/`count`/`rate` 相对上阶段转化率/`next` 该阶段下一步）、`note`。只放汇总统计，客户身份一律脱敏为占位编号。

**4. `data/design-delivery.json`**（数组）— `item`（交付物）、`category`（分类）、`status`（done/doing/next）、`note`。

**5. `data/task-progress.json`**（数组）— `id`、`task`、`status`（Done/Doing/Next/Blocked）、`progress`（0–100）、`owner`、`updatedAt`、`next`。

**6. `data/roadmap.json`**（数组，6 条主线）— `id`（WS01–WS06）、`name`（主线名）、`goal`（目标）、`progress`（0–100）、`status`（Done/Doing/Next/Blocked）、`owner`、`target`（当前阶段目标）。

**7. `data/gantt.json`**（任务条扁平数组）— `id`（G001…）、`workstream`（泳道名，与 6 条主线一致）、`task`、`start`/`end`（起止日期 `YYYY-MM-DD`）、`progress`（0–100）、`status`、`dependsOn`（前置任务条 id 数组，无前置为 `[]`）、`owner`（【v2 新增】负责人，悬浮详情展示）、`next`（【v2 新增】下一步动作，悬浮详情展示）。前端按 `workstream` 归泳道、按日期渲染到 W1 07/21 – W6 08/31 时间轴；鼠标悬浮任务条可查看负责人与下一步。

**8. `data/task-tree.json`**（树形数组）— 主任务节点：`id`、`title`、`owner`、`status`、`progress`（= 已完成子项数 / 子项总数）、`children[]`（子项为 `{ "title", "done" }`）。

**9. `data/todo.json`**（数组）— `task`、`owner`、`due`（截止日，过期未完成自动标红）、`priority`（P0 高亮/P1）、`status`（Done/Doing/Next/Blocked）。

**10. `data/milestones.json`**（数组）— `date`、`title`、`status`；Executive Summary 的「下一节点」取日期最近且未完成的里程碑。

更完整的字段约定与设计动机见 `docs/06_gantt_and_pipeline_structure.md` 第 6 节。

## 九、如何调整甘特图时间范围与进度百分比

### 调整时间范围

甘特图的时间轴完全由 `data/gantt.json` 驱动（任务条扁平数组，前端按起止日期渲染到 W1 07/21 – W6 08/31 六周刻度），无需改代码：

1. **移动某个任务条**：修改该任务的 `start` / `end` 日期（`YYYY-MM-DD`）；任务提前完成就把 `status` 改为 `Done`、`progress` 改为 `100`。
2. **延长 PIP 周期 / 改整体范围**：把时间轴外的新任务条直接写进数组并填好 `start` / `end` 日期即可，前端按全部任务条的日期范围自动铺周刻度；同时建议在 `milestones.json` 里同步调整「PIP阶段复盘」节点日期。
3. **新增任务条**：在数组中新增一个对象，填好 `id`（顺延 G 编号）/ `workstream`（6 条主线之一，决定归入哪条泳道）/ `task` / `start` / `end` / `status` / `progress`，有前置任务时在 `dependsOn` 填前置任务条 id（如 `["G002"]`，无前置填 `[]`）。

### 进度百分比口径（全站统一，禁止凭感觉填数）

- 个人注册 = 已注册人数 / 19；机构注册 = 已注册家数 / 6；交易收入 = 累计收入 / 26,000 USDT
- 设计交付包 = 已完成交付文件数 / 应交付文件总数（当前 8 项）
- Partner = 已确认合作家数 / 7；KOL = 已确认合作位数 / 10；销售对接 = 已完成对接次数 / 6
- Workstream 总进度 = 该主线全部任务进度按子项数加权平均（无子项：Done=100%、Next=0%、Doing 按子步骤估算、Blocked 按已完成部分计）
- 甘特任务条进度 = 已完成子项数 / 子项总数，与 `task-tree.json` 同名节点保持一致
- `kpi.json` 的 `done` / `total` 必须与上述口径一致，前端进度条直接渲染 `done / total`

## 十、每周更新建议（固定节奏）

1. **每周五**：按依赖顺序更新 `data/*.json`——`todo.json`（复盘本周）→ `task-progress.json` / `task-tree.json` → `kpi.json` → `roadmap.json` / `gantt.json` → `crm-summary.json` → `pipeline.json` → `milestones.json`（`design-delivery.json` 有变化时）→ 同步 `app.js` FALLBACK 并比对验证 → 本地 `python3 -m http.server 8080` 自查一遍（顺手检查两种主题显示）→ `git commit && git push`
2. **周五下班前**：私密部署完成后，把整页截图发给 Simon（私密链接不适合转发），附 3 行以内本周要点；部署前用本地预览截图代替
3. **每月底**：基于 `pipeline.json` 的 `output` / `next` / `Blocked` 项输出当月 **CRIB 复盘**，归档到 `docs/` 目录

## 十一、品牌资产替换（assets/brand/ 四件套）

品牌 Logo 为纯 SVG 原创四件套（设计基因见 `docs/07_brand_and_interaction_upgrade.md` 第 4 节），位于 `assets/brand/`：

| 文件 | 用途 |
| --- | --- |
| `assets/brand/icon.svg` | 方形图标（双焰符号），导航栏品牌位 |
| `assets/brand/logo-horizontal-light.svg` | 横版 Logo（日间浅色背景用） |
| `assets/brand/logo-horizontal-dark.svg` | 横版 Logo（夜间深色背景用） |
| `assets/brand/favicon.svg` | 浏览器标签页图标 |

替换方式：同名覆盖 `assets/brand/` 下对应文件即可，无需改代码。注意：

- **保持文件名与格式不变**（SVG）；若改用其他格式，需同步修改 `index.html` 中的引用路径。
- **favicon 引用位置**：`index.html` `<head>` 内的 `<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">`；更换 favicon 只替换文件，不动该行。
- 横版 Logo 的日间 / 夜间版本随主题自动切换，替换后两种主题各预览一遍（尤其深色背景下左焰深蓝 #232B67 的辨识度）。
- 四件套为纯 SVG 原创，禁止替换为带版权风险的素材。

## 十二、如何更新 KPI progress（kpi.json）

KPI 区为 6 张动态图形卡，全部字段由 `data/kpi.json` 驱动；改完必须同步 `app.js` FALLBACK（硬规则见第八节）：

1. 找到对应指标对象，更新 `done`（已完成数值）与 `total`（目标数值）——前端组件直接按 `done / total` 渲染；
2. 同步更新 `current` / `trend` / `next` 文案与 `status`（done/doing/next/blocked）；
3. `component` 字段决定渲染哪种动态组件，**正常情况下不要改**：

| `component` | 组件 | 对应 KPI | done/total 口径 |
| --- | --- | --- | --- |
| `water` | 水箱水位 | 个人注册 | 已注册人数 / 19 |
| `segments` | 6 分段格 | 机构注册 | 已注册家数 / 6 |
| `money` | 发光金额条 | 交易收入 | 累计收入 / 26,000 USDT |
| `ring` | 进度环 | 设计交付包 | 已完成文件数 / 8 |
| `funnel` | 迷你漏斗 | 客户 Pipeline | 已建表套数 / 1 |
| `multi` | 多轨条 | 渠道拓展 | 三线合计 / 23（sub：Partner/7、KOL/10、销售对接/6） |

4. 「渠道拓展」卡先改 `sub[]` 内对应子线的 `done`，再把顶层 `done` 同步为三线之和；
5. 各指标口径与组件设计 rationale 详见 `docs/07_brand_and_interaction_upgrade.md` 第 6、7 节。

## 十三、日间 / 夜间主题维护要点

- **CSS 变量位置**：两套主题的颜色变量集中在 `style.css` 顶部——`:root[data-theme="light"]`（日间，约第 10 行起）与 `:root[data-theme="dark"]`（夜间，约第 51 行起）。改配色只改变量值，不改组件样式；状态语义色（Done=绿 / Doing=蓝 / Next=黄 / Blocked=红 / Pending=灰）两主题必须保持一致。
- **防闪烁脚本**：`index.html` `<head>` 最前内联一段脚本，在 CSS 加载前执行 `document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light'`——**切勿删除或移到 CSS 引用之后**，否则夜间用户刷新会先闪一帧日间白屏。
- **主题切换交互**：右上角 Day/Night 按钮把选择写入 `localStorage`（键 `theme`，值 `light` / `dark`），`app.js` 负责切换与按钮高亮；新增组件样式时颜色一律引用 CSS 变量（如 `var(--bg-card)`），禁止写死色值，否则另一主题下会穿帮。
- 品牌色（左焰深蓝 #232B67 / 右焰亮蓝 #18A7E3 / 火花黄 #FFE000）同样走变量；调整品牌色时两套主题的变量同步修改。

## 十四、命名规则（统一 Simon）

- 页面、文档、数据、变量、文案中，汇报对象统一称 **Simon**；需要抽象代称时用 **Primary Reviewer / Supervisor / Stakeholder**。
- **禁止出现任何真实亲昵称呼及其拼音变体**（含历史文档、提交信息、占位符）。
- 可出现的同事名仅限：Sera / Simon / 静格 / Oscar / Kimi。
- 环境变量与示例中的占位一律用 `simon@example.com` / 用户名 `simon`。

## 十五、当前版本

- **v0.4（2026-07-21）**：品牌与交互升级——品牌 Logo 四件套（双焰基因，`assets/brand/`）；KPI 从 8 张静态卡收敛为 6 张动态图形卡（水位 / 分段格 / 金额条 / 进度环 / 迷你漏斗 / 多轨条，`kpi.json` 新增 `component` / `unit` / `sub` 字段）；甘特任务条新增 `owner` / `next` 悬浮详情；页面收敛（设计交付清单并入任务树、下周计划并入 Next Milestones）；页面与文档称谓统一为 Simon。设计说明见 `docs/07_brand_and_interaction_upgrade.md` 与 `docs/06` 第 8 节。
- **v0.3（2026-07-21）**：公网 GitHub Pages 下线、仓库转 PRIVATE；看板升级为 PIP 进度管理 Dashboard——新增 Executive Summary、甘特图（W1–W6、6 泳道）、依赖图、Main Tasks & Subtasks 任务树、Weekly To Do List（P0 高亮 / 过期标红 / 可搜索）、KPI 进度条、漏斗转化率与下一步列；新增 5 个数据 JSON；新增私密部署与安全文档（`docs/04-05`、`.env.example`、`SECURITY.md`）；README 重构为私密口径。详见 `docs/CHANGELOG.md`。
- **v0.2（2026-07-21）**：日间/夜间双主题（默认日间）、右上角 Day/Night 切换（localStorage 记忆）、新增 07 Live Task Progress 区块。当日曾部署 GitHub Pages 公网版，已于同日下线，仅保留为历史记录。
- **v0.1（2026-07-21）**：首个可用版本。看板框架、四大数据模块（KPI / Pipeline / 设计交付包 / CRM 漏斗）、深色战情室视觉均已就绪。
- 视觉参考：`assets/reference-dashboard.png`（深色工地运营 Dashboard，1750×3602）。
- 升级进度跟踪：见 `TASK_STATUS.md`。
