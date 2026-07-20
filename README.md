# HTX OTC BD Progress Hub

> 给思源哥（Siyuan.C）查看的 HTX OTC BD 工作进度看板

## 一、项目说明

这是一个**纯前端的业务战情室 Dashboard**，用于展示 Sera 围绕 PIP 目标推进的 HTX OTC BD 工作进度，包括：

- **OTC USD 大宗交易设计交付包**：设计交付物清单与状态跟踪
- **TG 存量客户 CRM**：客户分层与转化漏斗（咨询 → 信息收集 → 注册 → KYC/KYB → 报价 → 首单 → 长期维护）
- **注册 / KYC / 首单转化**：核心 KPI 与目标对比
- **机构 / 个人 / Partner / KOL 拓展**：各业务线 Pipeline 进度
- **Live Task Progress**：任务实时进度跟踪（07 区块）
- **阻塞事项**：风险与卡点集中曝光
- **每周 Pipeline 与 CRIB 复盘**：周度节奏管理

技术特点：

- **纯 HTML / CSS / JS**，无构建工具、无后端、无依赖安装
- 数据与代码完全分离：所有业务数据放在 `data/*.json`，改数据不用改代码
- **日间 / 夜间双主题**：默认日间（light），夜间（dark）战情室风格完整保留；状态语义统一：Done=绿、Doing=蓝、Next=灰、Blocked=红
- 内置离线数据兜底：即使直接双击打开（`file://` 协议下无法 fetch JSON），页面也能用内置示例数据正常渲染

## 二、目录结构

```
htx-otc-progress-hub/
├── index.html                  # 主页面（看板入口，含右上角 Day/Night 切换）
├── style.css                   # 全局样式（日间/夜间双主题、色板、组件）
├── app.js                      # 前端逻辑（加载 JSON → 渲染各模块，含离线兜底数据）
├── data/                       # 业务数据（改这里即可更新看板，无需改代码）
│   ├── kpi.json                # 核心 KPI（目标 / 当前 / 趋势 / 状态）
│   ├── pipeline.json           # 各业务线 Pipeline（PIP 目标 / 进度 / 产出 / 下一步）
│   ├── design-delivery.json    # OTC USD 大宗交易设计交付包清单
│   ├── crm-summary.json        # TG 存量客户 CRM 汇总（分层 + 转化漏斗）
│   └── task-progress.json      # Live Task Progress 任务进度（07 区块数据源）
├── docs/                       # 设计说明、复盘文档等
│   ├── 01_reference_breakdown.md
│   ├── 02_project_brief.md
│   ├── 03_design_spec.md
│   └── CHANGELOG.md            # 版本变更记录
├── assets/                     # 静态资源
│   └── reference-dashboard.png # 视觉参考图（深色工地运营 Dashboard）
├── TASK_STATUS.md              # 本轮升级任务状态日志（[Progress] 格式）
├── .nojekyll                   # GitHub Pages 兼容文件（见下文）
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

- GitHub Pages：**部署后更新**（部署完成后回填 `https://<用户名>.github.io/htx-otc-progress-hub/`）。

## 六、GitHub Pages 部署（发链接给思源哥）

```bash
cd htx-otc-progress-hub
git init
git add .
git commit -m "HTX OTC BD Progress Hub v0.2"
git branch -M main
git remote add origin git@github.com:<用户名>/htx-otc-progress-hub.git
git push -u origin main
```

然后在 GitHub 仓库页面：

1. **Settings → Pages**
2. **Source** 选择 `main` 分支、`/(root)` 目录，保存
3. 等待约 1 分钟，访问 **https://<用户名>.github.io/htx-otc-progress-hub/** 即可

**关于 `.nojekyll`**：GitHub Pages 默认用 Jekyll 引擎处理站点，Jekyll 会忽略以下划线开头的文件/目录，并可能干扰部分静态文件路径。仓库根目录放一个空的 `.nojekyll` 文件即可让 Pages 跳过 Jekyll、原样托管纯静态文件，保证 `data/*.json`、`assets/` 等路径都能正常访问。本仓库已内置该文件，无需额外操作。

> 备选：若不想用命令行，也可在 GitHub 网页端手动新建仓库 `htx-otc-progress-hub` → 上传全部文件（保持目录结构）→ Settings → Pages 开启即可，效果相同。

## 七、⚠️ 公网部署注意（务必阅读）

> **本项目会部署到公网（GitHub Pages），任何人都能看到仓库内容。**

