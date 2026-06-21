import type { EditorDocument } from "./types/document";

export function createEmptyDocument(index: number): EditorDocument {
  return {
    id: `local-${Date.now()}`,
    title: `Untitled ${index}`,
    updatedAt: new Date().toLocaleString(),
    preview: "",
  };
}
