# HTX OTC BD Progress Hub

> 给 Simon（Primary Reviewer）查看的 HTX OTC BD / PIP 工作进度看板（**私密版本**）

## 一、项目说明

这是一个**纯前端的 PIP 进度管理 Dashboard**，用于展示 Sera 围绕 PIP 目标推进的 HTX OTC BD 工作进度。v0.5 起页面收敛为「**左侧目录导航 + 右侧 9 个模块**」的两栏结构，只保留与绩效目标直接相关的内容：

- **01 执行摘要**：总体进度、本周完成、阻塞数、下一里程碑（由 roadmap / todo / pipeline / milestones 自动计算）
- **02 KPI 概览**：PIP 六大绩效目标动态图形卡（水位 / 分段格 / 金额条 / 进度环 / 迷你漏斗 / 多轨条）
- **03 时间推进图**：W1 07/21 – W6 08/31 六周时间轴，6 条业务主线，点击主线展开子任务，悬浮查看详情
- **04 依赖关系图**：主链路（绩效交付）+ 三支线（获客线索 / 看板交付与访问 / 设计物料），含「访问权限控制」节点
- **05 主线任务进度**：5 条 Workstream 主线卡（进度 / 关键子任务 subDone/subTotal / 风险 / 下一步）
- **06 工作 Pipeline**：5 分组折叠看板（本周重点·4星 / 进行中 / 阻塞默认展开；待开始 / 已完成默认折叠），卡片仅含任务名 / 所属主线 / 星级优先级（右下角）/ 截止（右上角）/ 下一步
- **07 本周待办**：星级排序（高星优先）、过期标红、搜索联动
- **08 阻塞事项**：自动汇总 Blocked 项 + 需要 Supervisor 协助的 5 件事
- **09 周更记录**：每周更新一次（每周五），本周重点动作 + 历史时间线

技术特点：

- **纯 HTML / CSS / JS**，无构建工具、无后端、无依赖安装
- 数据与代码完全分离：业务数据放在 `data/*.json`，改数据不用改代码
- **固定暗色主题**（`<html data-theme="dark">`，暗色战情室风格）；v0.5 起删除日间主题与切换按钮，状态语义统一：Done=绿、Doing=蓝、Next=黄、Blocked=红
- 内置离线数据兜底：直接双击打开（`file://` 协议下无法 fetch JSON）时，页面用内置 FALLBACK 数据正常渲染
- 左侧目录 scroll-spy 滚动高亮；≤900px 侧栏折叠为汉堡抽屉

结构调整的完整说明见 `本轮结构调整说明.md`。

## 二、目录结构

