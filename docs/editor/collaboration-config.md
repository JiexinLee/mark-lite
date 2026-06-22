# Editor 协同配置说明

## 文档目的

本文档记录 `@ai-doc-platform/editor` 当前已经落地的协同配置能力，以及它和 `apps/web`、`apps/collab`、`packages/collaboration` 的边界。

这里描述的是 editor 包已经具备的适配能力。当前 `apps/web` 文档页已经由 `DocumentPageContent` 创建 Web 协同客户端运行时，并通过 `DocumentEditorLazy` 把协同配置传给 `DocumentEditor`。

## 当前状态

`DocumentEditor` 已经支持可选的 `collaboration` prop。调用方可以把外部创建好的协同运行时对象传入 editor 包，由 editor 包转换为 BlockNote 能识别的 collaboration option。

当前已经完成：

- 定义并导出 `DocumentEditorCollaborationConfig`
- 定义并导出 `DocumentEditorCollaborationProvider`
- 定义并导出 `DocumentEditorCollaborationFragment`
- `DocumentEditorProps` 支持 `collaboration?: DocumentEditorCollaborationConfig`
- 复用 `@ai-doc-platform/collaboration` 的 `CollaborationUser`
- 使用 `yjs` 的 `Y.XmlFragment` 作为 fragment 类型
- 使用 `y-protocols/awareness` 的 `Awareness` 作为 provider awareness 类型
- 将平台 `CollaborationUser` 适配为 BlockNote collaboration user 的 `{ name, color }`
- 协同启用时向 BlockNote 传入 `collaboration` option
- 协同启用时不向 BlockNote 传入本地编辑模式的 `initialContent`
- 协同配置和现有 AI extension 可以同时参与 BlockNote 初始化

当前没有完成：

- 协同鉴权、权限、版本历史或 AI 冲突处理

当前已经由 `apps/collab` 完成：

- SQLite 持久化 Yjs 文档，按 `documentName` 保存和恢复整份 Y.Doc 状态

当前已经由 `apps/web` 完成：

- 由 `DocumentPageContent` 统一调用 `useDocumentCollaboration()`，并在 hydration 完成后再启用协同
- 创建 Y.Doc
- 创建 HocuspocusProvider
- 生成标准文档协同房间名
- 获取 `Y.XmlFragment("document-store")` 作为正文 fragment
- 通过 `DocumentEditorLazy` 将真实协同配置传给 `DocumentEditor`，并用 `isEditorCollaborationReady` 避免双初始化
- 在文档页展示协同连接状态和房间名
- 使用同一个 Y.Doc 中的 `Y.Map("document-metadata")` 协同文档标题
- 文档页 `PresenceBar` 展示真实 awareness 在线成员

## 公开类型

协同配置类型定义在 `packages/editor/src/types.ts`，并从 `packages/editor/src/index.ts` 导出。

核心结构如下：

```ts
import type { CollaborationUser } from "@ai-doc-platform/collaboration";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

export type DocumentEditorCollaborationProvider = {
  awareness: Awareness;
};

export type DocumentEditorCollaborationFragment = Y.XmlFragment;

export type DocumentEditorCollaborationConfig =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      provider: DocumentEditorCollaborationProvider;
      fragment: DocumentEditorCollaborationFragment;
      user: CollaborationUser;
    };
```

`collaboration` 整体可选。不传 `collaboration` 或传入 `{ enabled: false }` 时，编辑器继续走本地编辑模式。

当 `enabled: true` 时，`provider`、`fragment` 和 `user` 在类型层面必填。

## 适配规则

平台协同用户来自 `packages/collaboration`：

```ts
type CollaborationUser = {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
};
```

BlockNote collaboration user 当前只需要 `name` 和 `color`。editor 包的适配层会保留平台用户类型作为输入，但只把以下字段传给 BlockNote：

```ts
{
  name: collaboration.user.name,
  color: collaboration.user.color,
}
```

`id` 和 `avatarUrl` 仍属于平台协同用户语义。`id` 与 `color` 已被文档页 presence 和头像 fallback 使用；`avatarUrl` 当前仍未接入 UI，也不会直接传给 BlockNote collaboration user。

## initialContent 策略

本地编辑模式下，`DocumentEditor` 会继续使用当前策略：

