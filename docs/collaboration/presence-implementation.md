# Web 文档页 Presence 在线协作实现交接

## 文档目的

本文档记录 `06. Presence 在线协作需求文档` 当前已经落地到 `apps/web` 的代码事实，说明平台层 `PresenceBar` 如何从 `HocuspocusProvider.awareness` 读取真实在线成员，以及它与 BlockNote 远程光标、标题 metadata 协同的边界关系。

## 当前结论

文档页顶部的 `PresenceBar` 已经不再使用 mock `document.viewers` 或 `presenceSummary`。

当前平台层在线成员来自：

```text
HocuspocusProvider.awareness
  -> CollaborationAwarenessState（平台字段 merge 写入）
  -> CollaborationPresenceMember[]
  -> PresenceBar
```

这不是重新实现 BlockNote 远程光标。编辑器内部的远端光标和选区仍由 `packages/editor` + BlockNote collaboration 负责；`PresenceBar` 只消费平台 awareness 字段，展示“当前文档谁在线”。

## 已落地能力

当前已经落地：

- `useDocumentCollaboration()` 在 runtime 就绪后 merge 写入本地 `CollaborationAwarenessState`
- awareness state 至少包含 `user`、`room`、`isEditing`、`updatedAt`
- hook 监听 `provider.awareness.on("change")` 并转换为 `CollaborationPresenceMember[]`
- hook 输出 `presenceMembers`
- 无效 awareness state 会被过滤，不会导致页面崩溃
- 本地客户端通过 `isLocal: true` 标记
- `PresenceBar` 使用 `members.length` 展示在线人数
- `PresenceBar` 使用 `member.user.color` 和姓名缩写作为头像 fallback
- `PresenceBar` 使用当前协同连接状态渲染 badge 和空状态文案
- 同一文档页只创建一套协同 runtime：`useDocumentCollaboration()` 提升到 `DocumentPageContent`
- `EditorShell` 改为纯消费协同 props，不再内部调用 hook
- 文档 read 权限就绪前不会启动协同 runtime：`enabled: Boolean(document?.permissions.canRead)`
- `disconnected` / `error` 状态下清空 presence 展示，避免“人数仍在线但 badge 已断开”的语义冲突

## 关键文件

当前实现主要落在：

- `apps/web/src/lib/collaboration-presence.ts`
- `apps/web/src/hooks/use-document-collaboration.ts`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/components/collaboration/presence-bar.tsx`

相关协议类型在：

- `packages/collaboration/src/awareness.ts`
- `packages/collaboration/src/presence.ts`
- `packages/collaboration/src/status.ts`

## 运行时结构

当前文档页协同与 presence 的数据流如下：

```text
DocumentPageContent
  -> useDocumentCollaboration({
       documentId,
       initialTitle,
       user,
       enabled: Boolean(document?.permissions.canRead),
     })
    -> HocuspocusProvider + Y.Doc
    -> mergePlatformAwarenessState()
    -> awareness.on("change") -> presenceMembers
  -> PresenceBar(members, status)
  -> EditorShell(collaboration, metadataTitle, ...)
    -> DocumentEditorLazy(collaboration)
