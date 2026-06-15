import type { AIWorkspaceDocumentContext } from "../context/document-context";
import type { AIWorkspaceActionKey, AIWorkspaceSettings } from "../types";

export type AIWorkspaceRequest = {
  actionKey: AIWorkspaceActionKey;
  documentId: string;
  context: AIWorkspaceDocumentContext;
  settings: AIWorkspaceSettings;
};
