# 前端交接文档

## 文档目的

本文档用于记录当前工作台前端实现的状态，方便后续 AI 接手时无需重新梳理最近几轮 UI 决策。

## PRD 目录约定

课程 PRD 现在维护在仓库同级的 `prd` 目录中，并已按阶段拆分为子目录：

- `prd/01. 搭建项目`
- `prd/02. 富文本编辑与AI助手`
- `prd/03. 文档协同`

旧的根级 PRD 文件已经被整理进上述阶段目录。后续新增或更新需求文档时，不要再直接写到 `prd` 根目录，也不要重新创建旧的 `prd/文档协同` 目录。

当前文档协同 PRD 计划拆成多篇，均应写入 `prd/03. 文档协同`。目前已经完成并至少部分落地：

- `prd/03. 文档协同/01. 协同服务需求文档.md`
- `prd/03. 文档协同/02. 协同领域包需求文档.md`
- `prd/03. 文档协同/03. 编辑器协同接入需求文档.md`
- `prd/03. 文档协同/04. Web 文档页协同客户端需求文档.md`
- `prd/03. 文档协同/05. Web 文档元数据协同需求文档.md`
- `prd/03. 文档协同/06. Presence 在线协作需求文档.md`
- `prd/03. 文档协同/07. 协同文档持久化需求文档.md`
- `prd/03. 文档协同/08. 登录注册与系统角色需求文档.md`
- `prd/03. 文档协同/09. 文档权限与协作者管理需求文档.md`

后续还需要继续书写：

- `10. 协同版本与 AI 联动需求文档.md`（或按课程规划继续拆分）

第一篇协同服务 PRD 的范围只覆盖 `apps/collab` 中的 Hocuspocus WebSocket 传输服务。第二篇协同领域包 PRD 已经落地到 `packages/collaboration`，负责沉淀房间命名、协同用户、awareness、连接状态、presence 和客户端配置等共享协议。第七篇持久化 PRD 已经落地到 `apps/collab` 的 SQLite 持久化能力。

Web 端第一版真实登录注册与系统角色已经落地；文档级权限、协作者管理与协同 WebSocket 鉴权已经落地；AI 联动仍属后续阶段。`packages/editor` 协同配置、`apps/web` provider 创建、正文协同、标题 metadata 协同、文档页真实 presence UI 和协同 SQLite 持久化已经落地。

认证实现细节见 `docs/auth/implementation-status.md`。文档权限实现细节见 `docs/documents/implementation-status.md`。

**认证机制区分（避免与 JWT 登录混淆）**：

- **HTTP 登录 / 文档 API**：iron-session + HttpOnly Cookie（`ai-doc-session`），不是 JWT
- **协同 WebSocket**：短期协同 JWT（`POST /api/collaboration/token` 签发，须先有 Cookie 登录态）

## 当前协同服务状态

第一阶段协同服务已经落地到 `apps/collab`，当前不再是 console 占位入口。

当前事实如下：

- `apps/collab` 已可独立启动 Hocuspocus WebSocket 服务
- 默认监听地址为 `ws://localhost:1234`
- 支持通过环境变量 `PORT` 覆盖端口
- `PORT` 已做严格整数范围校验，非法值会启动失败并输出明确错误
- 服务端当前负责 Yjs document update / awareness 传输层、第一版 SQLite 持久化和 WebSocket 鉴权（短期协同 JWT + read 权限查库；HTTP 登录仍为 Cookie），不负责版本能力
- 默认 SQLite 路径为 `apps/collab/data/collaboration.sqlite`，可通过 `COLLAB_DATABASE_PATH` 覆盖
- `packages/collaboration` 已经是纯 TypeScript 协同协议包，不再是占位包
- 协同协议包已提供房间命名与解析、协同用户、稳定用户颜色、awareness、连接状态、presence 和客户端配置类型
- 房间名支持 `document:{documentId}` 与 `workspace:{workspaceId}:document:{documentId}`，其中 `documentId` 和 `workspaceId` 不能包含 `:`
- `DocumentPageContent` 统一创建协同 runtime，并通过 `DocumentEditorLazy` 把协同配置传给 `DocumentEditor`
- 正文协同使用 `Y.XmlFragment("document-store")`
- 标题协同使用同一个 Y.Doc 中的 `Y.Map("document-metadata")`
- 文档页 `PresenceBar` 已接入真实 awareness 在线成员；首页协作快照仍使用 mock 数据

更完整的协同服务交接说明见：

