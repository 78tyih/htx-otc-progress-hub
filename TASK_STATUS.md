# TASK_STATUS — HTX OTC BD Progress Hub 升级任务状态

- **项目**：HTX OTC BD Progress Hub（仓库名 `htx-otc-progress-hub`）
- **用途**：给 Simon（Primary Reviewer）查看的 HTX OTC BD / PIP 工作进度看板
- **更新日期**：2026-07-21
- **当前轮次（v0.3）**：① 部署目标从公网 GitHub Pages 转为私密访问——仓库已转 PRIVATE、公网 Pages 已删除（旧链接 404），推荐方案 Cloudflare Pages + Cloudflare Access（仅放行 Simon 邮箱，邮箱 OTP / Google 登录，禁止前端 JS 假登录）；② 看板升级为 PIP 进度管理 Dashboard（Executive Summary / 甘特图 / 依赖图 / 任务树 / Weekly To Do）
- **历史轮次（v0.2，已完结）**：从「本地深色静态看板」升级为「日间/夜间双主题、带 Live Task Progress 的进度看板」；当日曾上线 GitHub Pages 公网版，已于同日下线（见 v0.3 阶段 10）

---

## [Progress] 阶段化状态日志

### 1. 检查项目结构 [Done]

- [Done] 已确认项目骨架完整：`index.html` / `style.css` / `app.js` / 4 个 `data/*.json` / `docs/01-03` 设计文档 / `assets/reference-dashboard.png` / `.nojekyll` / `README.md`，纯 HTML+CSS+JS、无框架无 CDN。
- [Files] 项目根目录全量（只读检查，未改动）。
- [Next] 进入主题升级开发。

### 2. 新增日间主题 [Done]

- [Done] 新增日间（light）主题并设为默认主题；原有深色（dark）战情室主题完整保留。日间 Hero 占位条已加入。状态语义不变：Done=绿 / Doing=蓝 / Next=灰 / Blocked=红。
- [Files] `style.css`、`index.html`。
- [Next] 接入主题切换交互。

### 3. 完成主题切换 [Done]

- [Done] 右上角新增 Day/Night 切换按钮；用户选择写入 `localStorage`，刷新后保持所选主题；首次访问默认日间 light。
- [Files] `index.html`、`app.js`、`style.css`。
- [Next] 开发 Live Task Progress 模块。

### 4. 新增任务进度模块 [Done]

- [Done] 新增区块 **07 Live Task Progress**，数据源为 `data/task-progress.json`；`app.js` 已同步加入对应 `FALLBACK` 离线兜底数据（与 JSON 逐字一致）。
- [Files] `index.html`、`app.js`、`data/task-progress.json`。
- [Next] 公网部署前的数据脱敏检查。

### 5. 数据脱敏检查 [Done]

- [Done] 全量扫描通过：公网版只含汇总数据与脱敏占位编号（Client-001 等），无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱电话等敏感信息。真实 CRM 明细保留在本地/私有文件夹，不进入仓库。
- [Files] `data/*.json`（5 个）、`index.html`、`app.js`、文档目录。
- [Next] 本地预览全量回归测试。

### 6. 本地预览测试 [Done]

- [Done] `python3 -m http.server 8080` 本地预览通过：日间/夜间主题切换正常、localStorage 记忆生效、5 个 JSON 正常 fetch 渲染、07 Live Task Progress 区块正常显示；双击 `index.html`（file:// 协议）离线兜底渲染正常。
- [Files] 全站（只读验证，未改动）。
- [Next] 执行 Git commit。

### 7. Git commit [Done]

- [Done] 已初始化仓库（`git init -b main`）并完成首个提交：commit `38ccd75`「Add light theme, theme switcher, live task progress and GitHub Pages-ready dashboard」（main 分支，16 个文件，2866 行新增）。
- [Files] 项目根目录全量、`TASK_STATUS.md`、`docs/CHANGELOG.md`、`README.md`。
- [Next] 推送远端并开启 GitHub Pages。

### 8. GitHub Pages 部署 [Done]

- [Done] 已推送 `main` 分支至 GitHub 仓库 `htx-otc-progress-hub`（https://github.com/78tyih/htx-otc-progress-hub ）；因当前免费计划私有仓库不支持 Pages（API 返回 422），仓库可见性已转为 public（内容已脱敏，预先授权），随后通过 API 启用 Pages（source = `main` / `/(root)`，HTTPS 强制开启）；仓库已内置 `.nojekyll`，纯静态原样托管。
- [Files] `.nojekyll`、全站静态文件。
- [Next] 验证 Pages 可访问，输出最终链接。

### 9. 输出最终访问链接 [Done]

