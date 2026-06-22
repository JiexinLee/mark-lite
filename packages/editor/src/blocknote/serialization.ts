import type { PartialBlock } from "@blocknote/core";
import type { EditorBlock, EditorDocumentContent } from "../types";

type BlockLike = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown;
};

function isBlockLike(value: unknown): value is BlockLike {
  return typeof value === "object" && value !== null;
}

function toEditorBlock(block: BlockLike): EditorBlock {
  const children = Array.isArray(block.children)
    ? block.children.filter(isBlockLike).map(toEditorBlock)
    : undefined;

  return {
    id: block.id,
    type: block.type ?? "paragraph",
    props: block.props,
    content: block.content,
    children,
  };
}

function toBlockLike(block: EditorBlock): PartialBlock {
  return {
    id: block.id,
    type: block.type as PartialBlock["type"],
    props: block.props as PartialBlock["props"],
    content: block.content as PartialBlock["content"],
    children: block.children?.map(toBlockLike),
  } as PartialBlock;
}

export function fromBlockNoteBlocks(
  blocks: readonly unknown[],
): EditorDocumentContent {
  return blocks.filter(isBlockLike).map(toEditorBlock);
}

export function toBlockNoteBlocks(
  blocks: EditorDocumentContent,
): PartialBlock[] {
  return blocks.map(toBlockLike);
}
