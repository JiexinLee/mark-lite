# 协同服务实现状态

## 文档目的

本文档记录当前文档协同服务已经落地的实现、运行方式与明确未覆盖的范围，方便后续 AI 或开发者接手时不用重新梳理 `apps/collab` 的现状。

## 当前已落地能力

当前 `apps/collab` 已不再是占位入口，而是一个可独立启动、带 SQLite 持久化的 Hocuspocus WebSocket 服务。

当前已经落地的能力包括：

- `apps/collab` 可通过 `pnpm --filter collab dev` 启动独立协同服务进程
- 服务默认监听 `ws://localhost:1234`
- 支持通过环境变量 `PORT` 覆盖默认端口
- `PORT` 解析已做严格校验，只有 `1..65535` 的整数会被接受；非法值会启动失败并输出明确错误
- 服务启动成功后会输出监听地址日志
- 服务启动成功后会输出 SQLite 持久化路径日志
- 服务在连接和断开时会输出基础日志，并记录 `documentName`
- 已接入 `@hocuspocus/extension-sqlite`，按 `documentName` 持久化整份 Y.Doc 状态
- 默认数据库路径为 `apps/collab/data/collaboration.sqlite`
- 支持通过 `COLLAB_DATABASE_PATH` 覆盖数据库路径
- 服务启动前会自动创建数据库所在目录
- 同一 `documentName` 的客户端会共享同一份 Yjs 文档，不同 `documentName` 之间隔离
- 服务重启后，同一房间的 Yjs 状态可从 SQLite 恢复

## 当前实现边界

当前 `apps/collab` 已覆盖“协同传输层 + 第一版 SQLite 持久化 + WebSocket 鉴权”。

**注意**：这里的 JWT 仅用于 WebSocket 连接，**不是** HTTP 登录会话。用户登录仍通过 `apps/web` 的 HttpOnly Cookie（iron-session，`ai-doc-session`）完成；文档页在已登录前提下请求 `POST /api/collaboration/token`（带 Cookie），取得短期协同 JWT 后再连接 collab。`onAuthenticate` 校验该 JWT、解析房间名，并通过共享 `AUTH_DATABASE_PATH` 判断 read 权限。详见 `docs/auth/implementation-status.md`。

服务端仍不理解 BlockNote block 树或 metadata 的业务含义，只保存和恢复整份 Yjs 文档状态；协同层暂不拦截 viewer 的 Yjs 写入（已知边界，见 `docs/documents/implementation-status.md`）。

当前 `packages/collaboration` 已经完成协议层落地，不再是占位包。它提供房间命名、用户、awareness、连接状态、presence 和客户端配置等共享类型与纯函数，但不创建协同运行时。

当前 `packages/editor` 已经支持接收外部协同配置，并能将 provider、Yjs fragment 和平台协同用户适配为 BlockNote collaboration option。它不创建 Y.Doc 或 HocuspocusProvider。

明确未落地的内容包括：

- 协同层还没有 viewer 写保护（Web/HTTP 层已限制）
- 还没有版本历史、快照或回滚
- 还没有多实例共享存储、备份或迁移策略
- awareness / presence 仍不持久化

已经由 Web 侧落地的客户端能力包括：

- `DocumentPageContent` 统一调用 `useDocumentCollaboration()`，在文档详情与权限加载完成后再启用协同
- `apps/web` 文档页会创建 `Y.Doc` 和 `HocuspocusProvider`
- `EditorShell` 在 `isEditorCollaborationReady` 为真后通过 `DocumentEditorLazy` 挂载 `DocumentEditor`
- `apps/web` 会把 provider、正文 fragment 和协同用户传给 `DocumentEditor`
- 正文使用 `Y.XmlFragment("document-store")`
- 文档标题 metadata 使用 `Y.Map("document-metadata")`
- 连接状态和房间名会展示在文档页右侧卡片中
- 文档页 `PresenceBar` 会展示真实在线成员和连接状态

## 运行方式

### 启动命令

```bash
pnpm --filter collab dev
```

### 默认地址

```text
ws://localhost:1234
```

### 覆盖端口示例

```bash
PORT=4321 pnpm --filter collab dev
```

### 覆盖数据库路径示例

```bash
COLLAB_DATABASE_PATH=./data/collaboration.sqlite pnpm --filter collab dev
```