```
htx-otc-progress-hub/
├── index.html                  # 主页面（两栏布局：左侧目录 + 右侧 9 模块）
├── style.css                   # 全局样式（固定暗色单主题、色板、组件）
├── app.js                      # 前端逻辑（加载 8 个 JSON → 渲染 9 模块，含离线兜底 FALLBACK）
├── data/                       # 业务数据（改这里即可更新看板，无需改代码）
│   ├── kpi.json                # 【加载】核心 KPI（component 组件类型 / done / total / 目标 / 趋势）
│   ├── gantt.json              # 【加载】甘特 6 条主线（含 children 子任务 / owner / next）
│   ├── roadmap.json            # 【加载】5 条 Workstream 主线（目标 / 进度 / subDone/subTotal / risk）
│   ├── pipeline.json           # 【加载】Pipeline（PIP 目标 / 进度 / 产出 / 下一步）
│   ├── todo.json               # 【加载】本周待办（星级 / 截止日 / 状态）
│   ├── milestones.json         # 【加载】里程碑与下一节点
│   ├── weekly-log.json         # 【加载】周更记录（cadence / updatedAt / done）—— v0.6 轻量化
│   ├── blockers.json           # 【加载】阻塞事项双栏（current / asks）—— v0.6 新增
│   ├── design-delivery.json    # 【弃用·保留磁盘】设计交付包清单（模块已删，不再加载）
│   ├── crm-summary.json        # 【弃用·保留磁盘】TG 客户 CRM 汇总（漏斗区块已删，不再加载）
│   ├── task-progress.json      # 【弃用·保留磁盘】Live Task Progress（区块已删，不再加载）
│   └── task-tree.json          # 【弃用·保留磁盘】任务树（区块已删，不再加载）
├── .dev-scripts/
│   └── sync_fallback.py        # FALLBACK 同步与校验脚本（8 数据集版本，见第八节硬规则）
├── docs/                       # 设计说明、部署清单、复盘文档等
│   ├── 01_reference_breakdown.md
│   ├── 02_project_brief.md
│   ├── 03_design_spec.md
│   ├── 04_private_deployment.md # Cloudflare Pages + Access 私密部署操作清单
│   ├── 05_access_control.md     # 访问控制与身份验证说明（邮箱 OTP / Google 登录）
│   ├── 06_gantt_and_pipeline_structure.md # 甘特图与 Pipeline 结构设计
│   ├── 07_brand_and_interaction_upgrade.md # 品牌与交互升级说明（动态 KPI / Logo / 命名规范）
│   └── CHANGELOG.md            # 版本变更记录
├── assets/
│   ├── brand/                  # 品牌四件套（纯 SVG 原创）
│   │   ├── logo-icon.svg           # 方形图标（双焰符号）
│   │   ├── logo-wordmark-dark.svg  # 横版字标（暗色背景用，当前侧栏使用）
│   │   ├── logo-wordmark-light.svg # 横版字标（浅色背景用，备用）
│   │   └── favicon.svg             # 浏览器标签页图标
│   └── reference-dashboard.png # 视觉参考图（深色工地运营 Dashboard）
├── 本轮结构调整说明.md          # v0.5 结构调整说明（删减逻辑 / 重构逻辑 / 周更机制）
├── 本轮页面优化说明.md          # v0.4 优化说明
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

> 若 8080 端口被占用（例如已有别的预览服务在跑），换一个端口即可，如 `python3 -m http.server 8081`，访问对应端口。

### 方式二：直接双击 index.html（最快）

直接双击 `index.html` 用浏览器打开即可。由于浏览器安全限制，`file://` 协议下无法读取本地 JSON 文件，页面会自动切换到**内置离线兜底数据**（FALLBACK）渲染，不影响浏览版式与交互。适合快速预览。

## 四、主题说明（固定暗色）

- v0.5 起为**暗色单主题**：页面固定 `<html data-theme="dark">`，仅保留暗色战情室一套配色（CSS 变量集中在 `style.css` 顶部 `:root`）。
- 原日间（light）主题、右上角 Day/Night 切换按钮与 `localStorage` 主题记忆逻辑已全部移除；新增组件样式时颜色一律引用 CSS 变量（如 `var(--bg-card)`），禁止写死色值。
- 状态语义色保持不变：Done=绿 / Doing=蓝 / Next=黄 / Blocked=红。

## 五、访问链接

- **私密部署后更新（仅授权邮箱可访问）**：Cloudflare Pages + Access 部署完成后，将把私密链接单独发给 Simon，验证邮箱另行告知，不写入本文档。
- 仓库地址：https://github.com/78tyih/htx-otc-progress-hub （**PRIVATE**，仅授权成员可见）
- ⚠️ 原公网 GitHub Pages 地址已**永久下线**（旧链接返回 404），请勿再使用或转发。

## 六、私密部署（Cloudflare Pages + Access）

