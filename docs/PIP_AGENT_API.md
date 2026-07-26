# PIP Agent API（v2）

> 供看板前端与外部 Agent 调用。所有接口统一返回 JSON（不返回 HTML 错误页），每个响应携带 `requestId` 便于审计。
> 部署在 Vercel Hobby：单部署上限 12 个 Serverless Functions，因此方案查询 / 执行折叠进既有端点，不新增 api 文件。

## 访问控制

| 调用方 | 要求 |
| --- | --- |
| 看板前端（同源浏览器请求，Origin 与 Host 一致） | 直接放行（由部署平台访问控制保护） |
| 外部 Agent（无 Origin 的 server-to-server / curl） | 必须 `Authorization: Bearer <PIP_AGENT_API_TOKEN>` |
| 跨源浏览器调用 | Origin 必须列入 `PIP_ALLOWED_ORIGINS` **且** Bearer 有效 |

- 未授权请求返回 `401`；非法来源返回 `403`；触发限流返回 `429`（默认 60 次/分钟/IP，单实例内存滑动窗口）。
- 请求体上限 64KB，超限返回 `413`。
- **禁止通过 URL Query 传递 Token**；Token 只保存在服务端环境变量，前端代码不包含 Token。

## 端点一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/agent/chat` | 对话入口（本地解析 → 规则 → LLM 兜底） |
| GET | `/api/agent/chat?proposalId=P-xxx` | 查询待确认方案状态（对应规格中的 `GET /api/agent/proposals/:id`） |
| POST | `/api/agent/confirm` | 确认执行：字段更新 或 方案创建 / 拆解（写操作唯一入口） |
| GET | `/api/status` | Agent / KV / 通知渠道在线状态 + 当前 `revision` |

## 统一响应协议

```json
{
  "ok": true,
  "version": "1.0",
  "requestId": "req-xxxx",
  "intent": "query_tasks | update_task | create_task | decompose_task | plan_tasks | clarify | no_action",
  "reply": "给用户看的简体中文回复",
  "requiresConfirmation": false,
  "contextTaskIds": ["T-0006"],
  "operations": [{ "operation": "update", "taskId": "T-0006", "patch": { "progress": 30 } }],
  "taskOptions": [],
  "warnings": [],
  "missingFields": [],
  "revision": 12,
  "writeEnabled": true,
  "sessionId": "s-xxxx"
}
```

- `operations[].patch` 字段白名单：`status / progress / nextAction / dueAt / remindAt / priority / blockedReason / result`。
- `taskOptions[]` 为创建 / 拆解候选（含 `suggested` AI 建议标记；拆解含 `dependsOnOptions` 选项下标串行依赖）。
- 旧字段兼容：`kind / tasks / confirm / contextTaskId / proposalId / parentTaskId` 仍会返回，旧前端无感升级。

## POST /api/agent/chat

```bash
curl -X POST "https://<your-domain>/api/agent/chat" \
  -H "Authorization: Bearer <PIP_AGENT_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "T-0006 进度更新到 30%，下一步联系 Michael 确认提款时间",
    "sessionId": "s-abc12345",
    "operator": "Sera"
  }'
```

要点：
- `sessionId`（可选）开启连续对话上下文（TTL 2 小时，最近 10 轮）；不传则退化为单轮 + 旧版 `contextTaskId`。
- 需要写入时 `requiresConfirmation=true` 并返回 `confirm`（更新）或 `proposalId`（创建 / 拆解）；**此接口永不直接改任务数据**。

## POST /api/agent/confirm — 模式 A：字段更新

```bash
curl -X POST "https://<your-domain>/api/agent/confirm" \
  -H "Authorization: Bearer <PIP_AGENT_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "T-0006",
    "patch": { "progress": 30, "nextAction": "联系 Michael 确认提款时间" },
    "baseRevision": 12,
    "operator": "Sera",
    "evidence": "设计包已发送（仅完成时可选）"
  }'
```

- 服务端重新校验：任务存在性、字段白名单、状态机迁移、进度 0–100、优先级 1–4、提醒 ≤ 截止。
- `baseRevision` 与服务端不一致 → `409 REVISION_CONFLICT`（响应携带最新 `revision`，需重新确认）。
- 线上未配置 KV → `503 KV_NOT_CONFIGURED`。

## POST /api/agent/confirm — 模式 B：方案执行（创建 / 拆解）

```bash
curl -X POST "https://<your-domain>/api/agent/confirm" \
  -H "Authorization: Bearer <PIP_AGENT_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": "P-xxxx",
    "selected": [0, 2],
    "edits": { "0": { "dueAt": "2026-07-31T18:00:00+08:00", "priority": 4 } },
    "baseRevision": 12,
    "operator": "Sera"
  }'
```

- `selected`：选项下标（默认全选）；越界返回 400。
- `edits`：仅允许 `title / priority / owner / dueAt / remindAt / nextAction / outputCondition / workstream`。
- 任务 ID 由服务端统一生成（`T-0001` 递增）；拆解方案的 `dependsOnOptions` 映射为真实任务 ID，自依赖剔除。
- 响应返回 `created[]`（新任务 ID / 标题 / 依赖 / parentTaskId）与各渠道通知结果。

## GET /api/agent/chat?proposalId=P-xxx

```bash
curl "https://<your-domain>/api/agent/chat?proposalId=P-xxxx" \
  -H "Authorization: Bearer <PIP_AGENT_API_TOKEN>"
```

返回方案状态（`pending` / 已执行后 404，TTL 2 小时）。

## GET /api/status

```bash
curl "https://<your-domain>/api/status"
```

```json
{
  "ok": true,
  "agent": { "online": true, "llmConfigured": false, "mode": "copilot", "structured": true },
  "api": { "tokenConfigured": true },
  "storage": { "backend": "kv", "kvConfigured": true, "writeEnabled": true },
  "revision": 12,
  "channels": { "wecom": { "configured": true }, "feishu": { "configured": false } }
}
```

只暴露配置的**布尔状态**，永不返回 Token / Webhook / 环境变量值。

## 错误码

| 状态码 | 场景 |
| --- | --- |
| 400 | 缺少必填字段 / 选项下标越界 / 未选择任何选项 |
| 401 | Token 缺失或无效（外部调用） |
| 403 | Origin 未列入 `PIP_ALLOWED_ORIGINS` |
| 404 | 任务或方案不存在 / 方案已过期（2 小时） |
| 405 | HTTP 方法错误 |
| 409 | 状态机拒绝 / 字段校验失败 / `REVISION_CONFLICT` |
| 413 | 请求体超过 64KB |
| 429 | 触发限流 |
| 503 | 线上未配置 KV（`KV_NOT_CONFIGURED`，只读模式） |
