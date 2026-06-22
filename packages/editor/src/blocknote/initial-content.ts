import type { EditorDocumentContent } from "../types";

export function getDefaultInitialContent(): EditorDocumentContent {
  return [
    {
      type: "paragraph",
      content: [],
    },
  ];
}