- **部署目标**：私密访问（仅 Simon 本人）。任何访客必须通过真实身份验证（邮箱 OTP 一次性验证码 / Google 登录）才能打开页面；**禁止前端 JS 假登录**（纯前端校验可被绕过，不算数）。
- **当前状态**：GitHub 仓库已转为 **PRIVATE**；公网 GitHub Pages 已删除（旧链接已 404）；私密部署方案与安全文档已就绪；看板页面结构已收敛完毕，访问方式确认为当前推进节点（见看板 04 依赖关系图「访问权限控制」节点）。
- **推荐方案**：**Cloudflare Pages + Cloudflare Access**——Pages 托管静态站点，Access 在边缘网关做身份验证，策略仅放行 Simon 的邮箱；访问者输入邮箱收取 OTP 验证码，或直接用 Google 账号登录，验证通过后方可访问。
- **待执行**：待 Sera 提供 Cloudflare 账号后，按 `docs/04_private_deployment.md` 操作清单执行；访问控制细节见 `docs/05_access_control.md`；环境变量模板见 `.env.example`；安全规范见 `SECURITY.md`。
- **部署完成后**：将私密链接发给 Simon，并单独告知用于验证的邮箱地址。

## 七、⚠️ 数据脱敏警示（公网 / 私网均适用，务必阅读）

> **即使已转为私密部署，脱敏规则不放松**：私密仓库同样可能被截图、转发或误开权限，敏感信息一律不入库、不入页。

- ❌ **不要上传真实 CRM 明细或客户身份信息**：包括真实客户姓名、HTX UID、TG 用户名 / 群组路径、银行账户、邮箱、电话等。
- ✅ **只放汇总数据和脱敏编号**：客户一律使用占位编号（如 `Client-001`、`Client-002`），数字只放汇总统计。
- 👤 **同事名例外**：Sera / Simon / 静格 / Oscar 可在页面与数据中出现（Kimi 仅为 AI 辅助执行方式，不出现在页面与数据的 owner / 责任人字段中）。
- 🔒 **真实 CRM 表留本地或私有文件夹**（如本地加密目录 / 公司私有云盘），每周从中统计汇总数据后再更新到本仓库。
- 当前仓库内所有数据均为脱敏占位数据，已通过脱敏扫描；后续每次提交前请自查一遍 `data/*.json`，规范详见 `SECURITY.md`。

## 八、如何更新 data/*.json

页面加载 **8 个** JSON 文件，与前端渲染一一对应，**改完 JSON 无需改任何代码，刷新页面即生效**。另有 4 个弃用文件（`design-delivery.json` / `crm-summary.json` / `task-progress.json` / `task-tree.json`）保留在 `data/` 目录作留档，**不再被页面加载、无需维护**。

> ⚠️ 硬规则：`app.js` 内置的 FALLBACK 离线兜底数据（键名：`kpi` / `gantt` / `roadmap` / `pipeline` / `todo` / `milestones` / `weeklyLog` / `blockers`）与 8 个被加载的 `data/*.json` 保持**逐字一致**。FALLBACK 由脚本维护、禁止手改：修改任何 JSON 后，运行 `python3 .dev-scripts/sync_fallback.py` 同步并看到 `VERIFY: PASS`；提交前可用 `python3 .dev-scripts/sync_fallback.py --check` 只校验不写文件，不一致不允许提交。

| 文件 | 用途 | 更新频率 |
| --- | --- | --- |
| `kpi.json` | 02 KPI 概览（6 张动态图形卡，component 驱动） | 每周五 |
| `gantt.json` | 03 时间推进图（6 主线 + 子任务，owner / next 悬浮详情） | 每周五 |
| `roadmap.json` | 01 执行摘要、05 主线任务进度 | 每周五 |
| `pipeline.json` | 06 工作 Pipeline、08 阻塞事项、导出 JSON | 每周五 |
| `todo.json` | 01 执行摘要、07 本周待办 | 每周五（平时可随时增补） |
| `milestones.json` | 01 执行摘要「下一里程碑」 | 里程碑达成 / 新增时 |
| `weekly-log.json` | 09 周更记录（本周更新要点 / 节奏标注 / 最近更新时间） | 每周五 |
| `blockers.json` | 08 阻塞事项与需要协助（当前阻塞 / 需 Simon 协助双栏） | 每周五 |

