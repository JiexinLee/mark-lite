# Web 文档页协同客户端实现交接

## 文档目的

本文档记录 `04. Web 文档页协同客户端需求文档` 当前已经落地到 `apps/web` 的代码事实，方便后续 AI 或开发者接手文档页协同、presence、持久化、鉴权和版本能力时不用重新梳理客户端运行时边界。

当前实现已经让 Web 文档页创建真实协同运行时，并把 provider、fragment 和协同用户传给 `DocumentEditor`，同时把真实在线成员展示到 `PresenceBar`。这份文档只描述 Web 客户端侧；服务端持久化、WebSocket 鉴权与文档权限见 `docs/collaboration/implementation-status.md` 与 `docs/documents/implementation-status.md`。

## 当前结论

`apps/web` 文档页已经接入真实协同客户端运行时。它不再只是把 editor 包当成本地编辑器使用，而是在文档页中创建 `Y.Doc`、`HocuspocusProvider`、BlockNote 正文 fragment 和文档 metadata map，再把正文协同配置传给 `DocumentEditor`。

当前已经实现的是“本地课程演示可用的 Web 协同客户端”。文档页 presence 已接入真实 awareness；协同 Yjs 状态已由 `apps/collab` 持久化到 SQLite。

**认证说明**：HTTP 登录与文档 API 使用 **Cookie 会话**（iron-session），不是 JWT。仅连接协同 WebSocket 时，在 **已登录**（Cookie 有效）前提下请求 `POST /api/collaboration/token` 获取 **短期协同 JWT**，再由 `apps/collab` 在 `onAuthenticate` 中校验。详见 `docs/auth/implementation-status.md`。

## 已落地能力

当前已经落地：

- `apps/web` 安装并使用 `@hocuspocus/provider` 和 `yjs`
- `apps/web` 依赖 `@ai-doc-platform/collaboration` 复用房间命名、用户和连接状态协议
- `useDocumentCollaboration()` 根据 `documentId`、当前登录用户（`CurrentUser`）和默认 workspace 创建协同运行时
- 创建 `HocuspocusProvider` 前先请求 `POST /api/collaboration/token`（fetch 带 `credentials: "include"` 以携带 Cookie 会话），将返回的协同 JWT 作为 `token` 传入
- 房间名通过 `createDocumentRoomName()` 生成，当前格式为 `workspace:default-workspace:document:{documentId}`
- 协同地址来自 `NEXT_PUBLIC_COLLAB_URL`，未配置时回退到 `ws://localhost:1234`
- 文档页创建一个 `Y.Doc`
- 正文协同使用同一个 Y.Doc 中的 `Y.XmlFragment("document-store")`
- metadata 协同使用同一个 Y.Doc 中的 `Y.Map("document-metadata")`
- `HocuspocusProvider` 使用同一个 room name 和同一个 Y.Doc
- hook 维护连接状态：`idle`、`connecting`、`connected`、`synced`、`disconnected`、`error`
- provider、Y.Doc 和相关监听会在文档切换或组件卸载时清理
- `DocumentPageContent` 统一调用 `useDocumentCollaboration()`，并把协同输出分发给 `PresenceBar` 与 `EditorShell`
- `EditorShell` 将 `{ enabled: true, provider, fragment, user }` 传给 `DocumentEditor`
- `PresenceBar` 展示真实 `presenceMembers` 和连接状态
- 文档页右侧卡片展示协同状态、房间名和连接错误
- 真实登录注册已落地，多浏览器验证需分别注册/登录不同账号
- 根脚本提供 `dev:collab`、`dev:all` 和 `stop:collab`
- 文档详情与 read 权限加载完成后再启用协同：`enabled: Boolean(document?.permissions.canRead)`
- `isEditorCollaborationReady` 门控避免编辑器在协同 runtime 未就绪时双初始化
- `DocumentEditorLazy` 懒加载 editor 包，路由级 `loading.tsx` 提供占位
- `WorkspaceSidebar` 通过 `preloadDocumentEditor()` 预拉编辑器 chunk

