# CHANGELOG — HTX OTC BD Progress Hub

本项目所有重要变更记录于此。格式约定：

- 版本号：`v主.次`（如 `v0.2`），重大重构升主版本，功能/数据更新升次版本。
- 每条记录含日期与变更分类：**新增 / 变更 / 修复 / 移除 / 安全**。
- 最新版本在最上方（Unreleased 模板除外，固定置于顶部备用）。

---

## [Unreleased] — 模板（发版时复制此段填写）

### 新增
- （新功能、新模块、新数据文件）

### 变更
- （既有功能/样式/数据结构的调整）

### 修复
- （bug 修复）

### 安全
- （脱敏、权限、依赖相关）

---

## [v0.5] — 2026-07-21

本轮主题为「**做减法**」：页面从多区块堆叠收敛为「左侧目录导航 + 右侧 9 模块」两栏结构，只保留与 PIP 绩效目标直接相关的内容；暗色单主题；加载数据源 9→7。完整说明见 `本轮结构调整说明.md`。

### 新增
- **09 周更记录模块**与 `data/weekly-log.json`：周更节奏标注（每周五）、本周更新时间（联动侧栏与页脚）、本周重点动作 chips、历史时间线（`logs[]`：`week/date/summary/done/next`）。
- 依赖关系图支线 B 补「**访问权限控制**」节点：链路为 看板结构整理 → 页面内容收敛 → 访问权限控制（Doing）→ Simon访问 → 每周更新，把私密部署的关键依赖压缩为图上一个状态化节点。
- `.dev-scripts/sync_fallback.py` 新增 `--check` 校验模式（只比对不写文件），并更新为 7 数据集版本（ROOT 改为按脚本位置推导）。

### 变更
- **布局**：改为左右两栏——左侧 240px 固定目录导航（scroll-spy 滚动高亮、底部周更时间），右侧主区排布 9 个模块，目录 9 项与模块锚点一一对应；≤900px 侧栏折叠为汉堡抽屉，点导航后自动收起。
- **主题**：删除日间（light）主题与右上角 Day/Night 切换按钮、`localStorage` 主题记忆逻辑，固定 `<html data-theme="dark">` 暗色单主题；`style.css` 收敛为单套暗色变量。
- **甘特图**：从 9 根扁平任务条重构为 6 条业务主线（L1–L6，`gantt.json` 改为「主线 + `children[]` 子任务」结构）；子任务默认折叠、点击主线名展开（`aria-expanded` 联动）；统一行高（主线 40px / 子任务 28px）与胶囊条尺寸；W1–W6 六周列。
- **工作 Pipeline**：改为 5 分组折叠看板——本周重点·P0 / 进行中 / 阻塞默认展开，待开始 / 已完成默认折叠；卡片字段收敛为 任务名 / 所属主线 / 优先级 / 截止（过期标红）/ 下一步（另保留状态 badge 作分组内提示）；顶栏搜索时强制展开全部分组，清空后恢复用户折叠态。
- **主线任务进度**：`roadmap.json` 收敛为 5 条 Workstream（WS01–WS05），卡片含 subDone/subTotal 关键子任务计数与 risk 风险字段（Blocked 红色强调）；执行摘要「总体进度」= 5 条线平均。
- **数据源收敛**：页面加载的 JSON 从 9 个收敛为 7 个（kpi / gantt / roadmap / pipeline / todo / milestones / weekly-log）；`app.js` FALLBACK 同步收敛为 7 键。
- **README 重构**：两栏布局与暗色单主题说明、7 个加载 JSON 字段表与弃用文件说明、每周五更新流程（改 JSON → `python3 .dev-scripts/sync_fallback.py` → 刷新预览 → git push），删除主题切换相关旧章节，校准品牌资产实际文件名。

