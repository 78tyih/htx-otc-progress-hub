# HTX OTC BD Progress Hub 私密部署方案

> 文档版本：v1.0 ｜ 更新日期：2026-07-21 ｜ 维护人：Sera
> 配套文档：`docs/05_access_control.md`（访问控制策略）、`SECURITY.md`（安全政策）、`.env.example`（环境变量模板）

---

## 1. 当前目标

- 本看板**仅供 Sera 向 Simon（Primary Reviewer）展示 HTX OTC BD / PIP 进度**，是内部汇报工具，**不作为公开网站**。
- 最终交付形态：一个私密链接，**只有 Simon 本人通过真实身份验证（邮箱一次性验证码 OTP / Google 登录）后可访问**。
- **禁止前端 JS 假登录**：本项目是纯静态站，所有源码对访客完全可见，任何写在前端的「密码校验」都可被绕过，等于没有安全（原因详见 `docs/05_access_control.md` 第 3 节）。
- **真实客户信息永不入库、永不入页**：仓库与页面只放脱敏汇总数据与占位编号（Client-001 等），红线见 `SECURITY.md`。

### 1.1 当前状态（截至 2026-07-21）

| 项目 | 状态 |
| --- | --- |
| GitHub 仓库 `78tyih/htx-otc-progress-hub` | 已转为 **PRIVATE** |
| 公网 GitHub Pages（`78tyih.github.io/htx-otc-progress-hub`） | **已删除下线**，旧链接已 404 |
| 私密部署 | 待执行，推荐方案 B（见下文） |

## 2. 三种部署方案对比

| 维度 | 方案 A：GitHub Private Repo + Pages 访问控制 | 方案 B：Cloudflare Pages + Cloudflare Access ★推荐 | 方案 C：VPS / Render / Railway + Basic Auth |
| --- | --- | --- | --- |
| 适用条件 | Simon 本人有 GitHub 账号；仓库所有者为付费计划（私有仓 Pages 需 GitHub Pro/Team 及以上）；将 Simon 邀请为仓库 collaborator | 任意静态站；Simon 只需有一个邮箱（或 Google 账号）；Sera 注册 Cloudflare 账号（免费套餐即可） | 有一台 VPS，或使用 Render / Railway 等平台托管静态站 |
| 访问控制方式 | 登录身份 = Simon 自己的 GitHub 账号，只有 collaborator 能看到私有仓 Pages | Cloudflare Access 在边缘拦截请求，邮箱一次性验证码（OTP）/ Google 登录，Policy 只放行 Simon 邮箱 | HTTP Basic Auth，指定用户名密码（如用户名 `simon`，密码由 Sera 单独告知） |
| 优点 | 不引入新平台；代码与站点同处一地；依托 GitHub 成熟权限体系 | 适合纯静态站；真实身份验证由 Cloudflare 托管，**无需自建后端、无需开发登录系统**；可按邮箱精确放行到个人；免费额度够用；可随时一键撤销 | 不依赖 GitHub / Cloudflare 账号体系；平台选择灵活；密码可随时轮换 |
| 限制 | 需付费计划才支持私有仓 Pages；要求 Simon 注册并登录 GitHub；collaborator 可见整个仓库（含提交历史），权限粒度过粗 | 首次使用需在 Zero Trust 控制台配置，略有学习成本；使用 Pages 分配的 `*.pages.dev` 域名即可，无需自有域名 | 浏览器弹窗体验较粗糙；**密码必须放平台环境变量，严禁写进前端代码或 git**；自建 VPS 需自行维护 nginx、证书与续期 |
| 结论 | 备选（仅当 Simon 本就是活跃 GitHub 用户时） | **推荐** | 备选（不使用 Cloudflare 时的兜底方案） |

## 3. 推荐方案 B 的 6 条理由

1. **适合静态站**：Cloudflare Pages 原生托管纯 HTML/CSS/JS 静态站，本项目无框架、无后端，直接上传或连仓库即可，零改造。
2. **支持私密**：Cloudflare Access 在 CDN 边缘拦截所有请求，未通过身份验证的用户连页面 HTML 都拿不到，不是「页面内遮挡」。
3. **可只放行 Simon 邮箱**：Policy 支持按邮箱地址精确 Include，名单里只放 Simon 一个邮箱，其他人一律拒绝。
4. **无需开发登录系统**：邮箱 OTP / Google 登录页、会话签发、过期校验全部由 Cloudflare 托管，本项目不新增任何登录代码，杜绝前端 JS 假登录。
5. **比公共 Pages 更安全**：公共 GitHub Pages 任何知道链接的人都能访问；方案 B 有真实身份验证 + 访问日志 + 即时撤销，安全等级完全不同。
6. **可继续用 GitHub private repo 做代码源**：Cloudflare Pages 支持连接私有仓库自动部署，代码保持 PRIVATE，站点保持私密，两者互不冲突。

## 4. 访问逻辑（文本流程图）

```text
用户打开私密链接
        │
        ▼
Cloudflare Access 拦截请求（未验证用户看不到任何页面内容）
        │
        ▼
输入被允许的邮箱（Policy 名单内仅有 Simon 邮箱）
        │
        ▼
完成验证：邮箱一次性验证码（OTP）/ Google 登录
        │
        ▼
验证通过，Cloudflare 签发会话 Cookie
        │
        ▼
进入 Dashboard（看板页面正常加载）
        │
        ▼
后续访问在会话有效期内直达；会话过期后需重新验证

非授权用户：输入非名单邮箱 → 收不到验证码 / 直接被拒绝
           → 始终停留在 Access 验证页，无法访问 Dashboard
```

