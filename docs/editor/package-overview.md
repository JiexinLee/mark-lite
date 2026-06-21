# Editor 包说明

## 文档目的

本文档记录 `@ai-doc-platform/editor` 当前已经落地的实现边界、对外 API 和内部结构。这里描述的是当前事实，不承载接入步骤和未来规划。

## 当前状态

`packages/editor` 已经不是空壳包，而是一个可直接被 `apps/web` 消费的 BlockNote 适配层。

当前已落地能力：

- 提供 `DocumentEditor` React 组件
- 提供跨应用可复用的编辑器内容类型 `EditorDocumentContent`
- 将项目内部的块结构与 BlockNote `PartialBlock[]` 做双向转换
- 基于 `documentId` 提供默认初始内容，避免空文档初始化报错
- 默认启用 BlockNote 中文语言包
- 提供可选的 AI 接入配置 `DocumentEditorAIConfig`
- 已接入 BlockNote AI toolbar button、AI slash menu 与 AI menu controller
- 支持通过 `buildAIContext` 向 `/api/ai/editor` 发送文档上下文
- 支持通过 `onAIRequestConfiguration` 将“AI 入口被触发但当前缺少配置”的情况上抛给页面层
- 支持通过 `onAIError` 将 AI 请求失败上抛给页面层
- 提供可选的协同配置 `DocumentEditorCollaborationConfig`，可接收外部传入的 provider、Yjs fragment 和平台协同用户，并适配为 BlockNote collaboration option

当前未落地能力：

- 基于真实知识库的引用插入执行链路
- 引用块、评论、批注、slash menu 的业务定制
- 独立的测试用例与 lint 规则

## 包内结构

当前核心文件如下：

- `packages/editor/src/index.ts`：稳定导出面
- `packages/editor/src/types.ts`：跨包共享的内容与组件类型
- `packages/editor/src/commands.ts`：编辑器命令类型占位
- `packages/editor/src/blocknote/collaboration.ts`：平台协同配置到 BlockNote collaboration option 的适配
- `packages/editor/src/blocknote/document-editor.tsx`：BlockNote React 组件封装
- `packages/editor/src/blocknote/create-editor-options.ts`：统一 editor 初始化参数，并合并 BlockNote AI 所需中文词典
- `packages/editor/src/blocknote/serialization.ts`：项目块结构与 BlockNote 块结构互转
- `packages/editor/src/blocknote/initial-content.ts`：默认种子内容
- `packages/editor/src/blocknote/styles.css`：编辑器局部样式
- `packages/editor/src/css.d.ts`：CSS side-effect import 类型声明

## 对外 API

### 组件

`DocumentEditor` 当前支持以下输入：

- `documentId`：当前文档唯一标识，也是重建 editor 实例的依赖
- `initialContent`：可选的结构化块内容
- `editable`：是否允许编辑
- `className`：外层容器样式扩展
- `ai`：AI 路由地址、运行时设置与 API Key
- `collaboration`：可选协同配置，启用时由调用方传入 provider、Yjs fragment 和平台协同用户
- `buildAIContext`：按需构建文档标题、正文、RAG 片段等上下文
- `onAIRequestConfiguration`：当用户点击 AI 入口但当前缺少可用配置时回调到应用层
- `onAIError`：将 transport 或会话恢复失败上抛到应用层
- `onChange`：编辑变更回调，返回 `EditorDocumentContent`

协同配置的完整类型、适配规则和边界见 `docs/editor/collaboration-config.md`。

### 类型

当前公开类型：

- `EditorBlock`
- `EditorDocumentContent`
- `DocumentEditorAIConfig`
- `DocumentEditorCollaborationConfig`
- `DocumentEditorCollaborationProvider`
- `DocumentEditorCollaborationFragment`
- `DocumentEditorProps`
- `DocumentEditorHandle`
- `DocumentEditorCommand`
- `DocumentEditorCommandPayload`

注意：`DocumentEditorHandle` 和命令类型目前仅完成类型定义，还没有在组件层提供完整命令通道。