### 移除
- 日间主题与 Day/Night 切换（含 head 防闪烁内联脚本、`localStorage` theme 键）。
- CRM 漏斗独立区块（信息已由 KPI 迷你漏斗卡与 pipeline 状态字段承载）。
- Live Task Progress 独立区块（与甘特子任务、Pipeline 卡片同源重复）。
- 任务树独立区块（层级与进度由甘特主线 children 表达）。
- 里程碑独立区块（降维为执行摘要「下一里程碑」卡，`milestones.json` 保留）。
- Hero 拓扑区（与 04 依赖关系图功能重叠）。
- 页面中的私密部署独立内容与 Kimi 任务内容（Kimi 仅为 AI 辅助执行方式，不作为汇报内容；data/ 与代码 owner 字段不含 Kimi）。
- `design-delivery.json` / `crm-summary.json` / `task-progress.json` / `task-tree.json` 不再被页面加载（弃用文件保留磁盘留档，无需维护）。

### 安全
- QA 独立终验 12 项全部 PASS、零修复：临时服务（8123 端口，避开用户 8080 预览进程）15 项资源全 200、进程无残留；7 个 JSON 合法且 FALLBACK 逐字一致；`node --check` 通过；全仓库（排除 .git）`原称呼|拼音` 0 命中；敏感信息扫描（客户姓名/UID/TG/银行/邮箱/电话，含点文件与 SVG 共 34 个文本文件）0 命中；无头浏览器实测 1280 / 390 视口无横向溢出、console 零报错。

---

## [v0.4] — 2026-07-21

本轮三大变更：① 品牌接入（双焰 SVG 四件套 + 默认日间防闪烁）；② 交互升级（主任务流玻璃拓扑区、6 张动态图形 KPI、玻璃胶囊甘特、轻 3D 曲线依赖图）；③ 页面收敛中文化（删重复区块、KPI 8→6 卡、Simon 命名全站统一）。

### 新增
- `assets/brand/` 品牌四件套（纯 SVG 原创）：`logo-icon.svg`、`logo-wordmark-light.svg`、`logo-wordmark-dark.svg`、`favicon.svg`；顶栏品牌锁标随 `data-theme` 亮暗自动切换。
- 「主任务流总览」玻璃拓扑区：7 节点 + 黄色渐变贝塞尔主链 + 次要线，替代原 Hero。
- 甘特悬浮详情层：状态·进度 / 负责人 / 起止 / 下一步 / 依赖。
- `docs/07_brand_and_interaction_upgrade.md`（设计动机与维护方式）、`本轮页面优化说明.md`（改动点 / 收敛逻辑 / 布局与组件设计逻辑）。

### 变更
- KPI 由 8 张静态卡收敛为 6 张动态图形卡：`kpi.json` 新增 `component` 字段（segments / water / money / ring / funnel / multi），`app.js` 按组件分发渲染，数字 count-up 先落终值后动画。
- 甘特重构为玻璃胶囊条：W1–W6 周列、9 根任务条按 42 天时间轴百分比定位，窄屏容器内横向滚动。
- 依赖图升级为三链 SVG 曲线：串行主链路（黄）/ 并行获客链（四线汇入客户池）/ 私密看板链（淡蓝）。
- 执行摘要重排为 4 卡（总体进度 / 本周完成 / 当前阻塞 / 下一里程碑），由 roadmap / todo / gantt / pipeline / milestones 自动计算。
- 页面结构由 11 区块收敛为 10 区块主文案中文化；「下周计划」并入 10「里程碑与下周计划」双栏。
- 汇报对象全站统一抽象化为 Simon / Primary Reviewer / Supervisor，占位邮箱统一 `simon@example.com`。
- 布局：12 栅格响应式（3→2→1 列）、clamp 流式字号、两线标题、卡片底部「下一步」对齐、间距整体收紧。

### 移除
- 「设计交付清单」独立区块（与任务树 T001 子任务、KPI 进度环信息同源重复）；`data/design-delivery.json` 不再被页面加载。
- 「本周进展柱状图」子区（被甘特图 + 执行摘要「本周完成」卡取代）。

