import { DEFAULT_AI_WORKSPACE_ACTIONS } from "../actions";
import type {
  AIModelConfig,
  AIWorkspaceActionKey,
  AIWorkspaceSettings,
} from "../types";

export const DEFAULT_AI_MODEL_CONFIG: AIModelConfig = {
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com/v1",
  temperature: 0.7,
  maxTokens: 2048,
};

export const DEFAULT_ENABLED_ACTION_KEYS: AIWorkspaceActionKey[] =
  DEFAULT_AI_WORKSPACE_ACTIONS.map((action) => action.key);

export const DEFAULT_AI_WORKSPACE_SETTINGS: AIWorkspaceSettings = {
  defaultModel: DEFAULT_AI_MODEL_CONFIG,
  enabledActions: [...DEFAULT_ENABLED_ACTION_KEYS],
  citationRequired: false,
};
