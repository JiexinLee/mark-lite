import { getAIWorkspaceActionByKey } from "../actions";
import type { AIWorkspaceDocumentContext } from "../context/document-context";
import type { AIWorkspaceActionKey, AIWorkspacePrompt } from "../types";

export type BuildAIWorkspacePromptInput = {
  actionKey: AIWorkspaceActionKey | string;
  context: AIWorkspaceDocumentContext;
};

export function buildAIWorkspacePrompt({
  actionKey,
  context,
}: BuildAIWorkspacePromptInput): AIWorkspacePrompt {
  const action = getAIWorkspaceActionByKey(actionKey);

  if (!action) {
    throw new Error(`Unknown AI workspace action: ${actionKey}`);
  }

  const sections: string[] = [
    `Document ID: ${context.documentId}`,
    `Document Title: ${context.title}`,
  ];

  if (context.selectedText) {
    sections.push(`Selected Text:\n${context.selectedText}`);
  }

  if (context.surroundingText) {
    sections.push(`Surrounding Text:\n${context.surroundingText}`);
  }

  if (context.documentText) {
    sections.push(`Document Text:\n${context.documentText}`);
  }

  if (context.ragSnippets && context.ragSnippets.length > 0) {
    const snippets = context.ragSnippets
      .map(
        (snippet, index) =>
          `[${index + 1}] ${snippet.title} | ${snippet.source}\n${snippet.excerpt}`,
      )
      .join("\n\n");

    sections.push(`RAG Snippets:\n${snippets}`);
  }

  return {
    system: [
      "You are an AI assistant for an enterprise document workspace.",
      `Current action: ${action.title}.`,
      action.prompt,
      action.requiresRag
        ? "Use citation snippets when they are available and clearly indicate supporting evidence."
        : "Focus on the provided document context and keep the output grounded.",
    ].join(" "),
    user: sections.join("\n\n"),
  };
}
