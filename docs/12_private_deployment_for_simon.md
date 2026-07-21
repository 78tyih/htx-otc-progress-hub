# Simon 专属私密部署指南

> 文档版本：v1.0 ｜ 更新日期：2026-07-21 ｜ 维护人：Sera
> 配套文档：`docs/04_private_deployment.md`（方案选型）、`docs/05_access_control.md`（访问控制策略）、`docs/10_file_upload_strategy.md`（资料上传策略）、`SECURITY.md`（安全政策）
> 用途：本指南是**最终选定方案（Cloudflare Pages + Access）的逐步执行手册**。Sera 照做即可产出「仅 Simon 邮箱可访问」的私密看板链接；方案为什么选它，见 `docs/04_private_deployment.md`。

---

## 🚫 三条红线（部署全程适用，违反任意一条即停止部署并整改）

1. **不做前端假登录**：纯静态站源码对访客完全可见，任何写在页面里的密码框 / 登录判断都可被一键绕过，等于没有安全。本项目永不新增登录代码。
2. **不把用户名 / 密码写进 JS**：任何凭据只允许存在于平台环境变量或本地 `.env`，严禁出现在 `index.html` / `app.js` / `style.css`、git 提交历史、截图与聊天记录中。
3. **不把真实 CRM 放进公开或未加权限路径**：真实 CRM 明细永不入库、永不上站点；仓库与 Pages 上只允许存在脱敏汇总数据与 `assets/files/` 中的脱敏文件。

---

## 1. GitHub 私有仓库现状确认

| 项目 | 现状 |
| --- | --- |
| 仓库 | `78tyih/htx-otc-progress-hub`，已转为 **PRIVATE**（代码源私密 ✅） |
| 旧公网 GitHub Pages | 已删除下线，旧链接 404 |
| 分支 | `main`（Pages 将监听此分支自动部署） |

操作前自查：GitHub 仓库页面顶部应显示 **Private** 徽标；若显示 Public，立即在 Settings → General → Danger Zone 改回 Private 再继续。

## 2. Cloudflare Pages 连接私有仓库

1. 登录 https://dash.cloudflare.com （无账号则用工作邮箱免费注册）。
2. 左侧 **Workers & Pages** → **Create** → **Pages** 标签 → **Connect to Git**。
3. 授权 Cloudflare 访问 GitHub：在授权弹窗中选择 **Only select repositories**，勾选私有仓 `78tyih/htx-otc-progress-hub`（授权私有仓不会把仓库变公开）。
4. 构建设置（本项目纯静态、无框架、无 CDN 依赖）：
   - Framework preset：**None**
   - Build command：**留空**
   - Build output directory：**`/`**
5. 点击 **Save and Deploy**。首次部署完成后，Cloudflare 会分配域名：`https://<项目名>.pages.dev`。
6. 此后每次 `git push` 到 `main`，Pages 自动重新部署（约 1 分钟内生效），无需任何手动操作。

## 3. 创建 Cloudflare Access 应用

1. 进入 Zero Trust 控制台：https://one.dash.cloudflare.com （首次使用按向导创建团队，免费套餐即可）。
2. 左侧 **Access** → **Applications** → **Add an application** → 选择 **Self-hosted**。
3. 填写应用信息：
   - Application name：如 `HTX OTC Progress Hub`（仅自己可见）。
   - Session Duration：建议 **12–24 小时**。
   - Application domain：**填第 2 步 Pages 分配的域名**（如 `<项目名>.pages.dev`，不带 `https://`、不带路径）。
4. 保存应用。**加完 Access 后，`*.pages.dev` 域名下的所有请求都会先在 Cloudflare 边缘被拦截**，未验证用户连页面 HTML 都拿不到。

## 4. 访问策略只放行 Simon 邮箱

1. 在刚创建的 Application 下 **Add a policy**：
   - Policy name：如 `only-simon`。
   - Action：**Allow**。
   - **Include** 规则：选择 **Emails**，值填 **Simon 邮箱**——**只此一个**，不加备用邮箱、不加群组、不加域名通配。
2. 开启登录方式：Zero Trust → **Settings** → **Authentication** → **Login methods**：
   - 开启 **One-time PIN**（邮箱一次性验证码）：只有名单内邮箱会收到验证码。
   - 可选叠加 **Google**：Simon 若习惯用 Google 账号登录可一并开启（账号邮箱仍须与名单一致）。
