# 协同文档持久化实现交接

## 文档目的

本文档记录 `07. 协同文档持久化需求文档` 当前已经落地到 `apps/collab` 的代码事实，说明 Yjs 文档状态如何写入 SQLite、服务重启后如何恢复，以及它和 Web 客户端、业务文档 API 的关系。

## 当前结论

`apps/collab` 已从纯内存模式升级为 **SQLite 持久化模式**。同一 `documentName` 的正文 fragment 和标题 metadata 共享同一份 Y.Doc 状态，由 Hocuspocus SQLite 扩展自动保存和恢复。

Web 客户端、editor 包和 collaboration 协议包 **不需要感知持久化细节**，接入方式保持不变。

## 已落地能力

当前已经落地：

- `apps/collab` 接入 `@hocuspocus/extension-sqlite@^3.4.0`
- 默认数据库路径为 `apps/collab/data/collaboration.sqlite`
- 支持通过环境变量 `COLLAB_DATABASE_PATH` 覆盖数据库路径
- 服务启动前自动创建数据库所在目录
- 启动日志输出 WebSocket 监听地址和 SQLite 持久化路径
- 以 Hocuspocus `documentName` 作为持久化 key
- 客户端连接已有房间时，从 SQLite 加载 Yjs 状态
- 文档更新后，自动将整份 Y.Doc 状态写入 SQLite
- 正文 `Y.XmlFragment("document-store")` 和标题 `Y.Map("document-metadata").title` 随整份 Y.Doc 一起持久化
- awareness / presence 仍只在内存中，不持久化
- SQLite 运行时文件已被 `.gitignore` 忽略

## 关键文件

当前实现主要落在：

- `apps/collab/src/config.ts` — 数据库路径配置
- `apps/collab/src/persistence.ts` — 目录创建与 SQLite extension 工厂
- `apps/collab/src/server.ts` — 注册 Hocuspocus extensions
- `apps/collab/src/index.ts` — 启动入口与持久化日志
- `apps/collab/data/.gitkeep` — 保留运行时数据目录结构
- `apps/collab/package.json` — 持久化依赖
- `.gitignore` — 忽略 sqlite 运行时文件

## 架构与数据流

```text
apps/web
  Y.Doc + HocuspocusProvider
    -> WebSocket (documentName)

apps/collab
  Hocuspocus Server
    -> SQLite Extension
      -> onLoadDocument / onStoreDocument
        -> apps/collab/data/collaboration.sqlite
```

持久化的是 **整份 Yjs 文档状态**，不是 BlockNote JSON、HTML 或 Markdown。服务端不需要理解 BlockNote schema，也不需要单独解析 `document-store` 或 `document-metadata`。

当前同一篇文档的协同结构：

```text
Y.Doc
  ├─ Y.XmlFragment("document-store")
  │   └─ BlockNote 正文协同
  └─ Y.Map("document-metadata")
      └─ title
```

## 配置约定

### 默认数据库路径

```text
apps/collab/data/collaboration.sqlite
```

未设置 `COLLAB_DATABASE_PATH` 时使用该路径。路径相对 `apps/collab` 包根目录解析。

### 环境变量覆盖

```bash
COLLAB_DATABASE_PATH=./data/collaboration.sqlite pnpm --filter collab dev
```

路径解析规则：

| 输入 | 解析方式 |
|------|----------|
| 未设置 | `apps/collab/data/collaboration.sqlite` |
| 绝对路径 | 原样使用 |
| 相对路径 | 相对 `apps/collab` 包根目录 |

注意：`pnpm --filter collab dev` 时进程 `cwd` 已经是 `apps/collab`。自定义相对路径应写 `./data/collaboration.sqlite`，而不是 `./apps/collab/data/collaboration.sqlite`。

PRD 中 repo-root 风格示例 `./apps/collab/data/collaboration.sqlite` 不适用于当前 pnpm filter 启动方式。

### 启动日志

```text
[collab] Hocuspocus server listening on ws://localhost:1234
[collab] persistence enabled: .../apps/collab/data/collaboration.sqlite
```

目录创建失败或数据库路径为空时，服务启动会直接失败，不会静默回退到内存模式。

## 模块职责

```text
apps/collab
  接入 Hocuspocus SQLite 持久化，按 documentName 保存和恢复 Yjs 文档状态

apps/web
  继续创建 Y.Doc、HocuspocusProvider，连接 apps/collab

packages/editor
  继续负责 BlockNote 正文协同适配，不感知数据库

packages/collaboration
  继续负责房间名、用户、状态、presence 等共享协议

packages/database
  已承接业务 documents / document_members 表与权限相关 CRUD
```

