import { DEFAULT_AI_WORKSPACE_SETTINGS } from "../config/defaults";
import { createAIWorkspaceSettings } from "../config/settings";
import type { AIWorkspaceRequest } from "../contracts/request";
import type { AIWorkspaceActionKey } from "../types";

export type CreateAIWorkspaceRequestInput = {
  documentId?: string | undefined;
  actionKey?: AIWorkspaceActionKey | undefined;
  instruction: string;
  title?: string | undefined;
};

export function createAIWorkspaceRequest(
  input: CreateAIWorkspaceRequestInput,
): AIWorkspaceRequest {
  const documentId = input.documentId ?? "draft-document";
  const instruction = input.instruction.trim();

  return {
    actionKey: input.actionKey ?? "rewrite",
    documentId,
    instruction,
    context: {
      documentId,
      title: input.title ?? "Current document",
      selectedText: instruction,
      documentText: instruction,
    },
    settings: createAIWorkspaceSettings({
      defaultModel: DEFAULT_AI_WORKSPACE_SETTINGS.defaultModel,
      enabledActions: [...DEFAULT_AI_WORKSPACE_SETTINGS.enabledActions],
      citationRequired: DEFAULT_AI_WORKSPACE_SETTINGS.citationRequired,
    }),
  };
}
