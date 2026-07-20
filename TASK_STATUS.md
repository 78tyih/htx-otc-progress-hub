# TASK_STATUS — HTX OTC BD Progress Hub 升级任务状态

- **项目**：HTX OTC BD Progress Hub（仓库名 `htx-otc-progress-hub`）
- **用途**：给思源哥（Siyuan.C）查看的 HTX OTC BD / PIP 工作进度看板
- **更新日期**：2026-07-21
- **当前轮次（v0.3）**：① 部署目标从公网 GitHub Pages 转为私密访问——仓库已转 PRIVATE、公网 Pages 已删除（旧链接 404），推荐方案 Cloudflare Pages + Cloudflare Access（仅放行思源哥邮箱，邮箱 OTP / Google 登录，禁止前端 JS 假登录）；② 看板升级为 PIP 进度管理 Dashboard（Executive Summary / 甘特图 / 依赖图 / 任务树 / Weekly To Do）
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

- [Done] 已确认 `https://78tyih.github.io/htx-otc-progress-hub/` 可访问（启用后轮询，第 2 次检查返回 HTTP 200），并已更新 `README.md` 访问链接章节，链接可发给思源哥。
- [Files] `README.md`。
- [Next] 本轮升级收尾；进入每周五数据更新节奏（见 README「每周更新建议」）。

---

## v0.3（2026-07-21）私密化 + PIP 升级 — 阶段日志

### 10. 公网 Pages 下线 + 仓库转私有 [Done]

- [Done] 公网 GitHub Pages 已删除，旧链接 `https://78tyih.github.io/htx-otc-progress-hub/` 已 404；GitHub 仓库 `78tyih/htx-otc-progress-hub` 可见性已转为 **PRIVATE**。公网版本正式废弃，新目标为仅交付私密版本。
- [Files] GitHub 仓库设置 / Pages 设置（线上操作，无本地文件变更）。
- [Next] 输出私密部署方案与安全文档。

### 11. 私密部署方案与安全文档 [Done]

- [Done] 确定推荐方案 **Cloudflare Pages + Cloudflare Access**：Pages 托管静态站点，Access 在边缘网关做真实身份验证（邮箱 OTP 一次性验证码 / Google 登录），策略仅放行思源哥邮箱；明确禁止前端 JS 假登录。新增操作清单 `docs/04_private_deployment.md`、访问控制说明 `docs/05_access_control.md`、环境变量模板 `.env.example`、安全规范 `SECURITY.md`。
- [Files] `docs/04_private_deployment.md`、`docs/05_access_control.md`、`.env.example`、`SECURITY.md`。
- [Next] 执行看板 PIP 升级开发。

### 12. PIP 甘特图 / 依赖图 / 任务树升级 [Done]

- [Done] 看板升级为 PIP 进度管理 Dashboard，页面变为 11 区块：新增 **02 Executive Summary**（总体进度 / 本周完成 / 阻塞数 / 下一节点）、**04 Trial Timeline Gantt Chart**（W1 07/21 – W6 08/31 六周、6 条业务主线泳道、任务条按状态着色）、**05 Workstream Dependency Map**（串行主链路 + 并行获客线 + 私密看板线）、**06 Main Tasks & Subtasks** 可展开任务树（原本周图表、Live Task Progress、Pipeline 看板、设计交付清单收编为子区）、**08 Weekly To Do List**（P0 高亮 / 过期标红 / 可搜索）；KPI 卡片新增 done/total 进度条；CRM 漏斗新增转化率与下一步两列。新增数据文件 `roadmap.json` / `gantt.json` / `task-tree.json` / `todo.json` / `milestones.json`；结构与字段设计见 `docs/06_gantt_and_pipeline_structure.md`。
- [Files] `index.html`、`style.css`、`app.js`、`data/kpi.json`、`data/crm-summary.json`、`data/roadmap.json`、`data/gantt.json`、`data/task-tree.json`、`data/todo.json`、`data/milestones.json`、`docs/06_gantt_and_pipeline_structure.md`、`README.md`。
- [Next] 数据脱敏终扫。

### 13. 数据脱敏确认 [Done]

- [Done] 全量扫描通过（含 5 个新 JSON 与全部新页面模块）：无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话（同事名 Sera / 思源哥 / 静格 / Oscar 除外）；客户均为脱敏占位编号 + 汇总统计。私密部署后脱敏规则不放松，规范见 `SECURITY.md`。
- [Files] `data/*.json`（10 个）、`index.html`、`app.js`、全部文档。
- [Next] git 提交并推送。

### 14. Git 提交推送 [Done]

- [Done] 本轮全部变更已提交并推送至 `main`：commit `16755d1`「Pivot to private deployment; add PIP gantt, dependency map, task tree, todo and security docs」（20 个文件，+2317/-232 行）；推送前完成进程清理、防御性脱敏扫描（通过）、10 个 JSON 合法性与 FALLBACK 逐字一致性校验（全部 MATCH）、本地冒烟 13 项资源全 200。仓库保持 PRIVATE，推送无公网暴露风险。
- [Files] 本轮全部变更文件（含 `.gitignore` 新增）。
- [Next] 进入 Cloudflare 私密部署。

### 15. Cloudflare 私密部署 [待执行]

- [待执行] **前置条件：需 Sera 提供 Cloudflare 账号**；随后按 `docs/04_private_deployment.md` 操作清单执行：Cloudflare Pages 接入仓库 → 配置 Access 应用与策略（仅放行思源哥邮箱，OTP / Google 登录）→ 验证未登录访问被拦截、授权邮箱可正常进入。
- [Files] `docs/04_private_deployment.md`（操作清单）、`.env.example`（变量模板）。
- [Next] 部署完成后输出私密链接。

### 16. 发送私密链接给思源哥 [待执行]

- [待执行] 私密部署验证通过后，将私密链接发给思源哥，并**单独告知用于验证的邮箱地址**（链接与邮箱分开发送，降低转发泄露风险）；同步更新 `README.md` 访问链接章节状态。
- [Files] `README.md`。
- [Next] 进入每周五数据更新节奏（见 README「每周更新建议」与 `docs/06` 第 7 节）。

---

> 状态图例：`[Done]` 已完成 / `[进行中]` 正在处理 / `[待执行]` 未开始。
