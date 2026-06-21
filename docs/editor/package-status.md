# Editor 文档索引

## 文档目的

`docs/editor` 目录现在按“包说明 + 接入指南 + 协同配置说明 + 后续演进计划”拆分维护，避免把稳定事实、接入步骤、阶段能力和未来规划混写在同一份文档里。

## 阅读顺序

建议按以下顺序阅读：

1. `package-overview.md`：了解 `@ai-doc-platform/editor` 的当前边界、结构和公开 API
2. `integration-guide.md`：了解 `apps/web` 当前如何消费 editor 包
3. `collaboration-config.md`：了解 editor 包当前协同配置能力、类型约束和边界
4. `docs/ai/implementation-status.md`：了解当前 AI 设置、编辑器 AI 接入与服务端路由的实现状态
5. `evolution-plan.md`：了解后续推进 editor 包时的优先级与拆解方向
6. `docs/collaboration/presence-implementation.md`：了解文档页真实 presence 展示与 awareness 边界

## 文档清单

### Editor 目录

- `docs/editor/package-overview.md`
- `docs/editor/integration-guide.md`
- `docs/editor/collaboration-config.md`
- `docs/ai/implementation-status.md`
- `docs/editor/evolution-plan.md`

### 协同相关文档

- `docs/collaboration/implementation-status.md`
- `docs/collaboration/web-client-implementation.md`
- `docs/collaboration/metadata-title-collaboration.md`
- `docs/collaboration/presence-implementation.md`
- `docs/collaboration/protocol-package-status.md`

### 架构与设计

- `docs/architecture/frontend-handoff.md`
- `docs/design/color-system.md`

## 维护约定

- 稳定事实改到 `package-overview.md`
- 接入链路变更改到 `integration-guide.md`
- editor 协同配置类型、适配规则和边界改到 `collaboration-config.md`
- 新的阶段目标、风险和优先级改到 `evolution-plan.md`
- 如果某条信息同时影响三份文档，优先保留单一事实来源，其他文档只做引用或简述