- `docs/collaboration/implementation-status.md`
- `docs/collaboration/protocol-package-status.md`
- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/persistence-implementation.md`
- `docs/collaboration/presence-implementation.md`

## 当前产品形态

当前 web 应用是一个以文档协作为核心的企业工作台原型，主要围绕以下可见界面组织：

- 工作台首页
- 文档编辑页
- RAG 检索工作台
- 设置页
- 登录页

侧边栏、文档页与首页最近文档/主 CTA 已接入真实文档 API（`documents` / `document_members` 业务表）；首页协作快照与活动记录仍使用 mock。文档编辑页已支持权限感知编辑、协作者管理与协同鉴权连接。

## 路由与主界面

- `/` 工作台首页
- `/docs/[id]` 文档编辑页
- `/search` 知识检索工作台
- `/settings` 工作台设置页
- `/login` 登录页

## 已经落地的关键 UI 决策

### 1. 工作台首页不再是解释型落地页

最近几轮调整已经明确移除了大量说明型文案，例如 mock 解释、占位描述以及重复性的 “workspace overview” 表达。

当前首页重点保留：

- 一个主操作卡片：进入文档工作区
- 两个次级入口：知识检索和设置
- 一个紧凑的协作快照区块
- 下方两个内容区块：最近文档与活动记录

这意味着首页应该持续保持“以操作为中心”的方向，而不是再退回课程演示板式的说明页。

### 1.5. 设置页已经成为真实的运行时配置入口

设置页不再只是占位页签。

当前已真实落地的只有 `AI 配置` 标签：

- provider 选择
- model 输入
- base URL 输入
- API Key 输入
- temperature / max tokens
- enabled actions 开关
- citation required 开关

其他设置标签目前仍然是占位入口，因此后续不要把“设置页已经整体接好”误判为既成事实。

### 2. 信息密度是被主动压低的

工作台里的辅助小字已经被有意识地大幅裁剪。后续修改不应重新引入以下内容：

- 重复的页面标签
- 面向开发者的占位文案
- 把模块含义重复说一遍的解释型副标题
- 长段的 mock 数据说明

如果确实需要保留实现说明，应写进 docs，而不是重新挂回产品界面。

### 3. 蓝色现在只作为强调色存在

视觉方向已经明确从“大面积蓝色铺底”纠正回来。

当前规则：

- 白色和浅灰色是主要表面层
- 极浅边框负责分隔区块
- 蓝色只用于强调，不再承担大面积背景

这一点很重要，因为工作台内仍然存在编辑器、检索面板等高信息密度区域；如果多个相邻区域都使用偏蓝底色，整页会显得发白且层次混乱。

## 当前视觉原则

### 表面层级

推荐的表面层级顺序：

1. 白色主卡片
2. 极浅灰色次级表面
3. 极浅边框
4. 蓝色只用于强调、指标、图标底、数字和选中态

### 文案层级

推荐的文案顺序：

1. 标题
2. 必要的状态或动作文本
3. 只有在确实提升可扫读性时，才保留一行简短辅助信息

不要为了避免留白而补充说明性文案。留白问题应靠布局解决，而不是靠额外文本填充。

### 交互层级

蓝色适合用于：

- 动作强调
- 图标底块
- 数字强调
- 链接或箭头提示
- 当前导航的激活状态

蓝色不适合用于：

- 整页带色背景
- 默认的大型色块卡片，除非有非常明确的理由
- 多个相邻面板同时大面积使用

错误提示当前采用白底 + 红色边界与图标强调的 toast，不属于需要回收进主色系统的问题。

## 关键实现锚点

当前这一轮视觉和结构决策，主要落在以下文件：

- `apps/web/src/app/globals.css`
- `apps/web/src/app/(workspace)/page.tsx`
- `apps/web/src/app/(workspace)/docs/[id]/page.tsx`
- `apps/web/src/app/(workspace)/settings/page.tsx`
- `apps/web/src/app/api/ai/editor/route.ts`
- `apps/web/src/components/ai/ai-settings-card.tsx`
- `apps/web/src/components/layout/workspace-layout.tsx`
- `apps/web/src/components/layout/workspace-sidebar.tsx`
- `apps/web/src/components/layout/workspace-topbar.tsx`
- `apps/web/src/components/editor/document-page-content.tsx`
- `apps/web/src/components/editor/editor-shell.tsx`
- `apps/web/src/components/editor/document-editor-lazy.tsx`
- `apps/web/src/components/editor/editor-loading-placeholder.tsx`
- `apps/web/src/app/(workspace)/docs/[id]/loading.tsx`
- `apps/web/src/hooks/use-document-collaboration.ts`
- `apps/web/src/hooks/use-documents.tsx`
- `apps/web/src/lib/documents-api.ts`
- `apps/web/src/lib/documents-client.ts`
- `apps/web/src/components/documents/document-role-badge.tsx`
- `apps/web/src/components/documents/document-access-denied.tsx`
- `apps/web/src/components/documents/document-member-dialog.tsx`
- `apps/web/src/lib/collaboration-config.ts`
- `apps/web/src/lib/collaboration-user.ts`
- `apps/web/src/lib/collaboration-metadata.ts`
- `apps/web/src/lib/collaboration-presence.ts`
- `apps/web/src/components/rag/rag-search-workbench.tsx`
- `apps/web/src/components/collaboration/presence-bar.tsx`
- `apps/web/src/lib/ai-settings.ts`
- `apps/web/src/lib/ai-runtime.ts`
- `apps/web/src/lib/blocknote-ai-server-adapter.ts`
- `apps/web/src/components/workspace/workspace-home-page.tsx`
- `apps/web/src/mock/workspace.ts`（协作快照、活动记录；`mock-documents.tsx` 已退出主路径）
- `apps/collab/src/index.ts`
- `apps/collab/src/config.ts`
- `apps/collab/src/server.ts`
- `packages/collaboration/src/index.ts`
- `packages/collaboration/src/room.ts`
- `packages/collaboration/src/colors.ts`
- `packages/collaboration/src/user.ts`
- `packages/collaboration/src/awareness.ts`
- `packages/collaboration/src/status.ts`
- `packages/collaboration/src/presence.ts`
- `packages/collaboration/src/client.ts`
- `packages/editor/src/blocknote/document-editor.tsx`
- `packages/editor/src/blocknote/create-editor-options.ts`

后续如果要继续调整工作台外观，应优先从这些文件入手，而不是在别处零散覆盖样式。

## 文档页性能与加载策略

当前文档页已经做过两类性能相关处理，后续修改时不应无意回退：

- `DocumentEditorLazy`：通过 `next/dynamic` 懒加载 `@ai-doc-platform/editor`，避免首页和其他非文档路由首屏加载 BlockNote 重型依赖
- `isEditorCollaborationReady`：协同 runtime 就绪前不挂载编辑器，避免 BlockNote 双初始化
- `preloadDocumentEditor()`：侧边栏在 idle / hover / focus 时预拉编辑器 chunk
- `docs/[id]/loading.tsx`：文档路由切换时提供占位 UI

## Mock 数据约定

当前首页协作快照、`activityFeed` 和部分工作台展示数据仍然依赖以下 mock 数据文件：

- `apps/web/src/mock/workspace.ts`

当前文档创建、列表、读取、重命名、删除与协作者管理主要依赖：

- `apps/web/src/lib/documents-api.ts`
- `apps/web/src/lib/documents-client.ts`
- `apps/web/src/hooks/use-documents.tsx`
- `apps/web/src/components/workspace/workspace-home-page.tsx`

当前 AI 设置持久化主要依赖：

- `apps/web/src/lib/ai-settings.ts`

当前 AI 路由与运行时约束主要依赖：

- `apps/web/src/app/api/ai/editor/route.ts`
- `apps/web/src/lib/ai-runtime.ts`
- `apps/web/src/lib/blocknote-ai-server-adapter.ts`

如果后续 AI 要把 mock 数据替换成真实数据，在没有明确产品方向变更的前提下，应尽量保留当前信息层级和显示结构。

## 建议后续 AI 继续推进的方向

### 可以安全继续推进的事项

- 继续优化内容卡片的间距与 hover 表现
- 继续扩展 settings 页面其余标签的真实表单
- 继续推进 `@ai-doc-platform/editor` 的命令通道，并复用 `@ai-doc-platform/collaboration` 的房间、用户、连接状态和 presence 协议
- 将 RAG 结果替换为真实检索载荷
- 将当前浏览器侧 AI Key 存储替换为更安全的服务端方案
- 将首页协作快照 mock presence 逐步替换为真实 awareness 数据

### 默认应避免的事项

- 重新往 UI 里塞入大段解释型文案
- 恢复大面积高饱和蓝底
- 把工作台首页做成营销页或演示海报页
- 让右侧相关面板同时变得很“响”
- 把“当前 AI 已可用”误写成“所有 AI 动作与引用链路都已完成”

## 当前 AI 实现边界

当前文档页的 AI 能力具有以下边界：

- AI 入口位于编辑器内部，而不是右侧独立面板
- 当前 runtime 只支持 OpenAI-compatible provider：`openai`、`deepseek`、`custom`
- `/api/ai/editor` 同时承载流式 chat 与 one-shot 动作请求
- route 中的 BlockNote server helper 已抽到 adapter，后续若官方修复运行时兼容性，可在 adapter 内切回官方导出
- editor 包负责拦截 toolbar 和 `/ai` 的 AI 触发点；当缺少 API Key 时，由 web 层 toast 提示用户前往设置页配置
- 未配置 key 时不会挂载真实 `AIExtension`，因此当前已避免选区触发 AI 工具栏时出现 `Extension not found`
- API Key 当前保存在浏览器 `localStorage`，仅适用于本地课程演示，不可视为生产方案

## 验证说明

最近几轮改动已经至少通过以下窄范围检查：

- `pnpm --filter collab typecheck`
- `pnpm --filter @ai-doc-platform/editor typecheck`
- `pnpm --filter web typecheck`

协同服务第一阶段额外通过过：

- `pnpm --filter collab dev`
- `pnpm -r typecheck`
- 使用非法 `PORT` 值启动时明确失败并输出错误原因

后续如果继续改动这些核心界面，结束任务前至少应补一条对应范围的 typecheck 或等价验证。
