# AI 实现状态

## 文档目的

本文档记录当前 AI 新特性的已落地实现、运行时约束与已知限制。这里描述的是当前事实，不承载长期路线规划。

## 当前已落地能力

当前 AI 能力已经打通以下链路：

- 设置页中的 `AI 配置` 标签可配置 provider、model、base URL、API Key、temperature、max tokens、enabled actions 与 citation required
- 文档编辑页中的 `DocumentEditor` 已接入 BlockNote AI toolbar button、AI slash menu 与 AI menu controller
- 文档页可基于当前标题和正文构建 AI 上下文，并通过 `/api/ai/editor` 发起流式请求
- route 错误已通过 `onAIError` 上抛到页面 toast，可直接看到失败原因
- 当用户未配置 API Key 时，点击编辑器 AI 按钮或通过 `/ai` 选择 AI 入口，会直接提示前往设置页配置 key，而不是先发请求再失败
- one-shot AI 动作仍可通过 `ai-workspace` 的 prompt 构造链路调用 `/api/ai/editor`
- `apps/web` 通过 `DocumentEditorLazy` 懒加载 editor 包，避免非文档路由首屏加载 BlockNote 重型依赖

## 核心模块

当前实现主要落在以下文件：

- `apps/web/src/components/ai/ai-settings-card.tsx`
- `apps/web/src/app/(workspace)/settings/page.tsx`
- `apps/web/src/lib/ai-settings.ts`
- `apps/web/src/lib/ai-runtime.ts`
- `apps/web/src/app/api/ai/editor/route.ts`
- `apps/web/src/lib/blocknote-ai-server-adapter.ts`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/components/editor/document-editor-lazy.tsx`
- `packages/editor/src/types.ts`
- `packages/editor/src/blocknote/document-editor.tsx`
- `packages/editor/src/blocknote/create-editor-options.ts`

## 设置与存储

### 当前存储方式

AI 设置当前保存在浏览器 `localStorage`，key 为：

- `ai-doc-platform.ai-settings`

当前这套方案只适用于本地课程演示，不适合作为生产环境方案。

### 当前设置字段

当前持久化字段包括：

- `provider`
- `model`
- `baseUrl`
- `apiKey`
- `temperature`
- `maxTokens`
- `enabledActions`
- `citationRequired`

## 运行时约束

### provider 约束

当前 route 只支持 OpenAI-compatible provider：

- `openai`
- `deepseek`
- `custom`

即使配置域模型定义中存在更多 provider，当前 web route 也不会全部放行。

### 动作约束

one-shot 请求必须满足以下条件：

- 请求体满足 `AIWorkspaceRequest` 结构
- `actionKey` 已包含在 `settings.enabledActions` 中
- 已提供 API Key
- 已解析出可用 model 与 base URL

### citation 约束

当前 `citationRequired` 主要体现在 prompt 层：

- chat 场景会在 system prompt 中强调引用来源标题
- one-shot 场景会在用户 prompt 后补充引用要求

这还不是“真实 citation 插入链路”，只是模型回答约束。

## `/api/ai/editor` 路由行为

当前 route 是单一 POST 入口，但内部会区分两类请求：

### chat 请求

当请求体包含 `messages` 时，route 会：

- 校验 API Key、provider、model、base URL
- 将 BlockNote tool definitions 转为 `ToolSet`
- 将文档状态注入消息数组
- 调用 `streamText()` 返回流式响应

### one-shot 请求

当请求体满足 `EditorAIRouteRequest` 时，route 会：

- 校验动作是否已启用
- 基于 `buildAIWorkspacePrompt()` 构造 prompt
- 调用 `generateText()` 返回 `{ ok: true, text }`

## 编辑器侧 AI 集成

`packages/editor` 当前承担的是“编辑器 AI 容器”职责，而不是页面级 AI 编排职责。

当前已落地集成包括：

- `DocumentEditorAIConfig`
- `buildAIContext`
- `onAIRequestConfiguration`
- `onAIError`
- `AIExtension({ transport })`
- editor 内部包装后的 AI toolbar button
- editor 内部包装后的 AI slash menu items
- `AIMenuController`

当前行为约束如下：

- `ai.enabled` 既决定是否允许挂载真实 AI transport，也决定 `AIMenuController` 是否挂载
- 即使未配置 API Key，编辑器仍会保留 AI 入口用于承接引导提示，但不会访问未注册的 `AIExtension`
- 因此当前已修复“未配置 key 时，选中文本弹出格式工具栏后触发 `Extension not found`”的问题

编辑器会在以下输入变化时重建实例：

- `documentId`
- `editable`
- `ai.api`
- `ai.apiKey`
- `ai.settings`

这样做是为了避免继续复用旧 transport，导致 hydration 后仍拿到旧 Key 或旧配置。

## BlockNote server adapter

当前没有直接在 route 里依赖 `@blocknote/xl-ai/server` 的运行时 helper，而是通过：

- `toBlockNoteToolSet()`
- `withInjectedDocumentState()`

进行兼容封装。

这样做的原因不是接口设计偏好，而是因为此前在 Next route runtime 中直接使用对应命名导出时，出现过运行时非函数错误。当前 adapter 的目标是把这层兼容性收敛到单一文件，便于后续在 BlockNote 发布可用新版本后切回官方导出。

## 文档页接入说明

当前 AI 上下文中的 `title` 来自页面层 `useDocumentCollaboration()` 返回的 `metadataTitle`，不是 `EditorShell` 本地 title state。编辑器本体在 `apps/web` 中通过 `DocumentEditorLazy` 懒加载挂载。

## 当前已知限制

- API Key 当前保存在浏览器 `localStorage`
- 侧边栏、文档页与首页最近文档已接入服务端文档 API；首页协作快照与 `mock-documents.tsx` 仍保留 mock 用途
- citation 要求已经打通 prompt 约束，但真实 citation 插入链路尚未完成
- AI 能力当前内嵌在编辑器内部，没有独立右侧 AI 工作区
- 当前实现优先保证最小可用与错误可见性，还缺少针对 route adapter 和编辑器 AI 集成的测试

## 相关文档

- `docs/editor/package-overview.md`
- `docs/editor/integration-guide.md`
- `docs/editor/evolution-plan.md`
- `docs/architecture/frontend-handoff.md`
