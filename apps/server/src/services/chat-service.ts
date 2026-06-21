import {
  createAIWorkspaceRequest,
  generateAIWorkspaceText,
  type AIWorkspaceActionKey,
} from "@mark-lite/ai-workspace";
import { createUIMessageStream } from "ai";
import type { BlockNoteBlock } from "../types/blocknote";
import {
  createHeadingBlock,
  createParagraphBlock,
  extractPromptFromMessages,
} from "../utils/blocknote";

export type ChatRequestPayload = {
  documentId?: string | undefined;
  prompt?: string | undefined;
  messages?: unknown[] | undefined;
  actionKey?: AIWorkspaceActionKey | undefined;
};

export type ChatResult = {
  assistantText: string;
  blocks: BlockNoteBlock[];
};

export async function buildChatResult(
  payload: ChatRequestPayload,
): Promise<ChatResult> {
  const instruction =
    payload.prompt?.trim() || extractPromptFromMessages(payload.messages);
  const request = createAIWorkspaceRequest({
    documentId: payload.documentId,
    actionKey: payload.actionKey,
    instruction,
  });
  const assistantText = await generateAIWorkspaceText(request);

  return {
    assistantText,
    blocks: createBlocksFromAssistantText(assistantText),
  };
}

export async function createChatStream(payload: ChatRequestPayload) {
  const result = await buildChatResult(payload);

  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: "data-blocks",
        data: {
          documentId: payload.documentId ?? "draft-document",
          blocks: result.blocks,
        },
      });

      writer.write({
        type: "text-start",
        id: "assistant-response",
      });

      writer.write({
        type: "text-delta",
        id: "assistant-response",
        delta: result.assistantText,
      });

      writer.write({
        type: "text-end",
        id: "assistant-response",
      });
    },
  });

  return {
    stream,
    result,
  };
}

function createBlocksFromAssistantText(text: string): BlockNoteBlock[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [createParagraphBlock(text)];
  }

  return [
    createHeadingBlock("AI Draft", 2),
    ...paragraphs.map((paragraph) => createParagraphBlock(paragraph)),
  ];
}
