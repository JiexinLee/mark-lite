# Editor 接入指南

## 文档目的

本文档说明 `apps/web` 当前如何接入 `@ai-doc-platform/editor`，以及编辑页最小可用链路由哪些模块组成。

## 当前接入场景

`apps/web` 已经把 editor 包用于 `/docs/[id]` 文档详情页，而不是停留在静态占位阶段。

当前已经打通的交互包括：

- 从侧边栏或首页创建文档（`POST /api/documents`）
- 创建后立即进入对应文档路由
- 在编辑页修改标题（owner/editor 可编辑；viewer 只读）
- 在编辑器内修改结构化内容（受 `permissions.canEdit` 控制）
- owner/editor 改标题时节流同步到业务 API（`PATCH /api/documents/:id`）
- 在设置页配置 AI provider、model、base URL、API Key 与动作开关
- 在文档页通过 AI toolbar button 与 `/` slash menu 打开 AI 能力（viewer 无 AI 编辑入口）
- 未配置 API Key 时，在 AI 入口前置弹出页面 toast，引导用户前往设置页配置
- 在 AI 请求失败时通过页面 toast 直接暴露 route 或 transport 错误
- 在文档页创建协同客户端运行时，并把协同配置传给 `DocumentEditor`
- 文档页顶部标题通过 Yjs metadata map 进行协同
- owner/super_admin 可通过「协作」按钮管理协作者

## 运行链路

当前 `apps/web` 的文档编辑页链路如下：

1. `DocumentsProvider` 通过 `GET /api/documents` 管理侧边栏与首页可见文档列表
2. `WorkspaceSidebar` 或首页主 CTA 点击「创建文档」时调用 `POST /api/documents`
3. 新文档创建后立即跳转到 `/docs/{id}`
4. `DocumentPageContent` 调用 `GET /api/documents/:id` 加载详情与权限，成功后启用 `useDocumentCollaboration()`
5. `AISettingsCard` 在 `/settings` 中管理本地 AI 配置，并持久化到浏览器 `localStorage`
6. `useDocumentCollaboration()` 在 Cookie 登录态下请求协同 JWT（`POST /api/collaboration/token`），再创建 Y.Doc、正文 fragment、metadata map、HocuspocusProvider，并同步 awareness 到 `presenceMembers`
7. `PresenceBar` 展示真实在线成员和连接状态
8. `EditorShell` 在 `isEditorCollaborationReady` 为真后通过 `DocumentEditorLazy` 挂载编辑器，并消费页面层传入的协同配置、权限、AI 设置与 API Key
9. 文档标题输入框由 `metadataTitle` 驱动，变化时写入 Yjs metadata map；owner/editor 同时节流 PATCH 业务 title
10. `DocumentEditor` 在 AI 入口被触发时，先根据 `ai.enabled` 决定是打开 AI 菜单还是调用 `onAIRequestConfiguration`
11. 当 AI 可用时，`DocumentEditor` 通过 `DefaultChatTransport` 派生的错误上报 transport 调用 `/api/ai/editor`
12. `/api/ai/editor` 负责区分 chat 流式请求与 one-shot 动作请求

## 关键文件

当前接入主要落在以下文件：

- `apps/web/src/app/(workspace)/docs/[id]/page.tsx`
- `apps/web/src/app/(workspace)/settings/page.tsx`
- `apps/web/src/app/api/ai/editor/route.ts`
- `apps/web/src/components/ai/ai-settings-card.tsx`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/components/editor/document-editor-lazy.tsx`
- `apps/web/src/components/editor/editor-loading-placeholder.tsx`
- `apps/web/src/app/(workspace)/docs/[id]/loading.tsx`
- `apps/web/src/hooks/use-document-collaboration.ts`
- `apps/web/src/hooks/use-documents.tsx`
- `apps/web/src/lib/documents-client.ts`
- `apps/web/src/lib/collaboration-config.ts`
- `apps/web/src/lib/collaboration-user.ts`
- `apps/web/src/lib/collaboration-metadata.ts`
- `apps/web/src/lib/collaboration-presence.ts`
- `apps/web/src/components/collaboration/presence-bar.tsx`
- `apps/web/src/components/documents/document-member-dialog.tsx`
- `apps/web/src/lib/ai-settings.ts`
- `apps/web/src/lib/ai-runtime.ts`
- `apps/web/src/lib/blocknote-ai-server-adapter.ts`
- `apps/web/src/components/layout/workspace-sidebar.tsx`
- `apps/web/src/components/workspace/workspace-home-page.tsx`
- `packages/editor/src/blocknote/document-editor.tsx`
- `packages/editor/src/blocknote/create-editor-options.ts`

## 页面结构现状

当前文档页右侧已经没有独立的 AI Assistant 面板，AI 能力改为内嵌在编辑器内部。页面主结构是：

- `PresenceBar`
- `EditorShell`（含角色 Badge、协作按钮、权限感知只读态）
- `DocumentEditorLazy`（内部封装 `@ai-doc-platform/editor` 的 `DocumentEditor`）

如果后续重新引入右侧辅助面板，应先明确布局责任归属，避免再次把编辑器接入文档、AI 交互与页面壳层变更混在一起推进。

## 编辑器懒加载与协同门控

当前 `apps/web` 不在文档页静态导入 `@ai-doc-platform/editor`，而是通过 `DocumentEditorLazy` 做 `next/dynamic` 懒加载，并在路由级提供 `loading.tsx` 占位。

协同方面，`EditorShell` 只在 `isEditorCollaborationReady === true` 时挂载编辑器，避免协同 runtime 尚未就绪时先以本地模式初始化、再以协同模式重建 BlockNote 实例。

`WorkspaceSidebar` 会在 idle / hover / focus 时调用 `preloadDocumentEditor()`，提前拉取编辑器 chunk。

## 最小接入示例

在 React 客户端组件中，editor 包本身的最小用法如下。当前 `apps/web` 实际通过 `DocumentEditorLazy` 包装，并由 `DocumentPageContent` 统一创建协同 runtime：

```tsx
import { DocumentEditor } from "@ai-doc-platform/editor";
import { toAIWorkspaceSettings, useAISettings } from "@/lib/ai-settings";