## 与业务持久化的关系

协同持久化与业务文档 API 不是同一层能力。

业务文档语义：

```text
documents.title / document_members
  -> users.sqlite（AUTH_DATABASE_PATH）
  -> GET/PATCH /api/documents/*
```

协同持久化语义：

```text
Yjs update
  -> Hocuspocus
  -> collaboration.sqlite
```

正文和 Y.Map 标题由 `apps/collab` **自动持久化**，不需要手动保存。owner/editor 改标题时节流 `PATCH /api/documents/:id` 同步业务 title。

## 与业务文档列表的关系

SQLite 协同持久化不等于业务文档数据库。

当前侧边栏与首页最近文档读业务 API：

```text
GET /api/documents
  -> users.sqlite
  -> sidebar / homepage
```

协同 SQLite 中保存的是：

```text
documentName
  -> Yjs document state
```

因此可能出现以下现象，属于当前阶段已知边界：

1. 文档页 metadata title 已从协同 SQLite 恢复为新标题
2. 侧边栏/首页业务 title 尚未 PATCH 同步，仍显示旧值
3. 删除业务文档不会清理 collaboration.sqlite 中对应 room 数据

这不代表协同持久化失败。

## 与 roomName 的关系

Web 文档页当前房间名格式：

```text
workspace:default-workspace:document:{documentId}
```

Hocuspocus 持久化以 `documentName` 作为 key。修改 `createDocumentRoomName()` 规则会导致旧数据无法自动迁移，因此不应随意调整房间命名协议。

## 运行方式

### 启动命令

```bash
pnpm --filter collab dev
```

或联调：

```bash
pnpm dev:all
```

### 停止服务

```bash
pnpm stop:collab
```

## 本地验证方式

所有持久化验收必须以 **重启 `apps/collab`** 为核心，不能仅用页面刷新代替。页面刷新后恢复内容，只能说明内存态仍可加载，不足以单独证明 SQLite 生效。

### 正文持久化

1. 启动 `pnpm dev:all`
2. 打开任意文档，修改正文
3. 执行 `pnpm stop:collab`
4. 重新启动 collab
5. 重新打开同一文档
6. 正文应恢复为修改后的内容

### 标题持久化

1. 修改文档标题
2. 停止并重启 `apps/collab`
3. 重新打开同一文档
4. 标题应恢复；SQLite 中已有 title 时，Web 端不会再用业务 `initialTitle` 覆盖

### 房间隔离

1. 分别修改文档 A 和文档 B 的正文与标题
2. 重启 `apps/collab`
3. 分别重新打开两篇文档
4. 内容互不污染

### 空库重建

1. 删除 `apps/collab/data/collaboration.sqlite`
2. 重启 collab
3. 服务应正常启动，首次打开文档为空文档

### 辅助确认

重启前可检查 SQLite 是否已有记录：

```bash
sqlite3 apps/collab/data/collaboration.sqlite "SELECT name FROM documents;"
```

## 已知边界

当前仍未实现：

- 列表层与 Y.Map metadata 的实时订阅同步
- 删除业务文档时清理协同 SQLite 中的 orphan room
- 版本历史、快照、回滚
- 协同数据导出为 BlockNote JSON / HTML / Markdown
- 多 `apps/collab` 实例共享协同存储
- 备份、迁移、压缩和清理策略
- presence 在线成员持久化

HTTP 登录（Cookie 会话）、文档权限校验、业务文档表与协同 WebSocket JWT 鉴权已落地。Cookie 与协同 JWT 的区分见 `docs/auth/implementation-status.md`；文档权限见 `docs/documents/implementation-status.md`。

当前 SQLite 方案只面向本地课程演示和单进程协同服务，不是最终生产存储方案。

## 验证记录

最近一次实现后已通过：

```bash
pnpm --filter collab typecheck
pnpm --filter collab build
pnpm --filter web typecheck
```

并验证了：

- 服务启动日志包含持久化路径
- 修改正文和标题后重启 collab 可恢复
- 不同 `documentName` 之间数据隔离
- 删除 sqlite 文件后服务可重新创建空库
- `collaboration.sqlite` 被 git 忽略，`apps/collab/data/.gitkeep` 可提交

## 相关文档

- `docs/collaboration/implementation-status.md`
- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/protocol-package-status.md`
- `docs/editor/collaboration-config.md`
- `docs/architecture/frontend-handoff.md`
