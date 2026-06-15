import type { AIWorkspaceAction } from "../types";

export const WRITING_ACTIONS: AIWorkspaceAction[] = [
  {
    key: "rewrite",
    title: "改写",
    description: "在不改变原意的前提下重写当前内容。",
    category: "writing",
    prompt:
      "Rewrite the provided content while preserving the original meaning and keeping the structure clear.",
    requiresSelection: true,
  },
  {
    key: "polish",
    title: "润色",
    description: "优化语言质量、语气和整体可读性。",
    category: "writing",
    prompt:
      "Polish the provided content to improve clarity, tone, fluency, and readability.",
    requiresSelection: true,
  },
  {
    key: "expand",
    title: "扩写",
    description: "基于当前内容补充更多细节、解释和示例。",
    category: "writing",
    prompt:
      "Expand the provided content with relevant details, supporting points, and concise examples.",
    requiresSelection: true,
  },
];
