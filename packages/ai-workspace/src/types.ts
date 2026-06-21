export type AIProvider = "openai" | "deepseek" | "anthropic" | "custom";

export type AIWorkspaceActionCategory =
  | "writing"
  | "translation"
  | "document"
  | "research";

export type AIWorkspaceActionKey =
  | "rewrite"
  | "polish"
  | "expand"
  | "translate-to-en"
  | "summarize-document"
  | "find-citations";

export type AIWorkspaceAction = {
  key: AIWorkspaceActionKey;
  title: string;
  description: string;
  category: AIWorkspaceActionCategory;
  prompt: string;
  requiresSelection?: boolean;
  requiresRag?: boolean;
};

export type AIModelConfig = {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  apiKeyRef?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIProviderDefinition = {
  provider: AIProvider;
  label: string;
  description: string;
  defaultBaseUrl?: string;
  defaultModel: string;
  supportsCustomBaseUrl?: boolean;
};

export type AIWorkspaceSettings = {
  defaultModel: AIModelConfig;
  enabledActions: AIWorkspaceActionKey[];
  citationRequired: boolean;
};

export type AIWorkspacePrompt = {
  system: string;
  user: string;
};