- 调用方传入非空 `initialContent` 时使用调用方内容
- 调用方未传或传入空内容时，根据 `documentId` 生成默认初始内容
- `createEditorOptions()` 会把 `EditorDocumentContent` 转换为 BlockNote `initialContent`

协同启用时，内容来源切换为外部传入的 Yjs fragment。此时 `createEditorOptions()` 不向 BlockNote 传入本地编辑模式的 `initialContent`。

这个约束是为了避免每次创建 editor 实例时用本地 mock 内容覆盖已有 Yjs 文档。

如果后续需要把已有文档内容初始化到空 Yjs 文档，应由 `apps/web` 协同客户端或协同持久化阶段完成，并且必须保证只初始化一次。

## 编辑器实例重建

`DocumentEditor` 会在以下关键输入变化时重建 BlockNote editor 实例：

- `documentId`
- `editable`
- AI API 地址、API Key 或 AI settings
- `collaboration.enabled`
- 协同 provider 引用
- 协同 fragment 引用
- 协同用户的 `id`、`name`、`color`

provider、Y.Doc 和 fragment 的引用稳定性由调用方负责。当前 `apps/web` 已由 `DocumentPageContent` 通过 `useDocumentCollaboration()` 创建协同运行时，后续修改该 hook 时应继续避免每次 render 都触发 editor 重建。

## 与 AI 的关系

协同配置和 AI 配置可以同时存在。

BlockNote 初始化参数会同时保留：

- `dictionary`
- `editable`
- `extensions`
- `collaboration`

AI extension 仍通过 `extensions` 注入。协同配置不会覆盖 AI extension，AI extension 也不会覆盖 collaboration option。

当前实现不处理多人同时使用 AI 的冲突，也不生成协同版本点。这些能力属于后续 AI 与协同联动阶段。

## 包职责边界

`packages/editor` 负责：

- 接收平台协同配置
- 把 provider、fragment、user 转换为 BlockNote collaboration option
- 在协同启用时跳过本地编辑模式的 `initialContent`
- 保持本地编辑模式、AI 能力和 `onChange` 回调兼容

`packages/editor` 不负责：

- 创建 Y.Doc
- 创建 HocuspocusProvider
- 决定 room name
- 连接 `apps/collab`
- 保存或恢复 Yjs 文档
- 展示 presence 成员列表
- 展示连接状态
- 处理协同 WebSocket token、鉴权或权限（HTTP 登录 Cookie 由 `apps/web` 应用层负责，不在 editor 包内）
- 处理版本历史
- 处理多人 AI 冲突

## Web 当前接入方式

当前 `apps/web` 文档页协同客户端已经完成：

1. `DocumentPageContent` 在 `Boolean(document?.permissions.canRead)` 为真后启用 `useDocumentCollaboration()`
2. 根据文档 ID 创建稳定的 room name
3. 创建稳定的 Y.Doc
4. 从 Y.Doc 获取 BlockNote 使用的 XML fragment
5. 创建 HocuspocusProvider
6. 从当前登录用户（`CurrentUser`）构建 `CollaborationUser`
7. `EditorShell` 在 `isEditorCollaborationReady` 为真后，通过 `DocumentEditorLazy` 把 `{ enabled: true, provider, fragment, user }` 传给 `DocumentEditor`
8. 从 awareness 同步真实在线成员到文档页 `PresenceBar`
9. 保证 provider、Y.Doc 和 fragment 生命周期随文档切换正确释放或重建

具体实现见 `docs/collaboration/web-client-implementation.md`。标题 metadata 协同见 `docs/collaboration/metadata-title-collaboration.md`。协同持久化见 `docs/collaboration/persistence-implementation.md`。Presence 在线协作见 `docs/collaboration/presence-implementation.md`。

## 验证建议

最小工程验证：

```bash
tsc --noEmit -p packages/editor/tsconfig.json
tsc --noEmit -p apps/web/tsconfig.json
```

最小行为验证：

- 不传 `collaboration` 时，当前文档页本地编辑和保存仍可用
- 传入 `{ enabled: false }` 时，行为等同未传协同配置
- 传入 `{ enabled: true }` 时，类型要求必须提供 provider、fragment 和 user
- 协同启用时，BlockNote options 包含 `collaboration`
- 协同启用时，BlockNote options 不包含本地编辑模式的 `initialContent`
- 同时传入 `ai` 和 `collaboration` 时，AI toolbar、AI slash menu 和 `AIMenuController` 仍按原条件工作
