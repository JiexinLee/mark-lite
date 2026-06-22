# 认证实现状态

## 文档目的

本文档记录 `08. 登录注册与系统角色需求文档` 当前已经落地到 `apps/web`、`packages/auth` 和 `packages/database` 的代码事实。

## 当前已落地能力

- `/register` 注册页支持用户名、密码、确认密码和系统角色选择
- `/login` 登录页接入真实认证 API，不再依赖硬编码测试账号
- `POST /api/auth/register` 创建用户并自动建立会话
- `POST /api/auth/login` 校验密码哈希并建立会话
- `POST /api/auth/logout` 清除服务端会话
- `GET /api/auth/me` 返回当前登录用户
- Workspace 路由通过 `CurrentUserProvider` + `/me` 做登录保护
- 协同用户从真实 `CurrentUser.id` 转换，刷新后 ID 保持稳定
- 系统角色支持 `member`、`admin`、`super_admin`

## 核心模块

- `packages/auth/src/*` — 角色、校验、密码哈希、会话类型
- `packages/database/src/*` — SQLite 用户表与 CRUD
- `apps/web/src/lib/auth-session.ts` — iron-session 封装
- `apps/web/src/lib/auth-api.ts` — 注册 / 登录 / 退出 / 当前用户领域逻辑
- `apps/web/src/lib/auth-client.ts` — 浏览器端 API 封装
- `apps/web/src/hooks/use-current-user.ts` — 当前用户 hook
- `apps/web/src/components/auth/*` — 登录、注册表单与 Provider

## 数据存储

### 用户数据库

- 默认路径：`apps/web/data/users.sqlite`
- 可通过 `AUTH_DATABASE_PATH` 覆盖（相对 `apps/web` 进程 cwd）
- 运行时 sqlite 文件已被 `.gitignore` 忽略

### 会话（HTTP 登录态，不是 JWT）

登录、注册、退出与所有文档 HTTP API 的「当前用户是谁」均通过 **iron-session + HttpOnly Cookie** 识别，**不使用 JWT 作为登录会话**。

- Cookie 名：`ai-doc-session`
- 技术：`iron-session`（会话数据加密后写入 Cookie，主要存 `userId`）
- 浏览器端 fetch 需 `credentials: "include"` 才会自动带上 Cookie
- 本地开发可通过 `SESSION_SECRET` 配置加密密钥
- 未配置时开发环境使用内置 dev secret；生产环境必须设置至少 32 字符的 `SESSION_SECRET`

### 与协同 JWT 的区分

项目里另有 **协同 WebSocket 专用** 的短期 JWT（`jose` 签发），与上面的 Cookie 会话是两套机制：

| 场景 | 机制 | 传递方式 |
| --- | --- | --- |
| 登录 / 注册 / `/api/auth/me` | iron-session | HttpOnly Cookie `ai-doc-session` |
| `/api/documents/*` 等 HTTP API | 读取 Cookie 会话 | 浏览器自动带 Cookie |
| `POST /api/collaboration/token` | 先校验 Cookie 会话，再签发协同 JWT | 请求带 Cookie；响应体返回 `{ token }` |
| `apps/collab` WebSocket 连接 | 校验协同 JWT + 查库 read 权限 | `HocuspocusProvider` 的 `token` 参数 |

协同 JWT 存在的原因：web（`:3000`）与 collab（`:1234`）跨端口，Cookie 不便直接用于 WebSocket 鉴权。详见 `docs/documents/implementation-status.md` 中「协同 WebSocket 鉴权」一节。

### 密码

- 使用 `bcryptjs` 哈希存储
- `passwordHash` 不会返回给客户端

## 本地验证步骤

1. 启动 Web：`pnpm --filter web dev`
2. 打开 `http://localhost:3000/register`
3. 注册 `member` 用户，确认自动进入 Workspace
4. 退出登录，使用错误密码登录，确认提示「用户名或密码错误。」
5. 使用正确密码登录，刷新页面后仍保持登录态
6. 分别注册 `admin`、`super_admin` 用户，确认顶部角色展示正确
7. 进入文档页，确认 Presence 使用真实用户 ID

## 输入校验与并发

- `register` / `login` route 会先解析 JSON body；非法 JSON 返回 400「请求体格式不正确。」
- `validateRegisterInput` / `validateLoginInput` 接收 `unknown`，对字段类型做守卫后再校验业务规则
- 注册时若并发插入触发 `users.username` 唯一约束，会映射为 409「用户名已存在。」，而不是 500

## 已知边界

- `apps/web/src/lib/mock-auth.ts` 仍保留为 legacy 调试入口，主路径不再使用
- 首页协作快照与活动记录仍使用 mock；侧边栏/文档页/首页主 CTA 与最近文档已接入真实文档 API（见 `docs/documents/implementation-status.md`）
- 协同 WebSocket 使用短期 JWT（与 Cookie 会话无关）；HTTP 登录态始终是 Cookie
- `/api/ai/editor` 仍未要求登录
- 注册时允许选择高权限角色，仅适用于 MVP 本地验证

## 技术说明

用户库当前使用 Node.js 内置 `node:sqlite`（`DatabaseSync`），避免 `better-sqlite3` 在部分 Node 版本上的 native 编译问题。要求 Node.js 22+。