### 字段说明

**1. `data/kpi.json`**（数组，6 张动态图形卡）— `label`（指标名）、`component`（组件类型：`water` 水位 / `segments` 分段格 / `money` 金额条 / `ring` 进度环 / `funnel` 迷你漏斗 / `multi` 多轨条）、`done`（已完成数值，组件分子）、`total`（目标数值，组件分母）、`unit`（单位）、`target`（目标值文案）、`current`（当前值文案）、`trend`（趋势）、`next`（下一步动作）、`status`（done/doing/next/blocked）；`multi` 组件另含 `sub[]` 子轨（元素为 `{ "label", "done", "total" }`，顶层 `done` / `total` 必须等于各子轨之和）。组件设计 rationale 与 done/total 口径表见 `docs/07_brand_and_interaction_upgrade.md` 第 6、7 节。

**2. `data/gantt.json`**（数组，6 条主线）— `id`（L1–L6）、`name`（主线名）、`owner`、`status`（Done/Doing/Next/Blocked）、`progress`（0–100）、`start`/`end`（起止日期 `YYYY-MM-DD`）、`next`（下一步，悬浮详情展示）、`children[]`（子任务：`{ "task", "start", "end", "status", "progress" }`，默认折叠，点击主线展开）。

**3. `data/roadmap.json`**（数组，5 条主线 WS01–WS05）— `id`、`name`（主线名）、`goal`（目标）、`progress`（0–100）、`status`、`owner`、`subDone` / `subTotal`（关键子任务完成数 / 总数）、`next`（下一步）、`risk`（风险描述，无风险填 `"无"`）。

**4. `data/pipeline.json`**（数组）— `module`（业务线）、`pipGoal`（PIP 目标）、`progress`（进度描述）、`output`（本周产出）、`next`（下一步）、`owner`、`priority`（1–4 星：4=重要且紧急 / 3=重要不紧急 / 2=紧急不重要 / 1=不重要不紧急）、`status`（Done/Doing/Next/Blocked）、`workstream`（所属主线）、`due`（截止日）。卡片仅展示 任务名 / 所属主线 / 优先级 / 截止 / 下一步，其余字段供阻塞区与导出使用。

**5. `data/todo.json`**（数组）— `task`、`owner`、`due`（截止日，过期未完成自动标红）、`priority`（1–4 星，高星优先排序）、`status`。

**6. `data/milestones.json`**（数组）— `date`、`title`、`status`；执行摘要「下一里程碑」取日期最近且未完成的里程碑。

**7. `data/weekly-log.json`**（对象，v0.6 轻量化）— `cadence`（节奏标注「本看板每周更新一次」）、`updatedAt`（最近更新时间，联动侧栏与页脚）、`done[]`（本周更新要点，4-6 条）。

**8. `data/blockers.json`**（对象，v0.6 新增）— `updatedAt`、`current[]`（当前阻塞，左栏红色调）、`asks[]`（需要 Simon 协助，右栏黄色调）。

## 九、如何调整甘特图时间范围与进度百分比

### 调整时间范围

甘特图时间轴固定为 2026-07-21 ～ 2026-08-31（42 天 / W1–W6 六周列，由 `app.js` 中 `GANTT_START` / `GANTT_DAYS` / `GANTT_WEEKS` 定义），任务条按起止日期百分比定位、越界自动截断：

1. **移动某条主线 / 子任务**：修改 `gantt.json` 中对应条目的 `start` / `end`；完成就把 `status` 改为 `Done`、`progress` 改为 `100`。
2. **新增子任务**：在对应主线的 `children[]` 中追加 `{ "task", "start", "end", "status", "progress" }`，默认折叠展示。
3. **延长 PIP 周期 / 改整体范围**：改 `gantt.json` 日期的同时需同步调整 `app.js` 的 `GANTT_START` / `GANTT_DAYS` / `GANTT_WEEKS` 常量，并在 `milestones.json` 里同步调整「PIP阶段复盘」节点日期。

