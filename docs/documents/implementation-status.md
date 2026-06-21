# 文档权限与协作者管理实现状态

## 文档目的

本文档记录 `09. 文档权限与协作者管理需求文档` 当前已经落地到 `packages/database`、`packages/auth`、`apps/web` 和 `apps/collab` 的代码事实，方便后续 AI 或开发者接手时不用重新梳理业务文档表、HTTP API、权限判断与协同鉴权链路。

## 当前已落地能力

### 数据层

- `documents` 表：`id`、`title`、`owner_id`、`created_at`、`updated_at`
- `document_members` 表：`document_id`、`user_id`、`role`、`created_at`、`updated_at`，联合主键
- 创建文档与 owner 成员写入在同一 SQLite 事务中完成，任一步失败整体回滚
- 删除文档时级联删除 `document_members`
- `super_admin` 列表查询走 `listAllDocuments` 分支；普通用户走 `listDocumentsForUser`

### 权限内核（`packages/auth`）

- `document-roles.ts`：`DocumentRole`、`DOCUMENT_ROLES`、角色标签
- `document-permissions.ts`：`canReadDocument`、`canEditDocument`、`canDeleteDocument`、`canManageDocumentMembers`、`resolveDocumentPermissions`
- `document-types.ts`：`DocumentListItem`、`DocumentDetail`、`DocumentMemberView`、`DocumentPermissions`
- 规则：`super_admin` 兜底 owner 级权限；`admin` 不兜底；owner 保护在成员 API 层额外校验

### HTTP 认证方式

文档相关 HTTP API（含 `/api/documents/*`）**不接收 Bearer JWT**。它们通过 **HttpOnly Cookie 会话**（`ai-doc-session`，iron-session）识别当前用户，与 08 认证阶段一致。

`POST /api/collaboration/token` 同样先读取 Cookie 会话，确认用户已登录且对文档有 read 权限后，才在响应体中签发 **仅用于 WebSocket** 的短期协同 JWT。不要把协同 token 误当成登录 token。

### HTTP API（`apps/web`）

| 接口 | 说明 |
| --- | --- |
| `POST /api/documents` | 创建文档 + owner 成员，默认标题「未命名文档」 |
| `GET /api/documents` | 登录用户可见文档列表，含 `currentUserRole` |
| `GET /api/documents/:id` | 文档详情 + `permissions` |
| `PATCH /api/documents/:id` | 修改标题（需 edit 权限） |
| `DELETE /api/documents/:id` | 删除文档（需 delete 权限） |
| `GET /api/documents/:id/members` | 成员列表（需 read 权限） |
| `POST /api/documents/:id/members` | 按用户名添加 editor/viewer |
| `PATCH /api/documents/:id/members/:userId` | 修改成员角色（禁止改 owner） |
| `DELETE /api/documents/:id/members/:userId` | 移除成员（禁止移除 owner） |
| `POST /api/collaboration/token` | 签发短期协同 JWT（需 read 权限） |

错误约定：

- `403`：权限不足（统一文案「你没有权限执行此操作。」）
- `404`：文档 / 用户 / 成员不存在
- `400`：非法 body 或 role

### Web 客户端

- `documents-client.ts`：封装带 `credentials: "include"` 的 fetch
- `use-documents.tsx`：`DocumentsProvider` 管理侧边栏文档列表
- `workspace-sidebar.tsx`：列表读 API，「创建文档」调 `POST /api/documents` 后跳转
- `workspace-topbar.tsx`：命令面板文档列表读 API
- `document-page-content.tsx`：进入时 `GET /api/documents/:id`；403/404 专用 UI
- `editor-shell.tsx`：`editable={permissions.canEdit}`；标题只读；viewer 隐藏保存；owner/editor 标题节流 PATCH
- `document-role-badge.tsx`、`document-access-denied.tsx`、`document-member-dialog.tsx`

### 协同 WebSocket 鉴权（短期 JWT，非登录会话）

协同连接 **不使用 Cookie**，也 **不替代** Cookie 登录态：

1. 浏览器已登录（Cookie 有效）
2. 文档页调用 `POST /api/collaboration/token`（请求仍带 Cookie）
3. Web 校验 read 权限后签发短期 JWT（默认 5 分钟，`COLLAB_TOKEN_SECRET`）
4. `HocuspocusProvider` 将 JWT 作为 `token` 传给 `ws://localhost:1234`
5. `apps/collab` 的 `onAuthenticate` 校验 JWT → 解析房间名 → 查库判断 read 权限

