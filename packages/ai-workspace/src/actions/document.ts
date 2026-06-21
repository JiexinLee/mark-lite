import type { AIWorkspaceAction } from "../types";

export const DOCUMENT_ACTIONS: AIWorkspaceAction[] = [
  {
    key: "summarize-document",
    title: "总结当前文档",
    description: "基于当前文档上下文生成摘要。",
    category: "document",
    prompt:
      "Summarize the current document into a concise and structured overview, preserving the key points.",
  },
];
