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