## 关键文件

当前实现主要落在：

- `apps/web/src/hooks/use-document-collaboration.ts`
- `apps/web/src/lib/collaboration-config.ts`
- `apps/web/src/lib/collaboration-user.ts`
- `apps/web/src/lib/collaboration-metadata.ts`
- `apps/web/src/lib/collaboration-presence.ts`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/components/editor/document-editor-lazy.tsx`
- `apps/web/src/components/editor/editor-loading-placeholder.tsx`
- `apps/web/src/app/(workspace)/docs/[id]/loading.tsx`
- `apps/web/src/components/collaboration/presence-bar.tsx`
- `apps/web/src/lib/documents-client.ts`
- `apps/web/src/components/auth/current-user-provider.tsx`
- `apps/web/package.json`
- `package.json`

相关下游能力在：

- `packages/editor/src/blocknote/document-editor.tsx`
- `packages/editor/src/blocknote/create-editor-options.ts`
- `packages/editor/src/types.ts`
- `packages/collaboration/src/room.ts`
- `packages/collaboration/src/user.ts`
- `packages/collaboration/src/status.ts`
- `apps/collab/src/config.ts`
- `apps/collab/src/persistence.ts`
- `apps/collab/src/server.ts`

## 运行时结构

当前每个文档页协同运行时的结构是：

```text
apps/web DocumentPageContent
  -> useDocumentCollaboration({
       documentId,
       initialTitle,
       user,
       enabled: Boolean(document?.permissions.canRead),
     })
    -> fetchCollabToken(documentId)
    -> getWebCollaborationConfig()
    -> toCollaborationUser(user)
    -> createDocumentRoomName({ workspaceId, documentId })
    -> new Y.Doc()
      -> ydoc.getXmlFragment("document-store")
      -> ydoc.getMap("document-metadata")
    -> new HocuspocusProvider({ url, name: roomName, document: ydoc })
    -> mergePlatformAwarenessState()
    -> awareness.on("change") -> presenceMembers
  -> PresenceBar(members, status)
  -> EditorShell(collaboration, metadataTitle, isEditorCollaborationReady, ...)
    -> DocumentEditorLazy(collaboration)  // 仅 isEditorCollaborationReady 为真时挂载