- [Done] 已确认 `https://78tyih.github.io/htx-otc-progress-hub/` 可访问（启用后轮询，第 2 次检查返回 HTTP 200），并已更新 `README.md` 访问链接章节，链接可发给 Simon。
- [Files] `README.md`。
- [Next] 本轮升级收尾；进入每周五数据更新节奏（见 README「每周更新建议」）。

---

## v0.3（2026-07-21）私密化 + PIP 升级 — 阶段日志

### 10. 公网 Pages 下线 + 仓库转私有 [Done]

- [Done] 公网 GitHub Pages 已删除，旧链接 `https://78tyih.github.io/htx-otc-progress-hub/` 已 404；GitHub 仓库 `78tyih/htx-otc-progress-hub` 可见性已转为 **PRIVATE**。公网版本正式废弃，新目标为仅交付私密版本。
- [Files] GitHub 仓库设置 / Pages 设置（线上操作，无本地文件变更）。
- [Next] 输出私密部署方案与安全文档。

### 11. 私密部署方案与安全文档 [Done]

- [Done] 确定推荐方案 **Cloudflare Pages + Cloudflare Access**：Pages 托管静态站点，Access 在边缘网关做真实身份验证（邮箱 OTP 一次性验证码 / Google 登录），策略仅放行 Simon 邮箱；明确禁止前端 JS 假登录。新增操作清单 `docs/04_private_deployment.md`、访问控制说明 `docs/05_access_control.md`、环境变量模板 `.env.example`、安全规范 `SECURITY.md`。
- [Files] `docs/04_private_deployment.md`、`docs/05_access_control.md`、`.env.example`、`SECURITY.md`。
- [Next] 执行看板 PIP 升级开发。

### 12. PIP 甘特图 / 依赖图 / 任务树升级 [Done]

- [Done] 看板升级为 PIP 进度管理 Dashboard，页面变为 11 区块：新增 **02 Executive Summary**（总体进度 / 本周完成 / 阻塞数 / 下一节点）、**04 Trial Timeline Gantt Chart**（W1 07/21 – W6 08/31 六周、6 条业务主线泳道、任务条按状态着色）、**05 Workstream Dependency Map**（串行主链路 + 并行获客线 + 私密看板线）、**06 Main Tasks & Subtasks** 可展开任务树（原本周图表、Live Task Progress、Pipeline 看板、设计交付清单收编为子区）、**08 Weekly To Do List**（P0 高亮 / 过期标红 / 可搜索）；KPI 卡片新增 done/total 进度条；CRM 漏斗新增转化率与下一步两列。新增数据文件 `roadmap.json` / `gantt.json` / `task-tree.json` / `todo.json` / `milestones.json`；结构与字段设计见 `docs/06_gantt_and_pipeline_structure.md`。
- [Files] `index.html`、`style.css`、`app.js`、`data/kpi.json`、`data/crm-summary.json`、`data/roadmap.json`、`data/gantt.json`、`data/task-tree.json`、`data/todo.json`、`data/milestones.json`、`docs/06_gantt_and_pipeline_structure.md`、`README.md`。
- [Next] 数据脱敏终扫。

### 13. 数据脱敏确认 [Done]

- [Done] 全量扫描通过（含 5 个新 JSON 与全部新页面模块）：无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话（同事名 Sera / Simon / 静格 / Oscar / Kimi 除外）；客户均为脱敏占位编号 + 汇总统计。私密部署后脱敏规则不放松，规范见 `SECURITY.md`。
- [Files] `data/*.json`（10 个）、`index.html`、`app.js`、全部文档。
- [Next] git 提交并推送。

### 14. Git 提交推送 [Done]

- [Done] 本轮全部变更已提交并推送至 `main`：commit `16755d1`「Pivot to private deployment; add PIP gantt, dependency map, task tree, todo and security docs」（20 个文件，+2317/-232 行）；推送前完成进程清理、防御性脱敏扫描（通过）、10 个 JSON 合法性与 FALLBACK 逐字一致性校验（全部 MATCH）、本地冒烟 13 项资源全 200。仓库保持 PRIVATE，推送无公网暴露风险。
- [Files] 本轮全部变更文件（含 `.gitignore` 新增）。
- [Next] 进入 Cloudflare 私密部署。

### 15. Cloudflare 私密部署 [待执行]

- [待执行] **前置条件：需 Sera 提供 Cloudflare 账号**；随后按 `docs/04_private_deployment.md` 操作清单执行：Cloudflare Pages 接入仓库 → 配置 Access 应用与策略（仅放行 Simon 邮箱，OTP / Google 登录）→ 验证未登录访问被拦截、授权邮箱可正常进入。
- [Files] `docs/04_private_deployment.md`（操作清单）、`.env.example`（变量模板）。
- [Next] 部署完成后输出私密链接。

### 16. 发送私密链接给 Simon [待执行]

