# 协同协议包实现状态

## 文档目的

本文档记录 `packages/collaboration` 当前已经落地的协同协议层能力，方便 editor、Web 协同客户端、presence、鉴权和持久化继续复用统一约定。

当前 `packages/collaboration` 已经不再是占位包。它现在负责定义平台内部协同公共语言，但不负责创建协同运行时。

## 当前已落地能力

当前包已经提供以下能力：

- 文档协同房间类型：`CollaborationRoomInput`、`CollaborationRoom`
- 文档房间名生成函数：`createDocumentRoomName()`
- 文档房间名解析函数：`parseDocumentRoomName()`
- 协同用户类型：`CollaborationUser`
- 协同用户颜色池：`collaborationUserColors`
- 基于用户 ID 的稳定颜色函数：`getCollaborationUserColor()`
- awareness 状态类型：`CollaborationAwarenessState`
- 协同连接状态类型：`CollaborationConnectionStatus`
- 在线成员展示类型：`CollaborationPresenceMember`
- 协同客户端配置类型：`CollaborationClientConfig`

## 当前模块结构

当前实现集中在以下文件：

- `packages/collaboration/src/index.ts`
- `packages/collaboration/src/room.ts`
- `packages/collaboration/src/user.ts`
- `packages/collaboration/src/colors.ts`
- `packages/collaboration/src/awareness.ts`
- `packages/collaboration/src/status.ts`
- `packages/collaboration/src/presence.ts`
- `packages/collaboration/src/client.ts`

职责拆分如下：

- `room.ts` 负责房间类型、房间名生成和解析
- `user.ts` 负责协同用户类型
- `colors.ts` 负责协同用户颜色池和稳定颜色函数
- `awareness.ts` 负责平台 awareness 状态类型
- `status.ts` 负责平台连接状态类型
- `presence.ts` 负责在线成员展示类型
- `client.ts` 负责后续协同客户端配置类型
- `index.ts` 只负责统一导出公开 API

## 房间命名协议

当前支持两种标准房间名。

只有 `documentId` 时：

```text
document:{documentId}
```

同时存在 `workspaceId` 和 `documentId` 时：

```text
workspace:{workspaceId}:document:{documentId}
```

生成入口必须使用 `createDocumentRoomName()`，不要在业务模块里手写字符串拼接。

示例：

```ts
createDocumentRoomName({ documentId: "project-overview" });
// document:project-overview

createDocumentRoomName({
  workspaceId: "demo",
  documentId: "project-overview",
});
// workspace:demo:document:project-overview
```

## 房间字段校验规则

`documentId` 必须是裁剪后非空字符串。

`workspaceId` 是可选字段，但如果传入，也必须是裁剪后非空字符串。

`documentId` 和 `workspaceId` 当前都不能包含 `:`。原因是 `:` 是房间名协议的结构分隔符，如果允许业务 ID 包含 `:`，生成函数可能产出解析函数无法 round-trip 的房间名。

当前选择是直接禁止 `:`，而不是做 encode/decode。这样协议更直观，也能避免后续服务端、客户端和日志里出现多套编码语义。

## 房间解析协议

`parseDocumentRoomName()` 支持解析当前两种标准格式。

解析成功时返回：

```ts
type CollaborationRoom = {
  workspaceId?: string;
  documentId: string;
  roomName: string;
};
```

解析失败时返回 `null`，不会抛错。这个选择是为了让 `apps/web`、`apps/collab` 和后续其他包可以自行决定非法房间名的处理方式。

## 用户颜色协议

`collaborationUserColors` 是固定颜色池，使用 CSS color string，不依赖 Tailwind class。

`getCollaborationUserColor(userId)` 基于裁剪后的 `userId` 做稳定 hash 映射：

- 同一个 `userId` 多次调用返回同一颜色
- 空 `userId` 返回默认颜色
- 不引入第三方 hash 依赖
- 不读取浏览器、Node 或外部运行时状态

后续如果要调整颜色池，应注意数组顺序会影响已有用户的颜色映射结果。

## 当前边界

当前包只提供协议层，不提供协同运行时。

明确不包含：

- 不创建 `Y.Doc`
- 不创建 `HocuspocusProvider`
- 不操作 Yjs awareness 实例
- 不封装 BlockNote collaboration option
- 不提供 React hook
- 不读取浏览器 `window`
- 不读取 Node `process.env`
- 不接入数据库
- 不接入鉴权或权限模型
- 不实现 presence UI

## 与其他模块的关系

`apps/collab` 已使用 `parseDocumentRoomName()` 的输入格式作为 Hocuspocus `documentName` 持久化 key，并在 `onAuthenticate` 中基于解析结果校验文档 read 权限。

`apps/web` 当前已经使用 `createDocumentRoomName()` 为文档页创建 provider 连接目标，把真实登录用户（`CurrentUser`）转换成 `CollaborationUser`，并把 awareness state 转换为 `CollaborationPresenceMember[]` 供文档页 `PresenceBar` 展示。多 workspace 或权限扩展时，仍应复用本包的房间、用户和 presence 协议。

`packages/editor` 已经消费 `CollaborationUser`，并支持接收更上层传入的协同配置。editor 包只负责把平台协同配置适配为 BlockNote collaboration option，不重新定义用户颜色、连接状态或房间命名规则。

## 验证建议

包级验证命令：

```bash
pnpm --filter @ai-doc-platform/collaboration typecheck
```

根级回归验证命令：

```bash
pnpm -r typecheck
```

手动验证建议：

1. 调用 `createDocumentRoomName({ documentId: "project-overview" })`，确认返回 `document:project-overview`
2. 调用 `createDocumentRoomName({ workspaceId: "demo", documentId: "project-overview" })`，确认返回 `workspace:demo:document:project-overview`
3. 调用 `parseDocumentRoomName()` 解析上述两个结果，确认能得到正确字段
4. 调用 `parseDocumentRoomName("document:a:b")`，确认返回 `null`
5. 调用 `createDocumentRoomName({ documentId: "a:b" })`，确认会抛出明确错误
6. 多次调用 `getCollaborationUserColor("user-1")`，确认返回稳定颜色

## 后续衔接建议

后续协同功能应优先复用本包已有协议，而不是在业务包里重新定义类似结构。

建议推进顺序：

1. 将首页协作快照的 mock presence 逐步替换为真实 awareness 数据
2. 评估列表层如何订阅协同 metadata，减少业务 title 与 Y.Map title 的短暂不一致
3. 后续多 workspace、版本能力继续复用本包的房间、用户和连接状态协议

业务文档表与协同 WebSocket JWT 鉴权已落地；HTTP 登录为 Cookie 会话（非 JWT）。详见 `docs/auth/implementation-status.md` 与 `docs/documents/implementation-status.md`。

相关 editor 侧协同配置边界见 `docs/editor/collaboration-config.md`。Web 客户端落地状态见 `docs/collaboration/web-client-implementation.md`。持久化实现见 `docs/collaboration/persistence-implementation.md`。Presence 实现见 `docs/collaboration/presence-implementation.md`。