## 5. 方案 B 操作清单（Sera 照做即可）

> 目标产出：一个 `https://<项目名>.pages.dev` 私密链接，仅 Simon 邮箱可通过验证。

1. **注册 / 登录 Cloudflare**：打开 https://dash.cloudflare.com 注册并登录。两种方式任选：
   - 有自有域名：Add site 添加站点并按提示接入；
   - 无自有域名：直接用 Pages Direct Upload，Cloudflare 会分配 `*.pages.dev` 域名，无需买域名。
2. **部署静态站到 Cloudflare Pages**（二选一）：
   - **连接 Git 仓库**：Workers & Pages → Create → Pages → Connect to Git，授权 Cloudflare 访问 GitHub **private** 仓库 `78tyih/htx-otc-progress-hub`，分支选 `main`，构建命令留空、输出目录填 `/`（纯静态无需构建）；
   - **直接上传**：Create → Pages → Upload assets，把项目目录整个拖拽上传（Direct Upload）。
3. **配置 Access 应用**：进入 **Zero Trust 控制台**（https://one.dash.cloudflare.com ）→ **Access → Applications → Add an application** → 选 **Self-hosted**，Application domain 填上一步 Pages 分配的域名（如 `<项目名>.pages.dev`）。
4. **创建 Policy**：在该应用下 Add a policy → **Include** 规则选择 **Emails**，值填 **Simon 邮箱**（只此一个）→ Save。确认没有多余的 Allow 规则。
5. **开启登录方式**：Zero Trust → Settings → Authentication → **Login methods**，开启 **One-time PIN**（邮箱一次性验证码）；如 Simon 习惯用 Google 账号，可叠加开启 **Google**。
6. **保存后测试**：
   - 用**无痕窗口**打开链接 → 应被 Cloudflare Access 拦截并要求验证，而不是直接看到看板；
   - 输入一个**不在名单内的邮箱** → 应收不到验证码 / 被直接拒绝；
   - 输入 Simon 邮箱 → 收到验证码，验证通过后可正常打开看板（顺便检查 Day/Night 主题与数据加载正常）。
7. **交付链接**：把链接发给 Simon，并**单独告知**：打开链接后需要输入他自己邮箱收到的验证码才能进入（这同时证明链接没有发错人）。

> 后续每周更新：若用 Git 连接方式，`git push` 到 `main` 即自动重新部署；若用 Direct Upload，重新拖拽上传一次即可。Access 配置不受影响。

## 6. 方案 C 备选操作要点（不使用 Cloudflare 时）

### 6.1 Render / Railway 静态站 + Basic Auth

1. 在 Render（Static Site 需配合一个简单的 Basic Auth 代理，或使用 Render Web Service 跑一个最小静态服务器）或 Railway 部署本项目。
2. 在平台后台配置**环境变量**（严禁写进代码或 git）：
   - `BASIC_AUTH_USER=simon`
   - `BASIC_AUTH_PASSWORD=<由 Sera 单独告知 Simon 的密码>`
3. 静态服务器在返回任何文件前校验 Basic Auth 头，校验失败返回 `401`。
4. 密码只通过平台环境变量注入，本地开发可用 `.env`（`.env` 必须进 `.gitignore`，仓库内只放 `.env.example` 模板）。
5. 轮换密码 = 改环境变量并重新部署，无需改代码。

### 6.2 自建 VPS + nginx Basic Auth（简述）

1. 安装 nginx，把项目文件放到站点根目录（如 `/var/www/htx-otc-progress-hub`）。
2. 生成密码文件：`htpasswd -c /etc/nginx/.htpasswd simon`（密码文件放 web 根目录之外）。
3. 站点配置中加入：

   ```nginx
   location / {
       auth_basic "Restricted";
       auth_basic_user_file /etc/nginx/.htpasswd;
       try_files $uri $uri/ =404;
   }
   ```

4. 用 Let's Encrypt（certbot）签发并自动续期 HTTPS 证书，`nginx -t` 校验后 reload。
5. 改密码 = 重新执行 `htpasswd`，无需改站点文件。

> 无论 6.1 还是 6.2，密码都**只进平台环境变量 / 服务器本地密码文件**，严禁出现在前端代码、git 提交历史、聊天截图中。

## 7. 部署后检查清单

每次部署或变更访问配置后，逐项确认：

- [ ] 无痕窗口打开链接，**必须先通过身份验证**才能看到看板（直接打开看不到任何页面内容）。
- [ ] 输入**非名单邮箱**被拒绝 / 收不到验证码，无法进入。
- [ ] Simon 邮箱验证通过后可正常访问，Day/Night 主题、搜索、筛选、Export 均正常。
- [ ] 页面与仓库中**无真实客户信息**（无真实客户姓名、HTX UID、TG 用户名/路径、银行账户、邮箱、电话——同事名 Sera/Simon/静格/Oscar/Kimi 除外），客户均为 Client-001 等占位编号。
- [ ] 等待会话过期（或手动清除 Cookie）后重新打开链接，**需重新验证**才能进入。
- [ ] Access Policy 名单复核：仍只有 Simon 一个邮箱。
- [ ] 任何密码 / Token 只存在于平台环境变量或本地 `.env`，仓库内无真实密钥。

---

> 本方案与 `docs/05_access_control.md` 配套使用；安全红线与数据分级以 `SECURITY.md` 为准。
