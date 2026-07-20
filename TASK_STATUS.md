# TASK_STATUS — HTX OTC BD Progress Hub 升级任务状态

- **项目**：HTX OTC BD Progress Hub（仓库名 `htx-otc-progress-hub`）
- **用途**：给思源哥（Siyuan.C）查看的 HTX OTC BD / PIP 工作进度看板
- **更新日期**：2026-07-21
- **本轮目标**：从「本地深色静态看板」升级为「可部署 GitHub Pages、日间/夜间双主题、带 Live Task Progress 的进度看板」

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

### 7. Git commit [进行中]

- [Done] 待完成：初始化仓库、提交本轮全部变更（目标提交信息：`HTX OTC BD Progress Hub v0.2`）。
- [Files] 项目根目录全量、`TASK_STATUS.md`、`docs/CHANGELOG.md`、`README.md`。
- [Next] 推送远端并开启 GitHub Pages。

### 8. GitHub Pages 部署 [待执行]

- [Done] 待完成：推送 `main` 分支至 GitHub 仓库 `htx-otc-progress-hub`；Settings → Pages 选择 `main` / `/(root)`；仓库已内置 `.nojekyll`，纯静态原样托管。
- [Files] `.nojekyll`、全站静态文件。
- [Next] 验证 Pages 可访问，输出最终链接。

### 9. 输出最终访问链接 [待执行]

- [Done] 待完成：确认 `https://<用户名>.github.io/htx-otc-progress-hub/` 可访问后，更新 `README.md` 访问链接章节，并把链接发给思源哥。
- [Files] `README.md`。
- [Next] 本轮升级收尾；进入每周五数据更新节奏（见 README「每周更新建议」）。

---

> 状态图例：`[Done]` 已完成 / `[进行中]` 正在处理 / `[待执行]` 未开始。