相对路径相对 `apps/collab` 包根目录解析。详见 `docs/collaboration/persistence-implementation.md`。

### 非法端口行为

以下值会被直接拒绝，并在启动时输出错误：

- `PORT=1234abc`
- `PORT=1234.5`
- `PORT=0`
- `PORT=65536`

## 当前模块落点

当前实现主要集中在以下文件：

- `apps/collab/src/index.ts`
- `apps/collab/src/config.ts`
- `apps/collab/src/persistence.ts`
- `apps/collab/src/server.ts`
- `apps/collab/src/auth.ts`
- `apps/collab/src/permissions.ts`
- `apps/collab/src/auth-database.ts`
- `apps/collab/package.json`
- `apps/collab/tsconfig.json`
- `apps/collab/data/.gitkeep`
- `apps/collab/.env.local.example`

职责拆分如下：

- `src/index.ts` 负责启动入口、启动前创建数据目录与启动失败处理
- `src/config.ts` 负责运行时 host、port、公开地址和数据库路径解析
- `src/persistence.ts` 负责创建数据目录和构造 SQLite extension
- `src/auth.ts` 负责校验协同 JWT
- `src/permissions.ts` 负责解析房间名并查库判断 read 权限
- `src/auth-database.ts` 负责初始化共享业务数据库连接
- `src/server.ts` 负责 Hocuspocus server 配置、`onAuthenticate`、持久化扩展和连接生命周期日志

## 当前连接约定

当前房间命名规则已经在 `packages/collaboration` 中固化为共享协议。客户端和服务端后续都应复用该包，不要手写字符串拼接。

只有 `documentId` 时：

```text
document:{documentId}
```

同时存在 `workspaceId` 和 `documentId` 时：

```text
workspace:{workspaceId}:document:{documentId}
```

`documentId` 和 `workspaceId` 当前都不能包含 `:`，因为 `:` 是房间名结构分隔符。`createDocumentRoomName()` 会拒绝这类输入，`parseDocumentRoomName()` 会对非法房间名返回 `null`。

服务端当前不会强制校验这个格式，而是直接使用客户端传入的 `documentName` 作为房间标识和持久化 key。

## 日志约束

当前日志只用于本地开发观察，约束如下：

- 会输出启动地址
- 会输出 SQLite 持久化路径
- 会输出连接和断开时的 `documentName`
- 不会输出 token
- 不会输出文档正文
- 不应被视为审计日志或生产日志方案

## 验证记录

当前实现至少已经通过以下检查：

- `pnpm --filter collab typecheck`
- `pnpm --filter collab build`
- `pnpm --filter collab dev`
- `pnpm -r typecheck`
- 使用非法端口值启动时会明确失败并输出错误原因
- 修改正文和标题后重启 collab 可恢复
- 不同 `documentName` 之间数据隔离
- 删除 sqlite 文件后服务可重新创建空库

## 协同鉴权环境变量

协同 JWT 与 Cookie 会话使用不同密钥与变量：

```text
# apps/web：HTTP 登录会话（Cookie）
SESSION_SECRET=<至少32字符>

# apps/web 签发、apps/collab 校验：协同 WebSocket JWT
COLLAB_TOKEN_SECRET=<与 web 相同，可与 SESSION_SECRET 相同>
COLLAB_TOKEN_TTL_SECONDS=300

# 权限查库（web 与 collab 共用）
AUTH_DATABASE_PATH=../web/data/users.sqlite   # collab 侧示例路径
```

详见 `apps/collab/.env.local.example` 与 `apps/web/.env.local.example`。

## 后续衔接建议

后续协同能力应按以下顺序继续推进：

1. 视需要在 collab 层补 viewer 写保护
2. 将首页 `recentDocuments` 接入业务文档 API
3. 将首页 mock presence 逐步替换为真实 awareness 数据
4. 补齐版本能力与 AI 联动所需的协同数据边界

## 相关文档

- `docs/documents/implementation-status.md`
- `docs/collaboration/persistence-implementation.md`
- `docs/architecture/frontend-handoff.md`
- `docs/collaboration/protocol-package-status.md`
- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/presence-implementation.md`
- `docs/editor/collaboration-config.md`
- `docs/editor/evolution-plan.md`