- ❌ **不要上传真实 CRM 明细或客户身份信息**：包括真实客户姓名、HTX UID、TG 用户名 / 群组路径、银行账户、邮箱、电话等。
- ✅ **公网版只放汇总数据和脱敏编号**：客户一律使用占位编号（如 `Client-001`、`Client-002`），数字只放汇总统计。
- 🔒 **真实 CRM 表留本地或私有文件夹**（如本地加密目录 / 公司私有云盘），每周从中统计汇总数据后再更新到本仓库。
- 当前仓库内所有数据均为脱敏占位数据，已通过脱敏扫描；后续每次提交前请自查一遍 `data/*.json`。

## 八、如何更新 data/*.json

五个 JSON 文件与前端渲染一一对应，**改完 JSON 无需改任何代码，刷新页面即生效**。字段约定如下：

> ⚠️ 注意：`app.js` 内置的 FALLBACK 离线兜底数据与 `data/*.json` 保持逐字一致。修改任何 JSON 后，请同步更新 `app.js` 中对应的 FALLBACK。

### 1. `data/kpi.json`（每周更新）

数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `label` | 指标名称（如「本周新增注册」） |
| `target` | 目标值 |
| `current` | 当前值 |
| `trend` | 趋势描述（如「较上周 +12%」） |
| `status` | 状态：`done`（达标，绿）/ `doing`（推进中，蓝）/ `next`（待启动，灰）/ `blocked`（受阻，红） |

### 2. `data/pipeline.json`（每周更新）

数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `module` | 业务线 / 模块名（如「机构客户拓展」） |
| `pipGoal` | 该模块对应的 PIP 目标 |
| `progress` | 当前进度描述或百分比 |
| `output` | 本周实际产出 |
| `next` | 下一步动作 |
| `owner` | 负责人 |
| `priority` | 优先级：`P0` / `P1` |
| `status` | 状态：`Done`（绿）/ `Doing`（蓝）/ `Next`（灰）/ `Blocked`（红） |

### 3. `data/crm-summary.json`（每周更新，按实际 TG CRM 表统计汇总后替换）

对象：

| 字段 | 含义 |
| --- | --- |
| `updatedAt` | 数据更新时间 |
| `total` | TG 存量客户总数 |
| `byLevel` | 客户分层数组，元素为 `{"level", "count"}`（如 A/B/C 级客户数） |
| `funnel` | 转化漏斗数组，元素为 `{"stage", "count"}`，阶段固定为：咨询 → 信息收集 → 注册 → KYC/KYB → 报价 → 首单 → 长期维护 |
| `note` | 备注说明 |

> 本文件只放**汇总统计数字**，客户身份信息一律脱敏为占位编号（Client-001 等）；真实 CRM 明细不上传仓库。

### 4. `data/design-delivery.json`（提交设计团队后更新状态）

数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `item` | 交付物名称 |
| `category` | 分类（如 流程图 / 原型 / 文案） |
| `status` | 状态：`done`（已交付）/ `doing`（进行中）/ `next`（待启动） |
| `note` | 备注（如验收反馈、链接） |

### 5. `data/task-progress.json`（任务有进展即更新，07 Live Task Progress 区块）

数组，每个元素：

| 字段 | 含义 |
| --- | --- |
| `task` | 任务名称 |
| `progress` | 完成百分比（0–100） |
| `status` | 状态：`done` / `doing` / `next` / `blocked` |
| `note` | 进度说明 / 当前卡点 |

> 用于向思源哥实时同步手上任务的推进节奏，建议任务状态一变就更新。

## 九、每周更新建议（固定节奏）

1. **每周五**：更新 `data/*.json`——KPI 进度、Pipeline 状态、客户转化漏斗、阻塞事项、下周计划 → 本地 `python3 -m http.server 8080` 自查一遍（顺手检查两种主题显示）→ `git commit && git push`
2. **周五下班前**：把 GitHub Pages 链接或整页截图发给思源哥，附 3 行以内本周要点
3. **每月底**：基于 `pipeline.json` 的 `output` / `next` / `Blocked` 项输出当月 **CRIB 复盘**，归档到 `docs/` 目录

## 十、当前版本

- **v0.2（2026-07-21）**：日间/夜间双主题（默认日间）、右上角 Day/Night 切换（localStorage 记忆）、新增 07 Live Task Progress 区块、日间 Hero 占位条、数据脱敏扫描通过；即将部署 GitHub Pages。详见 `docs/CHANGELOG.md`。
- **v0.1（2026-07-21）**：首个可用版本。看板框架、四大数据模块（KPI / Pipeline / 设计交付包 / CRM 漏斗）、深色战情室视觉均已就绪。
- 视觉参考：`assets/reference-dashboard.png`（深色工地运营 Dashboard，1750×3602）。
- 升级进度跟踪：见 `TASK_STATUS.md`。
