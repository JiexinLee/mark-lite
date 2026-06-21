import {
  createAIWorkspaceRequest,
  generateAIWorkspaceText,
  type AIWorkspaceActionKey,
} from "@mark-lite/ai-workspace";
import { createUIMessageStream } from "ai";
import {
  buildFinalOperationsInput,
  buildStreamingOperationsInput,
  inferActionKeyFromInstruction,
  splitTextForStreaming,
} from "../utils/blocknote-ai";
import {
  extractPromptFromMessages,
  extractDocumentContextFromMessages,
  extractDocumentStateFromMessages,
} from "../utils/blocknote";

export type ChatRequestPayload = {
  documentId?: string | undefined;
  title?: string | undefined;
  prompt?: string | undefined;
  messages?: unknown[] | undefined;
  actionKey?: AIWorkspaceActionKey | undefined;
};

export type ChatResult = {
  assistantText: string;
};

export async function buildChatResult(
  payload: ChatRequestPayload,
): Promise<ChatResult> {
  const instruction =
    payload.prompt?.trim() || extractPromptFromMessages(payload.messages);
  const actionKey =
    payload.actionKey ||
    inferActionKeyFromInstruction(instruction, payload.messages);
  const request = createAIWorkspaceRequest({
    documentId: payload.documentId,
    actionKey,
    instruction,
    title: payload.title,
  });

  request.context = extractDocumentContextFromMessages({
    messages: payload.messages,
    documentId: request.documentId,
    title: payload.title ?? request.context.title,
    instruction,
  });

  const assistantText = await generateAIWorkspaceText(request);

  return {
    assistantText,
  };
}

export async function createChatStream(payload: ChatRequestPayload) {
  const result = await buildChatResult(payload);
  const documentState = extractDocumentStateFromMessages(payload.messages);
  const finalInput = buildFinalOperationsInput({
    documentState,
    assistantText: result.assistantText,
  });

  const stream = createUIMessageStream({
    async execute({ writer }) {
      const toolCallId = "apply-document-operations";
      let streamedToolInput = "";
      let streamedAssistantText = "";

      writer.write({
        type: "start",
      });

      writer.write({
        type: "start-step",
      });

      writer.write({
        type: "text-start",
        id: "assistant-response",
      });

      writer.write({
        type: "tool-input-start",
        toolCallId,
        toolName: "applyDocumentOperations",
      });

      for (const chunk of splitTextForStreaming(result.assistantText)) {
        streamedAssistantText += chunk;

        writer.write({
          type: "text-delta",
          id: "assistant-response",
          delta: chunk,
        });

        const streamingInput = buildStreamingOperationsInput({
          documentState,
          assistantText: streamedAssistantText,
        });

        if (streamingInput) {
          const nextToolInput = JSON.stringify(streamingInput);
          const delta = nextToolInput.slice(streamedToolInput.length);

          if (delta) {
            writer.write({
              type: "tool-input-delta",
              toolCallId,
              inputTextDelta: delta,
            });
            streamedToolInput = nextToolInput;
          }
        }

        await delay(35);
      }

      writer.write({
        type: "text-end",
        id: "assistant-response",
      });

      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: "applyDocumentOperations",
        input: finalInput,
      });

      writer.write({
        type: "finish-step",
      });

      writer.write({
        type: "finish",
        finishReason: "stop",
      });
    },
  });

  return {
    stream,
    result,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
