import type { AIWorkspaceAction } from "../types";

export const RESEARCH_ACTIONS: AIWorkspaceAction[] = [
  {
    key: "find-citations",
    title: "从知识库查找引用",
    description: "基于当前文档或选区构造检索意图并生成引用线索。",
    category: "research",
    prompt:
      "Identify what evidence or citations are needed for the current content and summarize the retrieval intent.",
    requiresRag: true,
  },
];
