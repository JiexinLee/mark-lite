import { DocumentEditor } from "./blocknote/document-editor";
import type { BlockNoteEditorProps, DocumentEditorAIConfig } from "./types";

export type { BlockNoteEditorProps } from "./types";
export type EditorAIConfig = DocumentEditorAIConfig;

export function BlockNoteEditor({ aiConfig, ...props }: BlockNoteEditorProps) {
  return <DocumentEditor {...props} ai={aiConfig} />;
}