### 进度百分比口径（全站统一，禁止凭感觉填数）

- 个人注册 = 已注册人数 / 19；机构注册 = 已注册家数 / 6；交易收入 = 累计收入 / 26,000 USDT
- 设计交付包 = 已完成交付文件数 / 应交付文件总数（当前 8 项）
- Partner = 已确认合作家数 / 7；KOL = 已确认合作位数 / 10；销售对接 = 已完成对接次数 / 6
- 甘特主线 / roadmap 主线进度 = 该主线全部子任务进度按子项数加权平均（无子项：Done=100%、Next=0%、Doing 按子步骤估算、Blocked 按已完成部分计）
- `roadmap.json` 的 `subDone` / `subTotal` 必须与主线实际子任务计数一致
- `kpi.json` 的 `done` / `total` 必须与上述口径一致，前端组件直接渲染 `done / total`

## 十、每周更新流程（每周五固定节奏）

1. **改 JSON**：先改 `data/weekly-log.json`（`updatedAt` 改当周日期、`done[]` 整体替换为本周更新要点）与 `data/blockers.json`（双栏按实际刷新），再按实际进展更新 `todo.json` → `pipeline.json` → `gantt.json` → `roadmap.json` → `kpi.json`（`milestones.json` 有变化时）。
2. **同步 FALLBACK**：运行 `python3 .dev-scripts/sync_fallback.py`，看到 7 项 `OK` + `VERIFY: PASS` 才算完成（禁止手改 `app.js` 中的 FALLBACK）。
3. **刷新预览**：本地 `python3 -m http.server 8080` 刷新页面自查一遍（甘特展开 / Pipeline 折叠 / 搜索联动 / 周更记录显示正常）。
4. **提交**：`git commit && git push`。
5. **周五下班前**：私密部署完成后，把整页截图发给 Simon（私密链接不适合转发），附 3 行以内本周要点；部署前用本地预览截图代替。
6. **每月底**：基于 `pipeline.json` 的 `output` / `next` / `Blocked` 项输出当月 **CRIB 复盘**，归档到 `docs/` 目录。

## 十一、品牌资产替换（assets/brand/ 四件套）

品牌 Logo 为纯 SVG 原创四件套（设计基因见 `docs/07_brand_and_interaction_upgrade.md` 第 4 节），位于 `assets/brand/`：

| 文件 | 用途 |
| --- | --- |
| `assets/brand/logo-icon.svg` | 方形图标（双焰符号） |
| `assets/brand/logo-wordmark-dark.svg` | 横版字标（暗色背景用，当前左侧栏品牌位使用） |
| `assets/brand/logo-wordmark-light.svg` | 横版字标（浅色背景用，备用） |
| `assets/brand/favicon.svg` | 浏览器标签页图标 |

替换方式：同名覆盖 `assets/brand/` 下对应文件即可，无需改代码。注意：

- **保持文件名与格式不变**（SVG）；若改用其他格式，需同步修改 `index.html` 中的引用路径。
- **favicon 引用位置**：`index.html` `<head>` 内的 `<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">`；更换 favicon 只替换文件，不动该行。
- 四件套为纯 SVG 原创，禁止替换为带版权风险的素材。

## 十二、如何更新 KPI progress（kpi.json）

KPI 区为 6 张动态图形卡，全部字段由 `data/kpi.json` 驱动；改完必须运行 `sync_fallback.py` 同步 FALLBACK（硬规则见第八节）：

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

## 十三、命名规则（统一 Simon）

- 页面、文档、数据、变量、文案中，汇报对象统一称 **Simon**；需要抽象代称时用 **Primary Reviewer / Supervisor / Stakeholder**。
- **禁止出现任何真实亲昵称呼及其拼音变体**（含历史文档、提交信息、占位符）。
- 可出现的同事名仅限：Sera / Simon / 静格 / Oscar（Kimi 仅为 AI 辅助执行方式，不作为页面与数据中的 owner / 责任人）。
- 环境变量与示例中的占位一律用 `simon@example.com` / 用户名 `simon`。

