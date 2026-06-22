# Editor 后续演进计划

## 文档目的

本文档记录 `@ai-doc-platform/editor` 后续继续推进时的优先级、拆解建议和风险提示。这里描述的是计划，不是当前已实现事实。

## 当前演进方向

如果继续推进 `editor` 包，建议优先沿以下顺序演进。

## 已完成阶段

以下能力已经完成，不应继续作为待办写入规划：

- editor 包已暴露 `ai`、`buildAIContext`、`onAIError` 接口
- `apps/web` 已落地 AI 设置页与浏览器本地持久化
- `/api/ai/editor` 已同时支持 chat 流式请求与 one-shot 动作请求
- BlockNote AI toolbar button、slash menu、AI menu 已在文档页打通
- route 错误已通过 `onAIError` 和页面 toast 直接暴露
- editor 包已支持接收 `DocumentEditorCollaborationConfig`，并能把外部 provider、Yjs fragment 和平台协同用户适配为 BlockNote collaboration option
- editor 包在协同启用时已经跳过本地编辑模式的 `initialContent`，避免覆盖已有 Yjs 文档
- `apps/web` 文档页已经接入真实 presence 展示；首页协作快照仍未接入真实 awareness
- `apps/collab` 已接入 SQLite 持久化，按 `documentName` 保存和恢复整份 Y.Doc 状态
- 业务文档表、文档权限、协作者管理与协同 WebSocket 鉴权已落地（见 `docs/documents/implementation-status.md`）

## 第一阶段：补齐可维护性与安全性

目标：在已有最小可用 AI 能力上，优先补齐安全边界与可维护性，而不是继续横向铺功能。

建议事项：

1. 为 `DocumentEditor`、route adapter 与序列化层补最小测试，锁住当前兼容性
2. 把 BlockNote AI adapter 的存在原因与未来回切条件固化到文档与代码注释
3. 将浏览器侧 API Key 存储替换为更安全的服务端方案或临时 token 方案

## 第二阶段：补齐真实检索与引用链路

目标：让当前“AI 能回答”升级为“AI 能基于真实资料引用并执行可解释动作”。

建议事项：

1. 将 RAG 片段与 citation 要求从 prompt 约束推进为真实数据链路
2. 明确 `enabledActions` 中哪些动作已可用、哪些仍然只是占位
3. 设计引用插入、总结回写、改写建议等动作的执行协议与结果展示

## 第三阶段：列表层协同数据与业务扩展

目标：在业务文档 API、权限闭环和 Web 协同客户端已经落地的基础上，继续推进列表层与协同 metadata 的实时一致性，以及评论等业务化扩展。

建议事项：

1. 设计列表层如何订阅或读取协同 metadata，减少业务 `documents.title` 与 Y.Map title 的短暂不一致
2. 将首页协作快照的 mock presence 逐步替换为真实 awareness 数据
3. 清理 `mock-documents.tsx` 等遗留 mock 主路径引用
4. 评估评论、批注、引用块等业务化扩展的落点

## 风险与注意事项

### 不要把 demo 内容当成产品协议

`initial-content.ts` 当前更接近运行时兜底，而不是稳定模板系统。后续若直接基于这些文案扩展业务，容易把示例内容误固化为产品结构。

### 不要过早把应用职责收进 editor 包

标题输入、权限感知只读态、页面级脏状态和路由离开提醒，当前都更适合保留在应用层。editor 包应优先保持清晰的编辑边界，而不是过早膨胀为页面控制器。

同理，AI 设置表单、API Key 管理与页面 toast 也仍应保留在应用层。

### Web 协同运行时要延续当前边界

editor 包已经只负责 collaboration option 适配。后续在 `apps/web` 继续推进鉴权、评论系统或列表层协同展示时，仍应避免把连接、持久化、鉴权和权限逻辑收进 `packages/editor`。协同持久化细节见 `docs/collaboration/persistence-implementation.md`。

## 里程碑建议

可以按以下里程碑拆分：

1. 兼容性测试 + 安全存储方案
2. 真实 citation / action 执行协议
3. 仓储接口抽象 + 列表层协同数据接入