collab 与 web 共用 `AUTH_DATABASE_PATH`（业务权限库）和 `COLLAB_TOKEN_SECRET`。登录会话密钥为 `SESSION_SECRET`（Cookie 加密），二者可分开配置。

HTTP 会话与协同 JWT 的完整对比见 `docs/auth/implementation-status.md`。

## 核心模块

```
packages/database/src/documents.ts
packages/database/src/document-members.ts
packages/auth/src/document-*.ts
apps/web/src/lib/documents-api.ts
apps/web/src/lib/documents-client.ts
apps/web/src/lib/collab-token.ts
apps/web/src/app/api/documents/**
apps/web/src/app/api/collaboration/token/route.ts
apps/collab/src/auth.ts
apps/collab/src/permissions.ts
apps/collab/src/auth-database.ts
```

## 环境变量

```text
# HTTP Cookie 会话（仅 apps/web）
SESSION_SECRET=<至少32字符>                      # 加密 ai-doc-session Cookie

# 业务库与协同 token（apps/web 签发，apps/collab 校验）
AUTH_DATABASE_PATH=./data/users.sqlite          # web 默认；collab 默认 ../web/data/users.sqlite
COLLAB_TOKEN_SECRET=<至少32字符>                 # 协同 JWT 签名；dev 可与 SESSION_SECRET 相同
COLLAB_TOKEN_TTL_SECONDS=300                    # 默认 5 分钟
```

详见 `apps/web/.env.local.example` 与 `apps/collab/.env.local.example`。

## 本地验证步骤

### 启动服务

```bash
pnpm --filter web dev
pnpm --filter collab dev
```

### 多用户验收（对照 PRD 第 13 章）

准备账号：`owner-A`（member）、`editor-B`（member）、`viewer-C`（member）、`super-S`（super_admin）、`admin-X`（admin）、`stranger-D`（member，非成员）。

| # | 场景 | 关键验证点 |
| --- | --- | --- |
| 13.1 | 创建文档 | A 创建后 `ownerId` 正确，可编辑、可管理成员 |
| 13.2 | 列表过滤 | A/B 各建文档，互不可见对方文档 |
| 13.3 | editor | A 加 B 为 editor，B 可编辑不可管理成员 |
| 13.4 | viewer | A 加 C 为 viewer，Web 只读 + `PATCH` 返回 403 |
| 13.5 | 无权限 | D 直链访问 → 403 + WS 拒绝 |
| 13.6 | owner 保护 | 不可自降级/自移除/添加第二 owner |
| 13.7 | super_admin | S 非成员仍可读写删管 |
| 13.8 | admin 非兜底 | X 非成员 → 403 + WS 拒绝 |
| 13.9 | WS 鉴权 | B 可连；D 被拒；错误文案正确 |
| 13.10 | 协同回归 | 双浏览器 editor 同步；重启 collab 恢复；登录不受影响 |

### 质量检查

```bash
pnpm typecheck
pnpm lint
```

## 已知边界

- **viewer 协同层写保护**：Web `editable={false}` + HTTP 403 已落地；viewer 连上 WS 后理论上仍可推送 Yjs update，第一版不在 collab 层拦截写入
- **标题双源**：业务 `documents.title` 与 Yjs metadata 可能短暂不一致；列表读业务 title，owner/editor 改标题时节流 PATCH
- **删除文档**：不删除 `collaboration.sqlite` 中对应 Yjs room 数据（PRD 允许）
- **首页 recentDocuments**：协作快照与活动记录仍使用 mock；最近文档与主 CTA 已接入 `useDocuments()` API
- **`mock-documents.tsx`**：遗留文件，主路径（侧边栏/文档页/首页）已退出；首页最近文档与主 CTA 已接 API
- **权限变更生效**：协同 token 短期有效；成员权限变更在重连后生效
- **注册选高权限角色**：MVP 本地验证行为，继承自 08 认证阶段

## 相关文档

- `docs/auth/implementation-status.md`
- `docs/collaboration/implementation-status.md`
- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/architecture/frontend-handoff.md`
