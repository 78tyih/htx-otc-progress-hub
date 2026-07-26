# PIP 结构化执行 Agent（v2）— 功能规格

> 版本：v2.0（分支 `agent/pip-structured-agent-v2`，基于 PR #1 对话能力演进）
> 目标：把 PIP 助手从「对话式进度同步」升级为「通过自然语言管理任务的结构化执行 Agent」。

## 1. 能力总览

| 能力 | 入口示例 | 结果 |
| --- | --- | --- |
| 任务查询 / 聚焦 | `打开 T-0006`、`哪些任务需要 Simon 协助？` | 任务卡 + 写入会话上下文，只读 |
| 字段级更新 | `T-0006 进度更新到 30%，下一步联系 Michael 确认提款时间` | 字段差异确认卡 → 确认后落库 |
| 对话创建任务 | `新增任务：跟进香港机构客户注册，4 星，周五前完成` | 待选任务方案 → 勾选/编辑 → 确认创建 |
| 任务拆解 | `把 T-0006 拆成 3 个子任务`、`按审批、KYC、首单和复盘拆开` | 2–6 个子任务方案（树状）→ 确认创建 |
| 任务规划 | `本周优先推进哪三项？`、`帮我规划明天的任务` | 只读建议（引用真实任务 ID + 推荐理由） |

本地对话解析（`api/_lib/copilot.js`，零外部依赖）永远可用；模型服务（`api/_lib/llm.js`）只用于提高自然语言理解与拆解质量，**不是任务系统的唯一执行路径**。

## 2. 可识别字段

更新意图可识别：任务 ID / 完整任务名称 / 上一轮会话任务、状态（七态）、进度百分比、下一步行动、截止时间、提醒时间、优先级（1–4 星 / 重要且紧急等）、阻塞原因、完成结果与完成证据。

中文时间表达：`7月30日`、`2026-07-30`、`今天/明天/后天`、`周五前`、`下周三`（统一解析为 Asia/Shanghai 墙钟，默认 18:00，提醒默认当天 09:00）。

## 3. 写入纪律（不可绕过）

1. **先预览后写入**：chat 接口只产出确认卡 / 待选方案，真正写入唯一入口是 `POST /api/agent/confirm`。
2. **确认接口重新完整校验**：不信任前端回传的任何 patch / 选项字段；字段白名单 + 状态机 + 交叉校验（提醒 ≤ 截止）。
3. **状态机**：沿用 `agent/schema.js` 的 `STATUS_TRANSITIONS` 七态迁移；已完成任务不能静默重新打开（改状态或把进度改回 100 以下都会被拒绝，需新建跟进任务）。
4. **任务 ID 服务端统一生成**（`T-0001` 递增），模型 / 前端不得自行指定；拆解的子任务串行依赖以选项下标表达，执行时映射为真实 ID，自依赖自动剔除。
5. **乐观锁**：每次写操作 `revision +1`；客户端携带的 `baseRevision` 不一致返回 `409 REVISION_CONFLICT`，需重新拉取最新数据再确认。
6. **先落库后通知**：KV 写入成功后才发送企业微信（Sera）/ 飞书（Simon）通知；任一渠道失败不回滚任务写入，响应中明确各渠道成败。

## 4. 新任务方案（proposal）

- 创建 / 拆解都先生成 `P-xxx` 方案（TTL 2 小时，随 hub state 持久化，最多 50 个待确认）。
- 选项字段：`title / status / priority / workstream / owner / dueAt / remindAt / progress / nextAction / outputCondition / dependencies / parentTaskId / note`。
- 能安全推断的字段给出建议值并标记 `suggested: { field: true }`（前端展示「AI 建议」角标）。
- 缺最关键信息（如任务名称）时只追问一个问题。
- 用户可以：全选 / 部分勾选 / 逐字段编辑（白名单 8 个字段）/ 取消 / 确认执行。
- 执行任务落库时附带 `parentTaskId`（拆解）、`createdFromConversation: true`、`proposalId` 扩展字段；存量任务无这些字段时校验与展示均正常。

## 5. 任务规划（只读）