```

`packages/editor` 不创建 Y.Doc，不创建 provider，也不关心 room name。它只接收 Web 层传入的 provider、fragment 和 user，并转换成 BlockNote collaboration option。

## 配置约定

默认协同地址：

```text
ws://localhost:1234
```

环境变量覆盖：

```text
NEXT_PUBLIC_COLLAB_URL=ws://localhost:4321
```

默认 workspace：

```text
default-workspace
```

正文 fragment 名称：

```text
document-store
```

metadata map 名称：

```text
document-metadata
```

这些常量集中在 `apps/web/src/lib/collaboration-config.ts`，不要在组件中手写字符串。

## 用户映射

当前登录用户来自 `CurrentUserProvider`（`GET /api/auth/me`）。

Web 层通过 `toCollaborationUser()` 将 `CurrentUser` 转换为平台协同用户：

```ts
{
  id: user.id,
  name: user.name,
  color: getCollaborationUserColor(user.id),
}
```

颜色由 `packages/collaboration` 根据用户 ID 稳定生成。`CollaborationUser` 应继续作为 editor 和 presence 的平台边界。

## 生命周期约束

`useDocumentCollaboration()` 的 provider 生命周期应只跟以下事实相关：

- `documentId`
- `enabled`
- `roomName`
- 协同 URL
- workspace id
- 当前协同用户

不应把以下状态加入 provider 创建 effect 的依赖：

- 正文内容
- metadata title
- `presenceMembers`
- `isDirty`
- `saveLabel`
- toast 状态
- AI 请求结果

标题协同已经被拆到 metadata 层，标题输入不应造成 WebSocket 重连或 `DocumentEditor` 重建。

## 与 DocumentEditor 的关系

`EditorShell` 接收页面层传入的协同 props，并在 `isEditorCollaborationReady` 为真后通过 `DocumentEditorLazy` 把 `collaboration` 传给 `DocumentEditor`：

```tsx
{isEditorCollaborationReady ? (
  <DocumentEditorLazy collaboration={collaboration} />
) : (
  <EditorLoadingPlaceholder />
)}
```

`packages/editor` 负责把平台协同配置适配为 BlockNote collaboration option。

协同启用时，`createEditorOptions()` 不会再向 BlockNote 传入本地 `initialContent`，避免用本地内容覆盖已有 Yjs 文档。

## 页面状态展示

`EditorShell` 右侧文档状态卡片当前展示：

- 当前文档标题
- 最近更新
- 协同状态
- 协同房间
- 协同错误信息
- 文档角色 Badge（owner/editor/viewer/super_admin）

协同状态来自 `CollaborationConnectionStatus`，当前可能值由 `packages/collaboration` 定义。

## 运行命令

根级脚本当前包括：

```bash
pnpm dev
pnpm dev:collab
pnpm dev:all
pnpm stop:collab
```

常用本地联调方式：

```bash
pnpm dev:all
```

如果只启动 Web 而没有启动协同服务，页面仍可打开，但协同连接会失败或停留在断开状态。

如遇到 `EADDRINUSE`，可执行：

```bash
pnpm stop:collab
```

也可以指定端口：

```bash
PORT=1234 pnpm stop:collab
```

## 本地多浏览器验证

推荐验证步骤：

1. 启动协同服务和 Web：`pnpm dev:all`
2. 浏览器 A 注册并登录用户 A，创建文档或将 B 加为 editor
3. 浏览器 B 注册并登录用户 B
4. 两个浏览器打开同一篇 `/docs/[id]`（B 需已被添加为成员）
5. 确认右侧显示相同协同房间名
6. A 修改正文，B 应看到同步
7. B 修改正文，A 应看到同步
8. 两个浏览器 `PresenceBar` 应显示 `2 人在线`
9. 关闭其中一个浏览器后，另一方人数应减少
10. 标题协同验证见 `docs/collaboration/metadata-title-collaboration.md`
11. Presence 验证见 `docs/collaboration/presence-implementation.md`
12. 修改标题时不应出现新的 provider 创建日志

## 当前边界

当前 Web 协同客户端仍有以下边界：

- viewer 在 Web/HTTP 层只读，协同层暂不拦截 Yjs 写入（见 `docs/documents/implementation-status.md`）
- 首页协作快照仍未展示真实 presence 成员列表
- 侧边栏与首页最近文档读业务 `documents.title`，不实时订阅 Y.Map；与文档页 metadata title 可能短暂不一致
- 文档页已无「保存文档」按钮；正文与 Y.Map 标题由 `apps/collab` 自动持久化到 SQLite；业务 title 由 owner/editor 改标题时节流 `PATCH /api/documents/:id` 同步
- 无权限用户连接协同会被 token 或 `onAuthenticate` 拒绝

## 验证记录

最近一次相关实现已通过：

```bash
pnpm --filter web typecheck
pnpm --filter collab typecheck
```

此前编辑器协同配置阶段也通过过：

```bash
pnpm --filter @ai-doc-platform/editor typecheck
```

## 后续衔接建议

建议后续按以下顺序推进：

1. 设计列表层如何订阅或读取协同 metadata，减少 title 双源不一致
2. 将首页协作快照 mock presence 逐步替换为真实 awareness 数据
3. 视需要在 collab 层补 viewer 写保护

## 相关文档

- `docs/collaboration/persistence-implementation.md`

- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/presence-implementation.md`
- `docs/editor/integration-guide.md`
- `docs/architecture/frontend-handoff.md`
