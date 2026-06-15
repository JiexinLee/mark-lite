export type AIWorkspaceRagSnippet = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type AIWorkspaceDocumentContext = {
  documentId: string;
  title: string;
  selectedText?: string;
  surroundingText?: string;
  documentText?: string;
  ragSnippets?: AIWorkspaceRagSnippet[];
};
