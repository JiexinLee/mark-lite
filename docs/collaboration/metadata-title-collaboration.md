# Web 文档元数据标题协同实现交接

## 文档目的

本文档记录 `05. Web 文档元数据协同需求文档` 当前已经落地的代码事实，说明文档标题如何进入协同范围、它和正文协同的关系、业务 title 与 Y.Map title 的双源同步，以及列表层后续能力应如何接手。

## 当前结论

文档页顶部标题已经进入协同范围。标题不再以 `EditorShell` 本地 `useState(document.title)` 作为真实来源，而是由 `useDocumentCollaboration()` 暴露的 `metadataTitle` 驱动。

标题协同没有放入 BlockNote 正文 fragment，而是放在同一个 Y.Doc 的独立 metadata map 中：

```text
Y.Doc
  ├─ Y.XmlFragment("document-store")
  │   └─ BlockNote 正文协同
  └─ Y.Map("document-metadata")
      └─ title
```

## 已落地能力

当前已经落地：

- `DOCUMENT_METADATA_MAP_NAME = "document-metadata"`
- `DOCUMENT_TITLE_METADATA_KEY = "title"`
- `readDocumentTitleMetadata()` 只接受 string 类型 title
- `writeDocumentTitleMetadata()` 写入 Y.Map title
- `useDocumentCollaboration()` 输入增加 `initialTitle`
- `useDocumentCollaboration()` 输出增加 `metadataTitle`
- `useDocumentCollaboration()` 输出增加 `setMetadataTitle()`
- hook 在 `DocumentPageContent` 中统一调用，并在文档 read 权限就绪后启用：`enabled: Boolean(document?.permissions.canRead)`
- hook 在同一个 Y.Doc 中获取 `ydoc.getMap("document-metadata")`
- hook 使用 Y.Map observe 监听 title 变化
- observe 在文档切换或组件卸载时清理
- metadata title 缺失且连接状态进入 `synced` 后，使用 `initialTitle` 做一次性初始化
- 标题输入框 value 使用 `metadataTitle`
- 标题输入框 onChange 调用 `setMetadataTitle()`
- owner/editor 改标题时节流 `PATCH /api/documents/:id`，同步业务 `documents.title`
- AI 上下文 title 使用当前 `metadataTitle`
- 右侧文档状态卡片使用当前 `metadataTitle`

## 关键文件

当前实现主要落在：

- `apps/web/src/lib/collaboration-config.ts`
- `apps/web/src/lib/collaboration-metadata.ts`
- `apps/web/src/hooks/use-document-collaboration.ts`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/lib/documents-client.ts`

## 数据结构与常量

metadata map 名称定义在 `apps/web/src/lib/collaboration-config.ts`：

```ts
export const DOCUMENT_METADATA_MAP_NAME = "document-metadata";
```

title key 和读写 helper 定义在 `apps/web/src/lib/collaboration-metadata.ts`：

```ts
export const DOCUMENT_TITLE_METADATA_KEY = "title";

export function readDocumentTitleMetadata(
  metadata: Y.Map<unknown>,
): string | undefined;

export function writeDocumentTitleMetadata(
  metadata: Y.Map<unknown>,
  title: string,
): void;
```

当前 helper 会把非 string title 视为缺失值。不要在组件里直接手写 `metadata.get("title")` 或 `metadata.set("title", ...)`。

## Hook 行为

`useDocumentCollaboration()` 现在由 `DocumentPageContent` 调用，而不是 `EditorShell`。文档页会在 `GET /api/documents/:id` 成功且具备 read 权限后启用协同：

```ts
enabled: Boolean(document?.permissions.canRead)
```

`useDocumentCollaboration()` 当前输入包含：

```ts
type UseDocumentCollaborationInput = {
  documentId: string;
  initialTitle: string;
  user: CurrentUser | null;
  enabled?: boolean;
};
```

`initialTitle` 来自业务文档 API 返回的 `document.title`。

当前输出包含：

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

当 runtime 不可用时，`metadataTitle` 回退到 `initialTitle`。当 runtime 可用时，标题以 Y.Map 中的 string title 为准；如果 Y.Map 中缺少 title，则在协同状态进入 `synced` 后写入 `initialTitle`。

## 初始化策略

当前实现采用保守的一次性初始化策略：

```text
if status === "synced" and metadata title is missing:
  metadata.title = initialTitle