3. 复核：该应用下不应存在任何多余的 Allow 规则（如 everyone、域名后缀放行等）。

## 5. 测试未授权访问被拦截

1. 打开一个**无痕窗口**（避免已有 Cookie 干扰），访问 `https://<项目名>.pages.dev`。
2. 预期：出现 **Cloudflare Access 验证页**（要求输入邮箱），**而不是**看板内容。若直接看到看板，说明 Access 未生效，回第 3–4 节检查域名与 Policy。
3. 输入一个**不在名单内的邮箱**（如自己的私人邮箱）：
   - 预期：**收不到验证码**（或被直接拒绝），始终停留在验证页，无法进入看板。
4. 以上两条全部符合预期，才算「未授权拦截」测试通过。

## 6. 测试授权邮箱可正常访问

1. 在 Access 验证页输入 **Simon 邮箱** → 该邮箱收到 6 位一次性验证码 → 输入后进入看板。
2. 进入后逐区块确认渲染正常（左侧 10 项目录 + 右侧同序模块）：
   - 01 执行摘要 / 02 KPI 概览 / 03 资料访问中心 / 04 时间推进图 / 05 任务依赖图 / 06 主线任务进度 / 07 工作 Pipeline / 08 本周待办 / 09 阻塞事项 / 10 周更记录；
   - 状态色正确（Done 绿 / Doing 黄渐变 / Next 灰 / Blocked 红）；
   - 主题切换（日间 / 夜间，默认日间）与 Logo 双焰显示正常；
   - 03 资料访问中心的「打开」按钮能在新标签页打开 `assets/files/` 下的脱敏文件。
3. 会话验证：等待会话过期（或清除 Cookie）后重新打开链接，**需重新验证**才能进入。
4. 全部通过后，把链接发给 Simon，并**单独告知**：打开链接后需要输入他自己邮箱收到的验证码才能进入（这同时证明链接没有发错人）。

## 7. 不上传真实客户数据（部署前脱敏检查清单）

每次部署 / 推送前逐项确认：

- [ ] `data/*.json` 只有脱敏汇总：客户一律 Client-XXX 占位编号，无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话、客户原话（同事名 Sera / Simon / 静格 / Oscar 除外）。
- [ ] `assets/files/` 中**只放脱敏文件**，逐个打开复核内容无敏感信息。
- [ ] **真实 CRM 明细留本地**（Sera 本地加密目录 / 公司私有云盘），永不入库、永不上站点；每周只把统计汇总后的数字更新进 `data/*.json`。
- [ ] 仓库内无真实密钥：密码 / Token 只在平台环境变量或本地 `.env`（`.env` 已进 `.gitignore`）。
- [ ] 前端三件套（`index.html` / `app.js` / `style.css`）中无任何凭据、无登录代码（对照红线 1、2）。
- [ ] 提交前运行 `python3 .dev-scripts/sync_fallback.py --check` 通过（数据与页面兜底一致）。

## 8. 每周更新流程

```text
① 本地更新数据：修改 data/*.json（KPI / 甘特 / Pipeline / 待办 / 周更记录等）
        │
        ▼
② 同步页面兜底数据：python3 .dev-scripts/sync_fallback.py
   （把 data/*.json 写进 app.js 的 FALLBACK 并自动双向验证，输出 VERIFY: PASS）
        │
        ▼
③ 脱敏自查：按第 7 节清单逐项过一遍
        │
        ▼
④ 提交推送：git add -A && git commit -m "weekly update" && git push origin main
        │
        ▼
⑤ Cloudflare Pages 自动重新部署（约 1 分钟）
        │
        ▼
⑥ 无痕窗口打开私密链接，复核新数据渲染正常（Access 配置不受更新影响）
```

- 若某周只改文档 / 样式，同样走 ②–⑥（`sync_fallback.py` 会确认数据未漂移）。
- 若部署失败：Cloudflare Pages → 对应项目 → **Deployments** 查看构建日志，修复后重新 push 即可。

---

> 本指南与 `docs/04_private_deployment.md`（选型依据）、`docs/05_access_control.md`（会话撤销 / 密钥管理 / 泄露应急）配套执行；安全红线以 `SECURITY.md` 为准。
