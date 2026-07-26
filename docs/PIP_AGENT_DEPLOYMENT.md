# PIP 结构化执行 Agent（v2）— 部署指南

> 看板保持私密：继续由 Vercel 部署平台访问控制保护，仅授权用户可访问；本指南只涉及环境变量与部署步骤，不含任何真实密钥。

## 1. 环境变量清单

### 必需（线上写入）

| 变量 | 说明 |
| --- | --- |
| `KV_REST_API_URL` | Vercel KV REST 地址（未配置则线上只读，写入返回 503） |
| `KV_REST_API_TOKEN` | Vercel KV REST Token |

### 外部 Agent API（推荐配置）

| 变量 | 说明 |
| --- | --- |
| `PIP_AGENT_API_TOKEN` | 外部 Agent Bearer Token。**配置后**，无 Origin 的调用（curl / server-to-server）必须携带；未配置时仅同源浏览器与本地开发可用 |
| `PIP_ALLOWED_ORIGINS` | 跨源白名单，逗号分隔（如 `https://agent.example.com`）；同源请求无需列入 |
| `PIP_AGENT_RATE_LIMIT` | 可选，限流阈值（次/分钟/IP，默认 60） |
| `PIP_AGENT_MAX_BODY` | 可选，请求体上限（字节，默认 65536） |

### 通知渠道（可选，未配置则跳过通知并在响应中说明）

| 变量 | 说明 |
| --- | --- |
| `WECHAT_WEBHOOK_URL` | 企业微信机器人 Webhook（Sera） |
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook（Simon） |
| `PIP_DASHBOARD_URL` | 通知卡片里的看板链接（本机/局域网地址会被拒绝） |

### 模型服务（可选，未配置则纯本地对话解析）

| 变量 | 说明 |
| --- | --- |
| `AI_PROVIDER` | 提供商标识（默认 `openai-compatible`） |
| `AI_API_KEY` | 官方 API Key / 企业正式 API / OpenAI-compatible 中转 Key |
| `AI_BASE_URL` | API 地址（默认 `https://api.openai.com/v1`） |
| `AI_MODEL` | 模型名（默认 `gpt-4o-mini`） |
| `AI_DATA_POLICY` | 数据策略，固定 `minimal` |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | 旧版变量，向后兼容；**`AI_*` 优先** |

> 订阅提醒：ChatGPT Plus / Kimi 会员 / Claude Pro 等网页订阅**不包含**官方 API 额度，不要粘贴 Cookie / Session / 浏览器 Token；没有官方 API 时保持模型变量留空即可，本地 Copilot 仍覆盖查询 / 更新 / 创建 / 拆解 / 规划全部基础能力。

## 2. 本地开发

```bash
npm test          # e2e(50) + copilot + agent-v2(47) 全量断言
npm run build     # schema 校验 + fallback 一致性检查
npm run dev       # 本地 dev-server（默认 8123 端口可用 python3 -m http.server 8123 预览静态看板）
```

本地默认使用文件存储（`data/` + 侧边文件），无需 KV；未配置 `PIP_AGENT_API_TOKEN` 时本地调用不强制 Token。

## 3. Vercel 部署

### 3.0 配置 KV 存储（线上写入的前提，必须先做）

**未配置 KV 时，所有写操作返回 `503 KV_NOT_CONFIGURED`，PIP 助手确认按钮禁用。**

通过 Vercel 控制台配置（推荐）：
1. 打开 Vercel 项目 → **Storage** 标签 → **Create Database** → 选择 **KV**
2. 命名（如 `htx-otc-hub-kv`）→ 创建
3. 创建后点击 **Connect to Project** → 选择当前项目 → 确认
4. Vercel 会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 到所有环境
5. 触发一次 Redeploy（Vercel 控制台 → Deployments → 最新 → Redeploy）

通过 Vercel CLI 配置：
```bash
npx vercel login
npx vercel kv create htx-otc-hub-kv
npx vercel link                          # 关联到现有项目
npx vercel kv connect htx-otc-hub-kv     # 连接到项目（自动注入环境变量）
npx vercel --prod                         # 触发生产部署使环境变量生效
```

验证 KV 已配置：
```bash
curl -s https://htx-otc-progress-hub.vercel.app/api/status | python3 -m json.tool
# 期望看到 "storage": { "backend": "kv", "kvConfigured": true, "writeEnabled": true }
```

### 3.1 部署要点

1. Hobby 计划单部署上限 **12 个 Serverless Functions**（不含 `api/_lib`）。本版本未新增函数文件：方案查询折叠进 `GET /api/agent/chat?proposalId=`，方案执行折叠进 `POST /api/agent/confirm`。新增端点前先 `find api -name "*.js" -not -path "*/_lib/*" | wc -l`。
2. 在 Vercel 项目设置中配置上文环境变量（同 key 多 environment 建议用 REST API v10 upsert，CLI 第二 environment 会静默失败）。
3. 推送 `main` 分支自动触发 Production 部署；部署后用 `GET /api/status` 验证：
   - `deploy.commitSha` 与 main HEAD 一致
   - `deploy.env === "production"`（非 preview）
   - `storage.kvConfigured === true` 且 `storage.writeEnabled === true`
   - `api.tokenConfigured` 与预期一致
   - `channels.wecom.configured` / `channels.feishu.configured` 与预期一致
4. 首次访问会自动用部署包内 `data/*.json` 播种 KV（`hub:state`），之后以 KV 为真相源。看板前端初始加载 `data/*.json` 快速首屏后立即调用 `/api/tasks` 覆盖为 KV 最新数据，保证刷新 / 跨浏览器 / 跨设备一致。

## 4. 安全验收清单

- [ ] 未配置 Token 时：看板同源对话正常；外部 curl 可用（视为开发模式）
- [ ] 配置 `PIP_AGENT_API_TOKEN` 后：外部 curl 无 Token → 401；错误 Token → 401；正确 Token → 200
- [ ] 跨源 Origin 未列入 `PIP_ALLOWED_ORIGINS` → 403
- [ ] `/api/status` 响应不含任何 Token / Webhook / KV 密钥字样
- [ ] 线上未配置 KV：确认按钮禁用，confirm 返回 `503 KV_NOT_CONFIGURED`
- [ ] 两个会话同时更新：后到请求带旧 `baseRevision` → `409 REVISION_CONFLICT`
- [ ] 通知渠道故意填错：任务写入仍成功，响应中该渠道 `success: false`，不回滚

## 5. 故障排查

| 现象 | 排查 |
| --- | --- |
| PIP 助手提示只读模式 | `GET /api/status` 看 `storage.kvConfigured`；补配 KV 后**重新部署**（env 变更需 redeploy 生效） |
| 外部 Agent 一直 401 | 确认 Token 完全一致（恒定时间比较，长度不一致直接拒绝）；确认未把 Token 放在 URL Query |
| 对话能聊但创建 / 拆解无方案 | 看 `warnings`；线上只读模式下方案不落库，需先配 KV |
| 模型未生效 | `GET /api/status` 看 `agent.mode`：`copilot` 为纯本地，`copilot+llm` 为已接入；检查 `AI_API_KEY` / `AI_BASE_URL` 是否可达 |
