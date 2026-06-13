import type {
  EditorBlock,
  EditorBlockText,
  EditorDocument,
} from "./types/document";

export function createTextContent(text: string): EditorBlockText[] {
  return [
    {
      type: "text",
      text,
      styles: {},
    },
  ];
}

export function createParagraphBlock(text: string): EditorBlock {
  return {
    type: "paragraph",
    content: createTextContent(text),
  };
}

export function createHeadingBlock(text: string, level = 1): EditorBlock {
  return {
    type: "heading",
    props: { level },
    content: createTextContent(text),
  };
}

export function createEmptyDocument(index: number): EditorDocument {
  return {
    id: `local-${Date.now()}`,
    title: `Untitled ${index}`,
    updatedAt: new Date().toLocaleString(),
    preview: "New local document",
  };
}

export function blocksToPlainText(blocks: EditorBlock[]): string {
  return blocks
    .flatMap((block) => block.content ?? [])
    .map((content) => content.text)
    .join(" ")
    .trim();
}
