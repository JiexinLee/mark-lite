export type EditorBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: EditorBlock[];
};

export type EditorDocumentContent = EditorBlock[];

export type DocumentEditorAIConfig = {
  enabled?: boolean;
  baseUrl?: string;
  chatPath?: string;
  unavailableReason?: string;
};

export type DocumentEditorProps = {
  documentId?: string;
  documentTitle?: string;
  initialContent?: EditorDocumentContent;
  editable?: boolean;
  className?: string;
  ai?: DocumentEditorAIConfig;
  onChange?: (content: EditorDocumentContent) => void;
};

export type BlockNoteEditorProps = Omit<DocumentEditorProps, "ai"> & {
  aiConfig?: Partial<DocumentEditorAIConfig>;
};