```

`packages/editor` 不读取 `presenceMembers`，也不负责 presence UI。

## Presence 与 BlockNote 光标的关系

两者都基于同一个 `provider.awareness`，但消费方式不同：

| 能力 | 责任方 | 解决的问题 |
|------|--------|------------|
| BlockNote 远程光标 / 选区 | `packages/editor` | 编辑器内部“光标在哪里” |
| 平台 PresenceBar | `apps/web` | 页面层“谁正在这篇文档里协作” |

平台 awareness 写入必须使用 merge 策略：

```ts
awareness.setLocalState({
  ...getLocalState(),
  user,
  room,
  isEditing: true,
  updatedAt: Date.now(),
});
```

禁止整包覆盖 local state，避免冲掉 BlockNote 光标所需字段。

## Hook 输入与输出

`useDocumentCollaboration()` 当前输入：

```ts
type UseDocumentCollaborationInput = {
  documentId: string;
  initialTitle: string;
  user: CurrentUser | null;
  enabled?: boolean;
};
```

文档页当前调用约定：

```ts
useDocumentCollaboration({
  documentId,
  initialTitle: document?.title ?? "",
  user: currentUser,
  enabled: Boolean(document?.permissions.canRead),
});
```

`enabled` 必须等待 `GET /api/documents/:id` 成功且用户具备 read 权限。无权限时不应创建 provider。

当前输出在标题协同字段之外，还包含：

```ts
type UseDocumentCollaborationResult = {
  collaboration: DocumentEditorCollaborationConfig;
  isEditorCollaborationReady: boolean;
  presenceMembers: CollaborationPresenceMember[];
  roomName?: string;
  status: CollaborationConnectionStatus;
  error?: Error;
  metadataTitle: string;
  setMetadataTitle: (nextTitle: string) => void;
};
```

## `collaboration-presence.ts` 职责

该文件负责 awareness 校验、merge 写入和 presence 展示辅助，不引入 UI 依赖。

主要导出：

- `isCollaborationAwarenessState()`
- `buildCollaborationAwarenessState()`
- `mergePlatformAwarenessState()`
- `awarenessStatesToPresenceMembers()`
- `getPresenceMemberInitials()`
- `getPresenceStatusLabel()`
- `getPresenceEmptyMessage()`
- `getPresenceActivityMessage()`
- `isPresenceConnectionDegraded()`
- `getPresenceOnlineCount()`
- `getPresenceDisplayMembers()`

## PresenceBar 展示规则

`PresenceBar` 当前 props：

```ts
type PresenceBarProps = {
  members: CollaborationPresenceMember[];
  status: CollaborationConnectionStatus;
};
```

展示约定：

- 在线人数使用 `getPresenceOnlineCount(members, status)`
- 头像列表使用 `getPresenceDisplayMembers(members, status)`
- 副文案使用 `getPresenceActivityMessage(members, status)`
- badge 使用 `getPresenceStatusLabel(status)`
- 本地用户排在成员列表前面，并通过 `title` 属性附加“（我）”提示

连接降级规则：

- 当 `status` 为 `disconnected` 或 `error` 时，在线人数显示为 `0`
- 头像列表清空
- 副文案优先显示断开或异常说明，而不是“x 位成员正在协作”

## 生命周期约束

presence 相关逻辑必须遵守以下约束：

1. `presenceMembers` 不得进入 provider 创建 effect 的依赖数组
2. awareness 监听必须基于 `currentRuntime` 的独立 effect
3. 标题输入、正文输入、AI 请求结果不得触发 provider 重建
4. presence 更新不得改变 `DocumentEditor` 的 `key` 或 `collaboration` 引用稳定性策略

当前 provider 创建 effect 只依赖：

- `documentId`
- `enabled`
- `roomName`
- 协同 URL
- workspace id
- 当前协同用户

## 本地多浏览器验证

推荐验证步骤：

1. 启动协同服务和 Web：`pnpm dev:all`
2. 浏览器 A 创建文档并将 B 加为 editor（或准备两个有权限的账号）
3. 浏览器 B 登录对应账号
4. 两个浏览器打开同一篇 `/docs/[id]`
5. 确认 `PresenceBar` 显示 `2 人在线`
6. 确认头像缩写和颜色对应不同用户
7. 关闭其中一个浏览器后，另一方人数应减少
8. 切换不同文档时，不应混入其他房间成员
9. 停止 `apps/collab` 后，页面应显示 `0 人在线` 且 badge 为断开或异常状态
10. 正文、标题和 BlockNote 远程光标仍应正常工作

## 当前边界

本阶段明确不包含：

- 服务端 presence 持久化
- 离线成员历史
- awareness 层面的成员权限过滤（文档 HTTP API 与协同 JWT 鉴权已限制无 read 权限用户连接；HTTP 登录为 Cookie）
- 悬浮卡片等增强展示
- 正在输入提示
- 首页或侧边栏的真实在线成员展示
- `packages/editor` 改造

以下 mock 数据仍然存在，但不属于本篇交付范围：

- 首页协作快照仍来自 `apps/web/src/mock/workspace.ts`

## 验证记录

当前实现至少已经通过：

```bash
pnpm --filter web typecheck
pnpm --filter collab typecheck
```

## 相关文档

- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/implementation-status.md`
- `docs/collaboration/protocol-package-status.md`
- `docs/architecture/frontend-handoff.md`
- `docs/editor/integration-guide.md`