### 修复
- 390px 视口顶栏标题（nowrap）导致页面级横向溢出（QA 实测 scrollWidth 610 > 390）：`.title-block` 补 `min-width: 0`，h1 补省略号截断；修复后 390 / 560 / 768 / 1280px 四档复测均无溢出。
- 6.3 子区标题「Live Task Progress」英文残留，改为「实时任务进度」（含 06 区块副标题引用）。

### 安全
- QA 独立终扫通过（排除 `.git`）：无真实客户姓名、HTX UID、TG 用户名 / t.me 路径、银行账户、邮箱、手机号（`simon@example.com` 与 `git@github.com` 为允许占位）；原称呼/拼音命名终扫 0 命中。
- QA 校验 FALLBACK 与 9 个被加载 JSON 逐字一致；临时服务 17 项资源全 200、进程无残留；浏览器 console 零报错。

---

## [v0.3] — 2026-07-21

本轮两大变更：① 部署目标从公网 GitHub Pages 转为**私密访问**（仅 Simon 本人，真实身份验证，禁止前端 JS 假登录）；② 看板升级为 **PIP 进度管理 Dashboard**。

### 新增
- 4 个新页面模块：**02 Executive Summary**（总体进度 / 本周完成 / 阻塞数 / 下一节点）、**04 Trial Timeline Gantt Chart**（W1 07/21 – W6 08/31 六周时间轴、6 条业务主线泳道、任务条按状态着色）、**05 Workstream Dependency Map**（串行主链路：设计交付包 → 提交设计团队 → 客户资料字段确认 → 客户唤醒 → 注册/KYC → 首单 → CRIB 复盘；并行获客：大数据名单 / 销售转介 / Partner / KOL → 客户池；私密看板链）、**08 Weekly To Do List**（P0 高亮、过期标红、可搜索）。
- **06 Main Tasks & Subtasks** 可展开任务树区块（原本周进展柱状图、Live Task Progress、Pipeline 四列看板、设计交付清单收编为其子区）。
- 5 个新数据 JSON：`roadmap.json`（6 条 Workstream 主线）、`gantt.json`（甘特任务条）、`task-tree.json`（任务树）、`todo.json`（周待办）、`milestones.json`（里程碑 / 下一节点）。
- 私密部署与安全文档：`docs/04_private_deployment.md`（Cloudflare Pages + Access 操作清单）、`docs/05_access_control.md`（访问控制说明）、`.env.example`（环境变量模板，不含真实值）、`SECURITY.md`（安全与脱敏规范）、`docs/06_gantt_and_pipeline_structure.md`（甘特图与 Pipeline 结构设计及每周更新口径）。

### 变更
- `kpi.json` 每个指标新增 `done` / `total` 数值字段，KPI 卡片渲染 done/total 进度条。
- `crm-summary.json` 漏斗每阶段新增 `rate`（相对上一阶段转化率）与 `next`（下一步动作）两列。
- 页面结构由 8 区块扩展为 11 区块（01 顶导航 / 02 Executive Summary / 03 PIP KPI / 04 甘特图 / 05 依赖图 / 06 Main Tasks & Subtasks / 07 CRM 漏斗 / 08 Weekly To Do / 09 阻塞事项 / 10 下周计划 / 11 页脚）。
- `README.md` 重构为私密口径：移除公网 Pages 地址与「公共部署」表述；访问链接章节改为「私密部署后更新（仅授权邮箱可访问）」；数据章节扩为 10 个 JSON 的字段说明与更新频率；新增「如何调整甘特图时间范围与进度百分比」；目录结构补全（新 JSON、docs/04-06、`.env.example`、`SECURITY.md`）。
- 状态色语义统一：Done=绿 / Doing=蓝 / Next=黄（甘特与进度条）/ Blocked=红。

### 移除
- 公网 GitHub Pages 站点已删除，旧链接 `https://78tyih.github.io/htx-otc-progress-hub/` 已 404；README 中公网访问链接与公共部署说明同步移除。

