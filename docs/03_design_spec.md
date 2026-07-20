# HTX OTC BD Progress Hub 设计文档

> 版本：v1.0 ｜ 更新日期：2026-07-21 ｜ 维护人：Sera
> 适用范围：`index.html`（主看板页面）及 `css/` 样式体系。所有 UI 文案使用中文。

---

## 1. 设计定位

HTX OTC BD Progress Hub **不是普通官网，也不是营销落地页**，而是面向上级 Siyuan.C（思源哥）的**内部业务进度 Dashboard**。

设计关键词：

- **深色指挥台**：黑灰底色、低饱和、高对比，营造业务战情室氛围
- **高对比数据**：核心数字大而醒目，扫一眼即可抓取
- **KPI 可视化**：PIP 核心目标以卡片 + 图表方式直读
- **Pipeline 清晰**：Done / Doing / Next / Blocked 四态一目了然
- **状态明确**：颜色即语义，不依赖文字猜测
- **适合上级快速查看**：30 秒内获取「进展如何 / 哪里卡住 / 需要什么支持」
- **可每周更新**：数据以 JSON 文件驱动，周更成本低

## 2. 视觉参考

视觉基准为一张深色工地运营 Dashboard 截图（1750×3602），其关键特征：

- 深黑背景、黑灰卡片分区
- 超大白色数字（KPI 卡片核心指标）
- 黄色高亮行动色（主图表柱状图、操作按钮、进度条）
- 绿色 / 红色趋势状态徽标（↑ 12% / ↓ 2pt 等）
- 横向 KPI 卡片排布、大面积图表区域
- 顶部搜索与操作栏（搜索框 + 黄色主按钮）

> **注明**：本地未找到 `awesomedesign.md`，本文档中的色彩与组件规范以参考截图实际视觉为准整理，并结合 HTX 业务语义做了映射（如蓝色用于 HTX 业务识别、红色用于阻塞）。

## 3. 色彩系统

```css
:root {
  --bg-main: #111111;        /* 页面主背景 */
  --bg-panel: #1f1f1f;       /* 面板/区块背景 */
  --bg-card: #252525;        /* 卡片背景 */
  --border: #333333;         /* 分隔线与卡片描边 */
  --text-main: #ffffff;      /* 主文字 */
  --text-muted: #9b9b9b;     /* 次要文字/小标题 */
  --accent-yellow: #ffe000;  /* 主行动色/关键图表 */
  --accent-blue: #0066ff;    /* HTX 业务识别/进行中 */
  --success: #10b981;        /* 已完成/增长 */
  --danger: #ff4d6d;         /* 风险/阻塞 */
  --warning: #facc15;        /* 警示/提醒 */
}
```

色彩语义：

- **黄色（--accent-yellow）**：主操作按钮、关键图表（核心图表区主色）、强调数字与高亮
- **蓝色（--accent-blue）**：HTX OTC 业务识别色（Logo 区/标签）与「进行中（Doing）」状态
- **绿色（--success）**：已完成（Done）、正向增长趋势
- **红色（--danger）**：风险、阻塞（Blocked）、负向趋势
- **灰色**：待启动（Next）或低优先级内容，使用 `--text-muted` 及低透明灰

状态语义全局统一：**Done = 绿、Doing = 蓝、Next = 灰、Blocked = 红**。

## 4. 字体层级

| 层级 | 用途 | 规格 |
| --- | --- | --- |
| H1 页面标题 | 看板主标题 | 28–36px，白色，半粗（font-weight 600） |
| H2 模块标题 | 各区块标题 | 20–24px，白色 |
| KPI 数字 | 核心指标 | 48–64px，白色，加粗（font-weight 700） |
| 卡片标题 | 指标名称 | 14–16px，灰色（--text-muted） |
| 状态说明 | 趋势/补充说明 | 14–16px，绿色/红色/灰色（按语义着色） |
| 表格文字 | Pipeline 数据 | 13–14px |

字体族建议使用系统无衬线栈（`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`），数字可配合 `font-variant-numeric: tabular-nums` 保证对齐。

## 5. 页面结构

页面自上而下共 8 个区块：

