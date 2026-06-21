import type { AIWorkspaceDocumentContext } from "@mark-lite/ai-workspace";
import type { BlockNoteBlock } from "../types/blocknote";

type MessageDocumentStateWithoutSelection = {
  selection: false;
  blocks: Array<{ id: string; block: string } | { cursor: true }>;
  isEmptyDocument: boolean;
};

type MessageDocumentStateWithSelection = {
  selection: true;
  selectedBlocks: Array<{ id: string; block: string }>;
  blocks: Array<{ block: string }>;
  isEmptyDocument: boolean;
};

export type MessageDocumentState =
  | MessageDocumentStateWithoutSelection
  | MessageDocumentStateWithSelection;

export function createTextContent(text: string) {
  return [
    {
      type: "text" as const,
      text,
      styles: {},
    },
  ];
}

export function createParagraphBlock(text: string): BlockNoteBlock {
  return {
    type: "paragraph",
    content: createTextContent(text),
  };
}

export function createHeadingBlock(text: string, level = 2): BlockNoteBlock {
  return {
    type: "heading",
    props: { level },
    content: createTextContent(text),
  };
}

export function extractPromptFromMessages(
  messages: unknown[] | undefined,
): string {
  if (!messages || messages.length === 0) {
    return "";
  }

  for (const candidate of [...messages].reverse()) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const role = Reflect.get(candidate, "role");
    const parts = Reflect.get(candidate, "parts");
    const content = Reflect.get(candidate, "content");

    if (role !== "user") {
      continue;
    }

    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }

    if (!Array.isArray(parts)) {
      continue;
    }

    const text = parts
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        return Reflect.get(part, "type") === "text"
          ? readTrimmedString(Reflect.get(part, "text"))
          : "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

export function extractDocumentStateFromMessages(
  messages: unknown[] | undefined,
): MessageDocumentState | undefined {
  if (!messages || messages.length === 0) {
    return undefined;
  }

  for (const candidate of [...messages].reverse()) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    if (Reflect.get(candidate, "role") !== "user") {
      continue;
    }

    const metadata = Reflect.get(candidate, "metadata");
    if (!isRecord(metadata)) {
      continue;
    }

    const documentState = Reflect.get(metadata, "documentState");
    if (isDocumentStateWithSelection(documentState)) {
      return documentState;
    }

    if (isDocumentStateWithoutSelection(documentState)) {
      return documentState;
    }
  }

  return undefined;
}

export function extractDocumentContextFromMessages(input: {
  messages: unknown[] | undefined;
  documentId?: string;
  title?: string;
  instruction: string;
}): AIWorkspaceDocumentContext {
  const documentId = input.documentId?.trim() || "draft-document";
  const title = input.title?.trim() || "Current document";
  const documentState = extractDocumentStateFromMessages(input.messages);

  if (!documentState) {
    return {
      documentId,
      title,
      selectedText: input.instruction,
      documentText: input.instruction,
    };
  }

  if (documentState.selection) {
    const selectedText = joinPlainText(
      documentState.selectedBlocks.map((block) => htmlToPlainText(block.block)),
    );
    const documentText = joinPlainText(
      documentState.blocks.map((block) => htmlToPlainText(block.block)),
    );

    return {
      documentId,
      title,
      ...(selectedText ? { selectedText } : {}),
      ...(documentText ? { documentText } : {}),
    };
  }

  const documentText = joinPlainText(
    documentState.blocks.flatMap((block) =>
      isHTMLBlockEntry(block) ? [htmlToPlainText(block.block)] : [],
    ),
  );
  const surroundingText = extractSurroundingText(documentState.blocks);

  return {
    documentId,
    title,
    ...(surroundingText ? { surroundingText } : {}),
    ...(documentText ? { documentText } : {}),
  };
}

function extractSurroundingText(
  blocks: Array<{ id: string; block: string } | { cursor: true }>,
): string {
  const cursorIndex = blocks.findIndex((block) => "cursor" in block);
  if (cursorIndex < 0) {
    return "";
  }

  const nearbyBlocks = blocks
    .slice(Math.max(0, cursorIndex - 2), cursorIndex + 3)
    .flatMap((block) =>
      isHTMLBlockEntry(block) ? [htmlToPlainText(block.block)] : [],
    );

  return joinPlainText(nearbyBlocks);
}

function joinPlainText(blocks: string[]): string {
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function htmlToPlainText(html: string): string {
  return decodeHTMLEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  ).trim();
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHTMLBlockEntry(
  value: { id: string; block: string } | { cursor: true },
): value is { id: string; block: string } {
  return (
    "id" in value &&
    typeof value.id === "string" &&
    typeof value.block === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isDocumentStateWithSelection(
  value: unknown,
): value is MessageDocumentStateWithSelection {
  if (!isRecord(value) || value.selection !== true) {
    return false;
  }

  return (
    Array.isArray(value.selectedBlocks) &&
    value.selectedBlocks.every(
      (block) =>
        isRecord(block) &&
        typeof block.id === "string" &&
        typeof block.block === "string",
    ) &&
    Array.isArray(value.blocks) &&
    value.blocks.every(
      (block) => isRecord(block) && typeof block.block === "string",
    ) &&
    typeof value.isEmptyDocument === "boolean"
  );
}

function isDocumentStateWithoutSelection(
  value: unknown,
): value is MessageDocumentStateWithoutSelection {
  if (
    !isRecord(value) ||
    value.selection !== false ||
    !Array.isArray(value.blocks)
  ) {
    return false;
  }

  const blocksValid = value.blocks.every(
    (block) =>
      (isRecord(block) &&
        typeof block.id === "string" &&
        typeof block.block === "string") ||
      (isRecord(block) && block.cursor === true),
  );

  return blocksValid && typeof value.isEmptyDocument === "boolean";
}