## 十四、当前版本

- **v0.5（2026-07-21）**：「做减法」结构收敛——左右两栏布局（左侧目录导航 scroll-spy + 右侧 9 模块）；暗色单主题（删除日间主题与切换）；甘特重构为 6 主线可折叠（子任务默认折叠、W1–W6）；Pipeline 改 5 分组折叠看板（卡片字段收敛为 5 项）；主线任务进度 5 条线（subDone/subTotal/risk）；新增 09 周更记录模块（`weekly-log.json`）；依赖图补「访问权限控制」节点；删除 CRM 漏斗 / Live Task Progress / 任务树独立区块 / 里程碑独立区块 / Hero 拓扑区 / 私密部署宣传内容 / Kimi 任务内容；加载数据源 9→7（4 个弃用文件保留磁盘）。详见 `本轮结构调整说明.md`。
- **v0.6（2026-07-21）**：绩效口径精修——页面改名「HTX OTC PIP 执行看板」（副标题 Sera · OTC USD 大宗业务绩效任务进展 + 审核对象：Simon 徽标）；侧栏 9 项目录加状态点（阻塞项动态红/绿）；甘特胶囊条四态重定义（完成绿 / 进行黄色渐变 / 待启动灰半透明 / 阻塞红边条）；依赖图支线 A 增加 Partner/KOL 第四来源节点；阻塞事项改双栏（`blockers.json` 驱动：当前阻塞 / 需 Simon 协助）；周更记录轻量化（`weekly-log.json` 重构为 done 要点）；KPI 第 4/5 卡对齐绩效表（客户资料·手册 / 客户 Pipeline）；主线进度卡渲染 subLabel；Pipeline 卡片两行收敛；加载数据源 7→8。See `git log`。
- **v0.4（2026-07-21）**：品牌与交互升级——品牌 Logo 四件套（双焰基因，`assets/brand/`）；KPI 从 8 张静态卡收敛为 6 张动态图形卡（水位 / 分段格 / 金额条 / 进度环 / 迷你漏斗 / 多轨条，`kpi.json` 新增 `component` / `unit` / `sub` 字段）；甘特任务条新增 `owner` / `next` 悬浮详情；页面收敛（设计交付清单并入任务树、下周计划并入 Next Milestones）；页面与文档称谓统一为 Simon。设计说明见 `docs/07_brand_and_interaction_upgrade.md` 与 `docs/06` 第 8 节。
- **v0.3（2026-07-21）**：公网 GitHub Pages 下线、仓库转 PRIVATE；看板升级为 PIP 进度管理 Dashboard——新增 Executive Summary、甘特图（W1–W6、6 泳道）、依赖图、Main Tasks & Subtasks 任务树、Weekly To Do List（P0 高亮 / 过期标红 / 可搜索）、KPI 进度条、漏斗转化率与下一步列；新增 5 个数据 JSON；新增私密部署与安全文档（`docs/04-05`、`.env.example`、`SECURITY.md`）；README 重构为私密口径。详见 `docs/CHANGELOG.md`。
- **v0.2（2026-07-21）**：日间/夜间双主题（默认日间）、右上角 Day/Night 切换（localStorage 记忆）、新增 07 Live Task Progress 区块。当日曾部署 GitHub Pages 公网版，已于同日下线，仅保留为历史记录。（双主题与 Live Task Progress 区块均已于 v0.5 移除。）
- **v0.1（2026-07-21）**：首个可用版本。看板框架、四大数据模块（KPI / Pipeline / 设计交付包 / CRM 漏斗）、深色战情室视觉均已就绪。
- 视觉参考：`assets/reference-dashboard.png`（深色工地运营 Dashboard，1750×3602）。
- 升级进度跟踪：见 `TASK_STATUS.md`。
