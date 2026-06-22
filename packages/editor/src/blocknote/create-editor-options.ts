import type { ExtensionFactoryInstance } from "@blocknote/core";
import { en as blockNoteEn } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import type { EditorDocumentContent } from "../types";
import { toBlockNoteBlocks } from "./serialization";

type CreateEditorOptionsInput = {
  initialContent: EditorDocumentContent;
  editable: boolean;
  extensions?: ExtensionFactoryInstance[];
};

export function createEditorOptions({
  initialContent,
  editable,
  extensions,
}: CreateEditorOptionsInput) {
  return {
    dictionary: {
      ...blockNoteEn,
      ai: aiEn,
    },
    editable,
    extensions,
    initialContent: toBlockNoteBlocks(initialContent),
  };
}