```
01  Top Navigation            顶部导航（标题 / 搜索 / 操作）
02  KPI Overview Cards        PIP 核心目标 KPI 卡片区
03  Weekly Progress Chart     本周进度核心图表区
04  Work Pipeline Board       工作 Pipeline 看板（四列）
05  CRM Conversion Funnel     TG 存量客户转化漏斗
06  Design Delivery Checklist OTC USD 大宗交易设计交付包清单
07  Blockers & Support Needed 阻塞事项与所需支持
08  Next Week Plan            下周计划
```

## 6. 组件说明

### 6.1 顶部导航（Top Navigation）

- 左侧：菜单按钮（汉堡图标）、页面标题「HTX OTC BD Progress Hub」、副标题（一句话说明本周焦点）
- 中部：搜索框（搜索任务 / 客户 / 事项）
- 右侧：更新时间（`data/crm-summary.json` 的 `updatedAt` 等数据源时间）、操作按钮 **Update / Export / New Item**（Update 与 New Item 使用黄色主行动色样式，Export 为次要描边样式）

### 6.2 KPI 卡片（KPI Overview Cards）

横向排布 PIP 核心目标，数据来自 `data/kpi.json`：

| PIP 核心目标 | 目标值 |
| --- | --- |
| 机构注册 | ≥ 6 家 |
| 个人注册 | ≥ 19 人 |
| 新增交易收入 | ≥ 26,000 USDT |
| Partner/中介 | ≥ 7 家 |
| KOL | ≥ 10 位 |
| 集团销售对接 | ≥ 6 次 |
| 设计交付包 | 1 套 |
| 客户 Pipeline | 1 套 |

卡片样式：

- 深灰背景（--bg-card）、圆角、1px 描边（--border）
- 左上角小标题（指标名称，灰色）
- 中间大数字（当前值 / 目标值，白色加粗 48–64px）
- 下方趋势状态（↑ 绿色增长 / ↓ 红色下降 / 灰色持平或待启动）
- 状态着色规则：已完成绿、待启动灰、阻塞红（进行中可配蓝色徽标）

### 6.3 核心图表区（Weekly Progress Chart）

- 将参考图中的黄色柱状图改造为业务图表，展示以下维度：
  - 本周完成事项数量
  - Pipeline 各阶段数量
  - 客户转化各阶段数量
  - 设计交付完成度
- **先用纯 CSS 柱状图实现，不引入图表库**（保持单文件轻量、无外部依赖）
- 柱体使用黄色（--accent-yellow），趋势徽标沿用绿/红配色，图表区背景为 --bg-panel

### 6.4 Pipeline 看板（Work Pipeline Board）

- 四列布局：**Done 已完成（绿）/ Doing 进行中（蓝）/ Next 待启动（灰）/ Blocked 阻塞（红）**
- 任务卡片包含字段：任务名称、对应 PIP 目标、当前状态、下一步动作、负责人、优先级（P0 / P1）
- 数据来自 `data/pipeline.json`，卡片按 `status` 自动归入对应列

### 6.5 客户转化漏斗（CRM Conversion Funnel）

- 漏斗阶段固定为：**咨询 → 信息收集 → 注册 → KYC/KYB → 报价 → 首单 → 长期维护**
- 数据来自 `data/crm-summary.json` 的 `funnel` 数组，自上而下逐级收窄展示，各级标注数量与转化率
- 漏斗主体使用黄色渐变或分段黄色，当前卡点阶段可用红色描边提示

### 6.6 阻塞事项（Blockers & Support Needed）

重点展示需要思源哥协助的内容，使用红色（--danger）作为视觉锚点：

1. 大数据客户名单
2. Oscar 大客户项目名单
3. 设计团队排期
4. 首单测试配合
5. 客户 KYC 状态确认

每条阻塞事项应包含：事项描述、影响范围、所需支持、期望解决时间。此区块在看板中享有高视觉优先级（红色标题/徽标），确保上级 30 秒内注意到。

---

> 本设计文档与 `data/` 各 JSON 文件的 Schema 约定保持一致，前端实现时不得偏离状态语义与色彩映射。