```

这个策略避免了刚创建本地 Y.Doc 时立即用业务 title 覆盖远端状态。如果协同 SQLite 中已有 metadata title，Web 端不会再用 `initialTitle` 覆盖它；如果数据库中没有 title，Web 端仍可在 `synced` 后使用 `initialTitle` 做一次性初始化。多客户端同时首次进入空 metadata 时，最终 title 仍由 Yjs map 同步结果决定。

## EditorShell 接入

`EditorShell` 当前不再维护本地标题 state。标题相关链路如下：

```text
Input value
  -> metadataTitle

Input onChange（仅 owner/editor）
  -> setMetadataTitle(event.target.value)
  -> scheduleTitleSync()  // 节流 PATCH /api/documents/:id

AI context
  -> title: metadataTitle.trim() || document.title

Right card title
  -> metadataTitle.trim() || "未命名文档"
```

viewer 标题输入框为 `readOnly`。协同层允许空字符串；展示层可 fallback 到「未命名文档」；业务 API 写入时会归一化空标题。

## 与正文协同的关系

标题和正文共享同一个 Y.Doc、同一个 room name、同一个 provider 和同一条 WebSocket 连接。

二者不同的是数据结构：

- 正文：`Y.XmlFragment("document-store")`
- 标题：`Y.Map("document-metadata").get("title")`

标题变化不应该改变 `DocumentEditor` 的 collaboration prop 中的 provider、fragment 或 user 引用，也不应该触发 provider 重建。

## 与持久化的关系

文档页当前没有「保存文档」按钮。标题与正文分属两层：

```text
Y.Map title + 正文 fragment
  -> Hocuspocus -> collaboration.sqlite（自动持久化）

业务 documents.title
  -> PATCH /api/documents/:id（owner/editor 改标题时节流同步）
```

Y.Map 中的标题 metadata 由 `apps/collab` 自动持久化，不需要手动保存。重启 collab 后同一 `documentName` 的标题可从协同 SQLite 恢复。详见 `docs/collaboration/persistence-implementation.md`。

## 与侧边栏和首页的关系

文档页顶部标题输入框和右侧状态卡片读取 `metadataTitle`（Y.Map）。

侧边栏与首页最近文档读业务 API 的 `documents.title` 和 `updatedAt`，不实时订阅 Y.Map。owner/editor 改标题并触发 PATCH 后，刷新列表或重新进入工作台会看到更新后的业务 title；在 PATCH 完成前，列表可能与文档页 metadata title 短暂不一致。这是当前 MVP 的已知边界。

后续若要实时一致，应单独设计列表层订阅 metadata 或统一文档仓储，不要让侧边栏直接读取某个文档页组件里的 hook 状态。

## 本地验证方式

启动服务：

```bash
pnpm dev:all
```

### 标题持久化验证

1. 启动 `pnpm dev:all`
2. 修改文档标题
3. 执行 `pnpm stop:collab`
4. 重新启动 collab
5. 重新打开同一文档
6. 标题应恢复为修改后的值

双浏览器实时同步验证：

1. 浏览器 A 创建文档并将 B 加为 editor（或使用两个已有权限的账号）
2. 浏览器 B 登录对应账号
3. 两个浏览器打开同一篇文档
4. A 修改标题，B 的标题输入框应同步变化
5. B 修改标题，A 的标题输入框应同步变化
6. 标题同步不需要点击保存按钮
7. 清空标题时，另一端输入框也应为空
8. 右侧卡片可显示“未命名文档”作为展示 fallback
9. 正文协同仍应正常工作

验证 provider 未重建时，可观察浏览器控制台中的 `[collaboration] connecting ...` 日志。连续输入标题时不应反复出现新的连接日志。

## 已知边界

当前仍未实现：

- 标题版本历史
- 标题字符级协同体验
- 列表层与 Y.Map title 的实时订阅同步

标题 metadata 已随整份 Y.Doc 持久化到 SQLite，服务重启后可恢复。HTTP 层已对 viewer 的标题 PATCH 返回 403；协同层暂不拦截 viewer 对 Y.Map 的写入。

当前 title 使用 Y.Map 存储整体字符串。多人同时编辑标题时，最终以 Yjs map 同步结果为准；如果后续需要标题字符级协同，再评估 `Y.Text`。

## 相关文档

- `docs/collaboration/persistence-implementation.md`

## 验证记录

最近一次实现后已通过：

```bash
pnpm --filter web typecheck
pnpm --filter collab typecheck
```

后续修改 `useDocumentCollaboration()`、metadata helper、`DocumentPageContent` 或 `EditorShell` 标题链路时，至少重新运行：

```bash
pnpm --filter web typecheck
```
