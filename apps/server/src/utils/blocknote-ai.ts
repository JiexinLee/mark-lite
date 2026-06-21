import type { AIWorkspaceActionKey } from "@mark-lite/ai-workspace";
import type { MessageDocumentState } from "./blocknote";
import { extractDocumentStateFromMessages } from "./blocknote";

type UpdateOperation = {
  type: "update";
  id: string;
  block: string;
};

type AddOperation = {
  type: "add";
  referenceId: string;
  position: "before" | "after";
  blocks: string[];
};

export type ApplyDocumentOperationsInput = {
  operations: Array<UpdateOperation | AddOperation>;
};

type MessageDocumentStateWithoutSelection = Extract<
  MessageDocumentState,
  { selection: false }
>;

export function buildFinalOperationsInput(input: {
  documentState: MessageDocumentState | undefined;
  assistantText: string;
}): ApplyDocumentOperationsInput {
  const documentState = input.documentState;
  if (!documentState) {
    throw new Error("Missing BlockNote document state in AI request.");
  }

  if (documentState.selection) {
    const selectedBlock = documentState.selectedBlocks[0];

    if (!selectedBlock) {
      throw new Error("No selected block found for AI update.");
    }

    return {
      operations: [
        {
          type: "update",
          id: selectedBlock.id,
          block: createSingleHTMLBlock(input.assistantText),
        },
      ],
    };
  }

  const htmlBlocks = createHTMLBlocks(input.assistantText);
  const firstDocumentBlockId = findFirstDocumentBlockId(documentState);

  if (documentState.isEmptyDocument && firstDocumentBlockId) {
    const [firstBlock, ...restBlocks] = htmlBlocks;

    return {
      operations: [
        {
          type: "update",
          id: firstDocumentBlockId,
          block: firstBlock ?? createSingleHTMLBlock(input.assistantText),
        },
        ...(restBlocks.length > 0
          ? [
              {
                type: "add" as const,
                referenceId: firstDocumentBlockId,
                position: "after" as const,
                blocks: restBlocks,
              },
            ]
          : []),
      ],
    };
  }

  const anchor = findInsertionAnchor(documentState);
  if (!anchor) {
    throw new Error("Unable to determine insertion point for AI response.");
  }

  return {
    operations: [
      {
        type: "add",
        referenceId: anchor.referenceId,
        position: anchor.position,
        blocks: htmlBlocks,
      },
    ],
  };
}

export function buildStreamingOperationsInput(input: {
  documentState: MessageDocumentState | undefined;
  assistantText: string;
}): ApplyDocumentOperationsInput | undefined {
  const documentState = input.documentState;
  if (!documentState) {
    return undefined;
  }

  const block = createSingleHTMLBlock(input.assistantText);

  if (documentState.selection) {
    const selectedBlock = documentState.selectedBlocks[0];
    return selectedBlock
      ? {
          operations: [
            {
              type: "update",
              id: selectedBlock.id,
              block,
            },
          ],
        }
      : undefined;
  }

  const firstDocumentBlockId = findFirstDocumentBlockId(documentState);
  if (documentState.isEmptyDocument && firstDocumentBlockId) {
    return {
      operations: [
        {
          type: "update",
          id: firstDocumentBlockId,
          block,
        },
      ],
    };
  }

  const anchor = findInsertionAnchor(documentState);
  if (!anchor) {
    return undefined;
  }

  return {
    operations: [
      {
        type: "add",
        referenceId: anchor.referenceId,
        position: anchor.position,
        blocks: [block],
      },
    ],
  };
}

export function splitTextForStreaming(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + 16, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks.length > 0 ? chunks : [""];
}

export function inferActionKeyFromInstruction(
  instruction: string,
  messages: unknown[] | undefined,
): AIWorkspaceActionKey {
  const normalizedInstruction = instruction.toLowerCase();
  const documentState = extractDocumentStateFromMessages(messages);
  const hasSelection = documentState?.selection === true;

  if (
    normalizedInstruction.includes("summarize") ||
    normalizedInstruction.includes("summary") ||
    normalizedInstruction.includes("总结")
  ) {
    return "summarize-document";
  }

  if (
    normalizedInstruction.includes("citation") ||
    normalizedInstruction.includes("cite") ||
    normalizedInstruction.includes("reference") ||
    normalizedInstruction.includes("引用")
  ) {
    return "find-citations";
  }

  if (
    normalizedInstruction.includes("translate") ||
    normalizedInstruction.includes("翻译")
  ) {
    return "translate-to-en";
  }

  if (
    normalizedInstruction.includes("continue writing") ||
    normalizedInstruction.includes("write anything") ||
    normalizedInstruction.includes("action items") ||
    normalizedInstruction.includes("expand") ||
    normalizedInstruction.includes("继续") ||
    normalizedInstruction.includes("扩写")
  ) {
    return "expand";
  }

  if (
    normalizedInstruction.includes("improve writing") ||
    normalizedInstruction.includes("fix spelling") ||
    normalizedInstruction.includes("simplify") ||
    normalizedInstruction.includes("polish") ||
    normalizedInstruction.includes("润色")
  ) {
    return "polish";
  }

  return hasSelection ? "rewrite" : "expand";
}

function createHTMLBlocks(text: string): string[] {
  const paragraphs = splitIntoParagraphs(text);

  return paragraphs.length > 0
    ? paragraphs.map((paragraph) => wrapInParagraph(paragraph))
    : [wrapInParagraph(text)];
}

function createSingleHTMLBlock(text: string): string {
  return wrapInParagraph(text);
}

function wrapInParagraph(text: string): string {
  const normalized = text.trim() || " ";
  return `<p>${escapeHTML(normalized).replace(/\n/g, "<br>")}</p>`;
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findFirstDocumentBlockId(
  documentState: MessageDocumentStateWithoutSelection,
): string | undefined {
  return documentState.blocks.find(
    (block): block is { id: string; block: string } => "id" in block,
  )?.id;
}

function findInsertionAnchor(
  documentState: MessageDocumentStateWithoutSelection,
):
  | {
      referenceId: string;
      position: "before" | "after";
    }
  | undefined {
  const cursorIndex = documentState.blocks.findIndex(
    (block) => "cursor" in block,
  );
  const blockBeforeCursor = documentState.blocks
    .slice(0, cursorIndex < 0 ? documentState.blocks.length : cursorIndex)
    .reverse()
    .find((block): block is { id: string; block: string } => "id" in block);

  if (blockBeforeCursor) {
    return {
      referenceId: blockBeforeCursor.id,
      position: "after",
    };
  }

  const blockAfterCursor = documentState.blocks
    .slice(cursorIndex < 0 ? 0 : cursorIndex + 1)
    .find((block): block is { id: string; block: string } => "id" in block);

  if (blockAfterCursor) {
    return {
      referenceId: blockAfterCursor.id,
      position: "before",
    };
  }

  return undefined;
}