### 安全
- GitHub 仓库 `78tyih/htx-otc-progress-hub` 可见性已转为 **PRIVATE**。
- 私密部署方案确定：**Cloudflare Pages + Cloudflare Access**，Access 策略仅放行 Simon 邮箱，支持邮箱 OTP 一次性验证码 / Google 登录，身份验证在边缘网关完成（非前端 JS 假登录）。
- 数据脱敏终扫通过（含 5 个新 JSON 与全部新模块）：无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话（同事名 Sera / Simon / 静格 / Oscar / Kimi 除外）。

### 提交结果
- 本轮变更已提交并推送至 `main`：commit `16755d1`（20 个文件，+2317/-232 行），推送时间 2026-07-21 05:45（本地）。

### 待办（下一版本）
- ~~Git 提交推送~~（已完成，见上）。
- Cloudflare 私密部署：需 Sera 提供 Cloudflare 账号，按 `docs/04_private_deployment.md` 操作清单执行。
- 部署验证通过后，将私密链接发给 Simon 并单独告知验证邮箱。

---

## [v0.2] — 2026-07-21

本轮升级：从「本地深色静态看板」升级为「可部署 GitHub Pages、日间/夜间双主题、带 Live Task Progress 的进度看板」。

### 新增
- 日间（light）主题，并设为默认主题；原深色（dark）战情室主题完整保留。
- 右上角 Day/Night 主题切换按钮，用户选择写入 `localStorage`，刷新后保持。
- 区块 **07 Live Task Progress**，数据源 `data/task-progress.json`，实时展示任务进度。
- 日间 Hero 占位条。
- `TASK_STATUS.md`（本轮升级阶段化状态日志）、`docs/CHANGELOG.md`（本文件）。

### 变更
- `app.js` 新增 `task-progress.json` 的加载与对应 `FALLBACK` 离线兜底数据（与 JSON 逐字一致）。
- `README.md` 更新：本地预览、主题切换、5 个数据 JSON 字段说明、公网部署脱敏警示、每周更新建议。
- 数据文件统一为公网安全口径：仅汇总数据与脱敏占位编号（Client-001 等）。

### 安全
- 数据脱敏扫描通过：公网版无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱电话等敏感信息；真实 CRM 明细保留本地/私有文件夹，不进入仓库。

### 待办（下一版本）
- Git commit 与 GitHub Pages 部署（仓库 `htx-otc-progress-hub`），部署后回填 README 访问链接。

### 部署结果（2026-07-21 回填）
- 已完成部署：commit `38ccd75` 起推送至仓库 https://github.com/78tyih/htx-otc-progress-hub （可见性 public——因当前计划私有仓库不支持 Pages，经预先授权转为公开，内容已脱敏）；GitHub Pages 已启用（`main` / `/(root)`）并验证可访问（HTTP 200）：https://78tyih.github.io/htx-otc-progress-hub/

> ⚠️ **历史记录说明**：上述 GitHub Pages 公网部署已于同日（2026-07-21）下线，仓库已转为 PRIVATE，旧链接已 404（见 v0.3）。本节内容仅保留为历史记录，所述公网地址与 public 可见性均已失效，请勿再使用或转发。

---

## [v0.1] — 2026-07-21

首个可用版本。

### 新增
- 深色「业务战情室」Dashboard：背景 `#111`、卡片 `#1f1f1f`/`#252525`、高亮黄 `#ffe000`、HTX 蓝 `#0066ff`。
- 状态语义统一：Done=绿 / Doing=蓝 / Next=灰 / Blocked=红。
- 8 个看板区块（KPI 总览、状态分布图、Pipeline 看板、TG 存量客户 CRM 漏斗、设计交付包、阻塞事项等）。
- 4 个数据 JSON：`kpi.json` / `pipeline.json` / `design-delivery.json` / `crm-summary.json`，数据与代码完全分离。
- 搜索 + 状态筛选联动；Export 导出 pipeline JSON。
- 离线兜底：`file://` 协议直接双击打开时，自动使用 `app.js` 内置 FALLBACK 示例数据渲染。
- `.nojekyll`：兼容 GitHub Pages 纯静态托管。
- 文档：`docs/01_reference_breakdown.md`、`docs/02_project_brief.md`、`docs/03_design_spec.md`、`README.md`。