const { settings } = useAISettings();

<DocumentEditor
  ai={{
    enabled: Boolean(settings.apiKey.trim()),
    api: "/api/ai/editor",
    settings: toAIWorkspaceSettings(settings),
    apiKey: settings.apiKey.trim() || undefined,
  }}
  buildAIContext={() => ({
    documentId: document.id,
    title: metadataTitle.trim() || document.title,
    documentText: buildDocumentText(content),
  })}
  collaboration={collaboration}
  documentId={document.id}
  editable={permissions.canEdit}
  onAIRequestConfiguration={() =>
    pushToast("AI 助手不可用", "请前往设置页配置api key")
  }
  onAIError={(error) => pushToast("AI 助手调用失败", error.message)}
  onChange={(nextContent) => {
    if (!permissions.canEdit) return;
    setContent(nextContent);
  }}
/>;
```

## 接入约定

### 协同配置

`DocumentEditor` 已经支持可选的 `collaboration` prop。当前 `apps/web` 文档页已经由 `DocumentPageContent` 调用 `useDocumentCollaboration()` 创建 Y.Doc、HocuspocusProvider、正文 fragment 和协同用户，并在 `Boolean(document?.permissions.canRead)` 为真后才启用协同；`EditorShell` 只消费传入的协同配置。

应用层负责创建稳定的 provider、Yjs fragment 和 `CollaborationUser`。editor 包只做 BlockNote collaboration option 适配，不负责创建连接、决定房间名、持久化协同文档或处理权限。

协同配置的类型约束、initialContent 策略和后续接入边界见 `docs/editor/collaboration-config.md`。Web 协同客户端实现见 `docs/collaboration/web-client-implementation.md`。Presence 实现见 `docs/collaboration/presence-implementation.md`。

### 标题 metadata 协同

文档标题当前不是 `EditorShell` 本地 `useState(document.title)` 的长期来源，而是由页面层 `useDocumentCollaboration()` 暴露的 `metadataTitle` 驱动。

标题存储在同一个 Y.Doc 的 `Y.Map("document-metadata")` 中，key 为 `title`。标题输入变化会调用 `setMetadataTitle()`，远端 metadata 更新会同步回标题输入框。owner/editor 同时通过 `scheduleTitleSync()` 节流 PATCH 业务 `documents.title`。

Y.Map 标题由 `apps/collab` 自动持久化；业务 title 由文档 API 持久化。详细边界见 `docs/collaboration/metadata-title-collaboration.md` 和 `docs/collaboration/persistence-implementation.md`。

### 内容来源

- `initialContent` 应传入项目侧的 `EditorDocumentContent`
- 如果调用方不传内容，editor 会根据 `documentId` 使用默认初始内容
- 如果启用 `collaboration`，editor 会以传入的 Yjs fragment 为内容来源，不再向 BlockNote 传入本地模式的 `initialContent`

### 保存职责

- editor 包当前只负责编辑与内容回传
- 正文由协同服务自动持久化，文档页无「保存文档」按钮
- 标题同步、权限感知只读态、协作者管理 UI 留在应用层
- AI 错误提示样式、toast 生命周期和 API Key 表单也继续留在应用层

### 路由切换

- 切换 `documentId` 会重建 editor 实例
- 如果应用层需要保留未保存提示，应在路由切换前自行处理

## 当前限制

- 正文不支持 editor 内部命令保存，依赖协同自动持久化
- 文档元数据与正文已接入服务端文档 API 与协同服务
- 文档页当前只走 OpenAI-compatible provider 链路，运行时支持 `openai`、`deepseek`、`custom`
- API Key 当前保存于浏览器 `localStorage`，仅适用于本地课程演示
- 未配置 API Key 时，AI 入口会被前置拦截并提示用户配置，而不会发起请求
- 引用要求目前只体现在 prompt 约束中，真实 citation 插入链路尚未落地
- 文档协同运行时已经在 `apps/web` 文档页创建；协同 Yjs 状态已由 `apps/collab` 持久化到 SQLite；WebSocket 使用短期协同 JWT 鉴权（HTTP 登录仍为 Cookie，见 `docs/auth/implementation-status.md`）
- 首页协作快照仍使用 mock presence 数据，但文档页 `PresenceBar` 已接入真实 awareness 成员列表
- 还没有评论与真实知识库检索回写能力
