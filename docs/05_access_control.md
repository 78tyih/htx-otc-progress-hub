# HTX OTC BD Progress Hub 访问控制策略

> 文档版本：v1.0 ｜ 更新日期：2026-07-21 ｜ 维护人：Sera
> 配套文档：`docs/04_private_deployment.md`（私密部署方案）、`SECURITY.md`（安全政策）

---

## 1. 授权原则

- **最小权限**：看板只服务一个目的——Sera 向 Simon 汇报 OTC BD / PIP 进度。因此访问权限只授予完成这一目的所必需的最小范围。
- **仅 Simon 一个邮箱**：Cloudflare Access Policy 的 Include 名单中**只放 Simon 一个邮箱**，不添加任何备用邮箱、群组域名或泛域名规则。
- **任何人入名单需显式决策**：未来如需新增访问者，必须先由 Simon 确认，再临时加入，用后及时移除，并在当周安全检查中复核。
- **代码与站点双私密**：GitHub 仓库保持 PRIVATE（代码源私密），站点通过 Cloudflare Access 保持私密（访问面私密），两层独立防护。

## 2. 认证方式说明

| 项目 | 说明 |
| --- | --- |
| 认证提供方 | **Cloudflare Access 托管**（Zero Trust），本项目自身不含任何登录代码 |
| 方式一：邮箱一次性验证码（OTP） | 用户在 Access 验证页输入邮箱 → Cloudflare 向该邮箱发送 6 位一次性验证码 → 输入正确即通过。只有 Policy 名单内的邮箱会收到验证码 |
| 方式二：Google 登录 | 可选叠加。用户在 Access 验证页点 Google 登录，账号邮箱与名单匹配才放行 |
| 会话凭证 | 验证通过后由 Cloudflare 签发会话 Cookie，边缘节点校验，源站无需感知 |
| 本项目要做的开发量 | **零**。不写登录页、不写密码校验、不引入任何认证 SDK |

## 3. 为什么禁止前端 JS 假登录

本项目是纯静态站（无后端），因此**严禁**用「前端 JS 密码框 / localStorage 标记已登录」之类的方式做访问控制，原因：

1. **源码完全可见**：纯静态站的 HTML / CSS / JS 会原样下发到浏览器，任何人右键「查看源代码」或打开 DevTools 就能看到全部校验逻辑，包括写死的密码。
2. **可被绕过**：校验在浏览器里执行，攻击者可以直接禁用 JS、改返回值，或直接在 DevTools 里调用渲染函数，跳过整个「登录页」。
3. **等于没有安全**：假登录只挡住「不会按 F12 的人」，给出虚假的安全感，实际数据（含 Pipeline、KPI）依然裸奔。内部业务看板不能接受这种自欺式防护。
4. **正确做法**：把认证交给 Cloudflare Access（方案 B）或服务端 Basic Auth（方案 C）——**在请求到达静态文件之前就拦截**，未验证用户连一个字节的页面内容都拿不到。

## 4. 会话与撤销

| 项目 | 策略 |
| --- | --- |
| 会话时长 | 在 Zero Trust → Access → 对应 Application 的 **Session Duration** 中设置，建议 **12–24 小时**：Simon 每天看一两次，不需要频繁重验；过期后自动要求重新验证 |
| 全局会话 | Zero Trust → Settings → Authentication 的 Global session timeout 保持默认值即可，应用级时长以上一条为准 |
| 立即撤销 | 需要撤销访问时，**从 Policy 名单移除该邮箱即立即生效**——该邮箱无法再收到验证码、无法再登录；必要时同时在 Applications 中 Revoke existing sessions，强制已签发会话立刻失效 |
| 离职 / 变更场景 | 汇报关系变化或项目结束时，先移除邮箱，再确认 Access 日志中无后续访问 |

## 5. 密钥管理

1. **任何密码 / API Token / 密钥只允许存在于两处**：
   - 平台环境变量（Cloudflare / Render / Railway 后台的 Environment Variables）；
   - 本地 `.env` 文件（仅 Sera 本机）。
2. **`.env` 必须进 `.gitignore`**，永不提交、永不推送、永不出现在截图与聊天记录中。
3. **仓库内只放 `.env.example` 模板**：只含键名、占位值和注释说明（如 `ALLOWED_EMAIL=simon@example.com`），新人/未来的自己照模板在本地填真实值。
4. 前端代码（`index.html` / `app.js` / `style.css`）中**严禁出现任何密钥、密码、Token**——它们会被原样下发到浏览器。
5. 怀疑密钥泄露 = 按泄露处理：立即轮换（见第 7 节）。

## 6. 数据分级表

| 级别 | 内容 | 存放位置 | 说明 |
| --- | --- | --- | --- |
| ✅ 可入仓库（脱敏） | 汇总 KPI 数字与目标、Pipeline 状态 / 进度 / 下一步、设计交付清单、漏斗各级汇总数量、客户占位编号（Client-001 等）、同事名（Sera / Simon / 静格 / Oscar / Kimi） | GitHub private repo + 私密站点 | 只放统计结果与状态，不放到个人 |
| 🔒 仅本地（永不入库） | 真实 CRM 明细表、客户真实姓名、HTX UID、TG 用户名 / 群组路径 / 聊天记录、银行账户与地址、邮箱、电话、KYC / KYB 文件、客户原话 | Sera 本地加密目录或公司私有云盘 | 每周从这些原始资料中**统计汇总后**才把数字更新进 `data/*.json` |

> 执行细则与禁止入库清单以 `SECURITY.md` 为准；每次提交前对 `data/*.json` 做一次脱敏自查。

## 7. 泄露应急流程

发现或怀疑以下任一情况时立即执行：链接被转发给无关人员 / 密码或 Token 疑似泄露 / 仓库被意外转 public / 敏感信息被提交进 git。

1. **撤销邮箱授权**：Zero Trust → Access → Applications → 对应 Policy，移除受影响邮箱（或临时把名单清空），并 Revoke existing sessions——立刻掐断访问。
2. **轮换密码 / Token**：更换 Basic Auth 密码、Cloudflare API Token 等所有可能暴露的凭据（在平台环境变量中更新，本地 `.env` 同步更新）。
3. **检查 Access 日志**：Zero Trust → Logs → Access，核对近期访问记录：是否有陌生邮箱尝试、是否有异常地理位置 / 时间段的通过记录，截图留存。
4. **评估数据影响**：确认泄露窗口期内可能被看到的内容范围（仅脱敏汇总数据，还是混入了敏感信息）；若有敏感信息进过 git 历史，需改写历史或重建仓库，并按公司流程上报 Simon。
5. **复盘加固**：记录事件经过与原因，更新本策略或检查清单，防止同类问题复发。

---

> 本策略与 `docs/04_private_deployment.md` 配套执行；安全红线以 `SECURITY.md` 为准。