- [待执行] 私密部署验证通过后，将私密链接发给 Simon，并**单独告知用于验证的邮箱地址**（链接与邮箱分开发送，降低转发泄露风险）；同步更新 `README.md` 访问链接章节状态。
- [Files] `README.md`。
- [Next] 进入每周五数据更新节奏（见 README「每周更新建议」与 `docs/06` 第 7 节）。

---

---

## v0.4（2026-07-21）品牌升级 + 动态 KPI + 页面收敛中文化 — 阶段日志

### 17. 品牌升级（双焰 SVG 四件套）[Done]

- [Done] 接入 `assets/brand/` 四件套（logo-icon / logo-wordmark-light / logo-wordmark-dark / favicon，纯 SVG 原创）；顶栏升级为品牌锁标，字标随 `data-theme` 亮暗自动切换；`<head>` 接入 favicon；默认日间主题由 head 内联脚本在 CSS 加载前确定，无主题闪烁。
- [Files] `index.html`、`style.css`、`assets/brand/*.svg`（4 个）。
- [Next] Cloudflare 部署后在真实域名下复验 favicon 与字标。

### 18. 动态 KPI + 甘特 / 依赖图 / 拓扑区重构 [Done]

- [Done] KPI 由 8 张静态卡收敛为 6 张动态图形卡（segments / water / money / ring / funnel / multi，按 `kpi.json` 的 `component` 字段渲染）；新增主任务流玻璃拓扑区（7 节点 + 渐变贝塞尔主链）；甘特重构为玻璃胶囊条（9 条、W1–W6、悬浮详情含 owner/progress/next/依赖）；依赖图升级为三链 SVG 曲线（串行主链 / 并行获客汇聚 / 私密看板链）；执行摘要重排为 4 卡自动计算。
- [Files] `index.html`、`style.css`、`app.js`、`data/kpi.json`。
- [Next] 首单测试后按真实数据刷新 KPI。

### 19. 页面收敛中文化 + Simon 命名替换 [Done]

- [Done] 删除设计交付清单独立区块、本周柱状图子区；下周计划并入里程碑双栏；页面主文案中文化；汇报对象全站统一为 Simon / Primary Reviewer / Supervisor，占位邮箱统一 `simon@example.com`。
- [Files] `index.html`、`app.js`、`docs/07_brand_and_interaction_upgrade.md`。
- [Next] 无。

### 20. QA 独立验收 [Done（含 2 处最小修复）]

- [Done] QA 按 17 项清单独立复核：临时服务 17 项资源全 200 且无残留进程；真实浏览器（agent-browser + Chrome）实测 1280 / 768 / 560 / 390px 四档、主题切换、甘特悬浮、任务树展开、搜索筛选联动、过期标红（注入法验证）、console 零报错；FALLBACK 与 9 个 JSON 逐字一致；敏感信息扫描与原称呼/拼音终扫均为 0 命中。**发现并已最小修复 2 处**：① 390px 顶栏标题 nowrap 导致页面级横向溢出（scrollWidth 610>390）——`style.css` 仅改 `.title-block` 与 h1 两行规则，修复后四档复测无溢出；② 6.3 子区标题「Live Task Progress」英文残留——`index.html` 改为「实时任务进度」（两处），修复后回归通过。修复明细见 `本轮页面优化说明.md` 第 3 节与本次汇报。
- [Files] `本轮页面优化说明.md`（新建）、`style.css`（2 行规则级修复）、`index.html`（2 处文案修复）。
- [Next] git 提交本轮全部变更。

### 21. Git 提交 [进行中]

- [进行中] 待提交：v0.4 全部变更 + QA 修复 + 三份文档（优化说明 / 本日志 / CHANGELOG）。
- [Files] 见上各阶段。
- [Next] 提交后进入 Cloudflare 私密部署（阶段 15）。

---

---

## v0.5（2026-07-21）「做减法」结构收敛 — 阶段日志

### 22. 结构收敛开发 [Done]

- [Done] 页面收敛为「左侧目录导航 + 右侧 9 模块」两栏布局（scroll-spy 高亮、≤900px 汉堡抽屉）；删除日间主题与 Day/Night 切换，固定 `<html data-theme="dark">` 暗色单主题；甘特重构为 6 条主线可折叠（子任务默认折叠、W1–W6 周列、统一行高）；Pipeline 改 5 分组折叠看板（本周重点/进行中/阻塞默认展开，待开始/已完成默认折叠，卡片收敛为 任务名/所属主线/优先级/截止/下一步，搜索时强制展开）；主线任务进度 5 条线（subDone/subTotal/risk）；新增 09 周更记录模块（`data/weekly-log.json`）；依赖图支线 B 补「访问权限控制」节点（页面内容收敛→访问权限控制→Simon访问→每周更新）；删除 CRM 漏斗 / Live Task Progress / 任务树独立区块 / 里程碑独立区块 / Hero 拓扑区 / 私密部署宣传内容 / Kimi 任务内容；加载数据源 9→7（design-delivery / crm-summary / task-progress / task-tree 弃用，保留磁盘不加载）。详见 `本轮结构调整说明.md`。
- [Files] `index.html`、`style.css`、`app.js`、`data/weekly-log.json`（新增）、`data/gantt.json`、`data/roadmap.json`、`data/pipeline.json`、`本轮结构调整说明.md`（新建）。
- [Next] QA 独立终验。