## 内部实现约定

### 语言包

编辑器默认通过 `createEditorOptions` 注入 BlockNote 官方 `zh` 字典，并额外合并 `@blocknote/xl-ai` 的中文词典，所以 slash menu、默认工具栏、AI 菜单和系统文案应以中文显示。

### 内容模型

项目侧统一使用 `EditorDocumentContent` 作为持久化与跨包传输格式。

当前策略：

- 进入 BlockNote 前，先转成 `PartialBlock[]`
- 从 BlockNote 读出内容时，再回写为 `EditorBlock[]`
- 转换层尽量保持宽容，避免因为部分字段缺失导致运行时报错

### 初始内容策略

`initialContent` 为空时，会根据 `documentId` 使用默认内容。

这样做的目的不是做内容模板，而是规避 BlockNote 对非法或空初始块较敏感时的初始化异常。

需要注意：`initial-content.ts` 里的种子文案主要用于 demo 与兜底，个别业务描述可能早于当前页面布局，不应视为产品事实来源。

当 `collaboration.enabled` 为 `true` 时，编辑器初始化参数会以外部传入的 Yjs fragment 为内容来源，不再向 BlockNote 传入本地编辑模式的 `initialContent`。如果后续需要把已有内容初始化到空 Yjs 文档，这个动作应由 `apps/web` 协同客户端或协同持久化阶段负责，并确保只初始化一次。

### 编辑器实例生命周期

`DocumentEditor` 当前通过 `documentId` 作为 `useCreateBlockNote` 的依赖。当切换文档 ID 时，会重建 editor 实例，避免不同文档之间相互污染编辑状态。

当 AI 路由地址、API Key 或 AI 设置发生变化时，editor 也会重建实例，以避免继续复用旧 transport 导致的空 Key 或旧配置问题。

当协同配置启用，并且 provider、fragment 或协同用户关键字段变化时，editor 也会重建实例，以便 BlockNote 使用新的 collaboration option。provider、Y.Doc 和 fragment 的引用稳定性由调用方负责。

编辑器会继续保留 AI 入口，但会区分“AI UI 可见”和“AI 请求可执行”：

- 当 `ai` 和 `buildAIContext` 存在时，编辑器会挂载自定义 AI toolbar 与 `/ai` 菜单项
- 当 `ai.enabled` 为 `false` 时，不会挂载真实 `AIExtension` 和 `AIMenuController`
- 这时 toolbar 和 `/ai` 入口只负责触发 `onAIRequestConfiguration`
- 这样可以把“请先去设置页配置 key”这类产品提示留给应用层，同时避免访问未注册扩展导致运行时错误

### AI 接入边界

`packages/editor` 当前只负责承载 BlockNote AI UI 与 transport 对接，不负责：

- API Key 的安全存储
- provider 选择和表单交互
- `/api/ai/editor` 路由实现
- 页面级错误提示样式与消失策略
- “前往设置页配置 API Key” 这类具体产品文案

这些职责仍保留在 `apps/web`。

### 协同接入边界

`packages/editor` 当前只负责接收平台协同配置，并把它适配为 BlockNote collaboration option。

它不负责：

- 创建 Y.Doc
- 创建 HocuspocusProvider
- 决定协同 room name
- 连接 `apps/collab`
- 管理 presence UI 或连接状态 UI
- 持久化 Yjs 文档
- 处理协同 WebSocket token、鉴权或权限（HTTP Cookie 会话不在 editor 包职责内）

其中 `apps/web` 协同客户端运行时、文档页真实 presence UI、文档权限与协作者管理已经落地；`apps/collab` SQLite 持久化与 WebSocket 鉴权已经落地；首页协作快照 presence 仍属于后续阶段。

## 当前验证基线

以下检查已作为当前实现的最小验证基线：

- `tsc --noEmit -p packages/editor/tsconfig.json`
- `tsc --noEmit -p apps/web/tsconfig.json`
