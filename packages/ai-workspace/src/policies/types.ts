import type { AIWorkspaceDocumentContext } from "../context/document-context";
import type { AIWorkspaceActionKey, AIWorkspaceSettings } from "../types";

export type AIWorkspacePolicyInput = {
  actionKey: AIWorkspaceActionKey;
  context: AIWorkspaceDocumentContext;
  settings: AIWorkspaceSettings;
};

export type AIWorkspaceAuditInput = AIWorkspacePolicyInput & {
  actorId?: string;
};

export type AIWorkspaceAuditEvent = {
  actionKey: AIWorkspaceActionKey;
  actorId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type AIWorkspacePolicyHooks = {
  canRunAction?: (input: AIWorkspacePolicyInput) => boolean;
  sanitizeContext?: (
    context: AIWorkspaceDocumentContext,
  ) => AIWorkspaceDocumentContext;
  createAuditEvent?: (
    input: AIWorkspaceAuditInput,
  ) => AIWorkspaceAuditEvent;
};

export const DEFAULT_AI_WORKSPACE_POLICY_HOOKS: AIWorkspacePolicyHooks = {};