### 23. sync_fallback.py 更新为 7 数据集 [Done]

- [Done] `.dev-scripts/sync_fallback.py` 从旧 9 数据集（含 design-delivery/crm-summary/task-progress/task-tree）改为 7 数据集（kpi/gantt/roadmap/pipeline/todo/milestones/weeklyLog ↔ 对应 JSON）；新增 `--check` 校验模式（只比对不写文件），ROOT 改为按脚本位置推导。运行校验模式一次：7 项 OK、`VERIFY: PASS`。
- [Files] `.dev-scripts/sync_fallback.py`。
- [Next] 并入 QA 终验项 2 复核。

### 24. QA 独立终验 [Done（零修复）]

- [Done] QA 按 12 项清单独立复核，全部 PASS、未发现 bug、未改动页面代码：① 临时 http.server（8123 端口，避开用户 8080 预览进程）15 项资源（index/css/js/7 JSON/4 品牌 SVG）全 200，用后 kill 并补杀残留子进程，确认 8123 完全释放、8080 未触碰；② 7 个 JSON `json.load` 合法，FALLBACK 块按同步脚本同路径再序列化后与 7 个 JSON 逐字一致；③ `node --check app.js` 通过；④ 全仓库（排除 .git）`原称呼|拼音` 0 命中，data/ 与 index/css/js 中无 Kimi（owner 仅 Sera/Simon/静格/Oscar，Kimi 仅残留于文档区同事名说明）；⑤ 无 light 主题 CSS / 切换按钮 / localStorage theme 残留，`data-theme="dark"` 在 `<html>` 上；⑥ 左侧目录 9 项与右侧 9 模块锚点一一对应，scroll-spy 逻辑存在且实测滚动至 09 时高亮 `#sec-weekly`；⑦ 甘特仅 6 条主线、子任务默认折叠（实测初始可见子任务区为 0）、点击展开/折叠实测正常、W1–W6 周列齐全；⑧ Pipeline 默认态实测 [开,开,开,关,关]，卡片字段符合收敛口径（另保留状态 badge 作分组内提示），搜索时强制展开、清空后恢复用户折叠态（实测通过）；⑨ 依赖图含「访问权限控制」节点且目标链路连通；⑩ 周更记录模块节奏标注/本周更新时间/本周重点动作齐全；⑪ 敏感信息扫描（真实客户姓名/UID/TG/银行/邮箱/电话，含点文件与 SVG 共 34 个文本文件）0 命中；⑫ 无头浏览器（agent-browser + Chrome）实测 1280 与 390 视口 `scrollWidth == innerWidth` 无横向溢出，移动端抽屉开合正常，console 零报错。
- [Files] 全站（只读验证，未改动）；本日志、`docs/CHANGELOG.md`、`README.md`、`本轮结构调整说明.md` 由 QA 同步更新。
- [Next] git 提交本轮全部变更。

### 25. Git 提交 [进行中]

- [进行中] 待提交：v0.5 结构收敛全部变更 + 四份文档（结构调整说明 / README / 本日志 / CHANGELOG）+ 7 数据集版 `sync_fallback.py`。
- [Files] 见上各阶段。
- [Next] 提交后进入 Cloudflare 私密部署（阶段 15，对应依赖图「访问权限控制」节点）。

---

> 状态图例：`[Done]` 已完成 / `[进行中]` 正在处理 / `[待执行]` 未开始。

---

## v0.6 阶段日志（2026-07-21）

- [Done] 绩效口径精修：页面改名「HTX OTC PIP 执行看板」+ 审核对象：Simon 徽标、侧栏 9 项状态点（含阻塞动态红点）、甘特四态胶囊条（进行=黄色渐变）、依赖图 +Partner/KOL 节点、阻塞双栏（blockers.json）、周更轻量化、KPI 第 4/5 卡对齐、主线卡 subLabel、Pipeline 卡两行收敛
- [Done] 数据层：kpi/gantt/roadmap/todo/weekly-log 对齐绩效表口径，新建 blockers.json，数据源 7→8
- [Done] 前端实测：Playwright 双视口 31 项全 PASS、console 零报错、FALLBACK 8/8 逐字一致
- [Next] git 提交推送（本阶段由主代理执行）
