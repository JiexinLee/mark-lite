import {
  DEFAULT_AI_MODEL_CONFIG,
  DEFAULT_AI_WORKSPACE_SETTINGS,
} from "./defaults";
import type {
  AIModelConfig,
  AIWorkspaceActionKey,
  AIWorkspaceSettings,
} from "../types";

export type AIWorkspaceSettingsInput = Partial<
  Omit<AIWorkspaceSettings, "defaultModel" | "enabledActions">
> & {
  defaultModel?: Partial<AIModelConfig>;
  enabledActions?: AIWorkspaceActionKey[];
};

export function createAIWorkspaceSettings(
  input: AIWorkspaceSettingsInput = {},
): AIWorkspaceSettings {
  return {
    defaultModel: {
      ...DEFAULT_AI_MODEL_CONFIG,
      ...input.defaultModel,
    },
    enabledActions:
      input.enabledActions ?? [...DEFAULT_AI_WORKSPACE_SETTINGS.enabledActions],
    citationRequired:
      input.citationRequired ?? DEFAULT_AI_WORKSPACE_SETTINGS.citationRequired,
  };
}

export function isAIWorkspaceActionEnabled(
  settings: AIWorkspaceSettings,
  actionKey: AIWorkspaceActionKey,
): boolean {
  return settings.enabledActions.includes(actionKey);
}