排序依据：逾期 > 非阻塞 > 星级 > 截止时间 > 依赖就绪 > KPI 相关性；推荐理由中标注：已逾期 / 当前阻塞 / 星级 / 截止 / KPI 相关 / 需 Simon 协助 / 前置依赖。规划结果只引用真实任务 ID，不生成确认卡；只有用户明确要求改优先级 / 截止 / 新增任务时才进入写入流程。

## 6. 会话上下文

- `sessionId` 由前端生成（localStorage），不携带身份信息；服务端校验格式 `[A-Za-z0-9_-]{8,64}`。
- 上下文字段：`activeTaskIds / lastIntent / pendingProposalId / recentMessages / operator / createdAt / expiresAt`。
- TTL 2 小时；`recentMessages` 只保留最近 10 轮（20 条），超出自动裁剪；永不永久保留完整聊天内容。

## 7. 模型接入与数据最小化

- 环境变量优先级：`AI_PROVIDER / AI_API_KEY / AI_BASE_URL / AI_MODEL / AI_DATA_POLICY` 优先，缺失时回退 `LLM_API_KEY / LLM_BASE_URL / LLM_MODEL`。
- 默认 `AI_DATA_POLICY=minimal`：发往外部模型的任务数据只含 `id / title / status / progress / priority / owner / workstream / dueAt / nextAction / dependencies`。
- **永不发送**：Webhook 地址、API Key、KV Token、登录信息、完整审计日志、客户资料、SharePoint 链接、环境变量、访问控制配置。
- 订阅说明：ChatGPT Plus / Kimi 会员 / Claude Pro 等网页订阅**不是** API 额度；禁止提取 Cookie / Session / 浏览器 Token，禁止模拟登录绕过计费。无官方 API 时使用：官方 API Key、企业正式 API、OpenAI-compatible 中转、或本地对话解析模式。
- 不要把真实 API Key 粘贴到聊天或代码里；只配置在服务端环境变量。

## 8. 线上持久化

- Vercel 环境必须配置 `KV_REST_API_URL` + `KV_REST_API_TOKEN` 才能写入。
- 未配置 KV 时：查询继续可用（部署时只读数据），所有写操作返回 `503 KV_NOT_CONFIGURED`，前端确认按钮禁用，PIP 助手明确提示「线上持久化存储尚未配置」，绝不假装更新成功。

## 9. 前端交互（看板抽屉）

对话记录、当前关联任务（可点击 chip）、字段变更预览（确认卡）、新任务选项卡（多选 + 逐字段编辑 + AI 建议角标）、子任务拆解树、全选 / 取消 / 确认执行、执行结果、通知渠道结果（企业微信 ✓/✗、飞书 ✓/✗）、409 冲突重确认提示。

状态栏（`/api/status` 驱动）：
- PIP 助手在线（本地对话）/（对话 + 模型）
- KV 已连接 / 未连接
- 企业微信已配置 / 未配置；飞书已配置 / 未配置

## 10. 模块索引

| 模块 | 职责 |
| --- | --- |
| `api/agent/chat.js` | 对话入口：本地解析 → 规则路由 → LLM 结构化兜底；GET 查询方案 |
| `api/agent/confirm.js` | 写操作唯一入口：字段更新 + 方案执行；乐观锁；先落库后通知 |
| `api/_lib/agent-protocol.js` | 结构化协议定义与清洗（intent / operation / 字段白名单） |
| `api/_lib/copilot.js` | 本地对话解析、patch 校验、状态机、规划、创建 / 拆解选项生成 |
| `api/_lib/proposals.js` | 方案生命周期、任务 ID 生成、选项服务端校验与物化 |
| `api/_lib/session.js` | 短期会话上下文（TTL + 裁剪） |
| `api/_lib/security.js` | Bearer 鉴权、CORS、限流、请求体大小限制、requestId |
| `api/_lib/llm.js` | AI_* 配置、数据最小化、结构化协议输出 |
| `api/_lib/store.js` | KV / 文件双后端、`revision` 版本号、v2 状态结构 |
| `tests/agent-v2.test.js` | 47 项验收断言（`npm test`） |
