import type { AIWorkspaceAction } from "../types";

export const TRANSLATION_ACTIONS: AIWorkspaceAction[] = [
  {
    key: "translate-to-en",
    title: "翻译成英文",
    description: "将当前内容翻译成自然准确的英文。",
    category: "translation",
    prompt:
      "Translate the provided content into natural, accurate, and professional English.",
    requiresSelection: true,
  },
];
