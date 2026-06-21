import type { AIProvider, AIProviderDefinition } from "../types";

export const AI_PROVIDER_DEFINITIONS: AIProviderDefinition[] = [
  {
    provider: "openai",
    label: "OpenAI",
    description: "OpenAI hosted models for general writing and reasoning tasks.",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    description:
      "DeepSeek hosted chat models with an OpenAI-compatible API surface.",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    description: "Anthropic Claude models for long-form drafting and reasoning.",
    defaultModel: "claude-3-5-sonnet-latest",
  },
  {
    provider: "custom",
    label: "Custom",
    description:
      "A custom OpenAI-compatible endpoint managed by your own infrastructure.",
    defaultBaseUrl: "http://localhost:3001/v1",
    defaultModel: "custom-chat-model",
    supportsCustomBaseUrl: true,
  },
];

export function getAIProviderDefinition(
  provider: AIProvider,
): AIProviderDefinition | undefined {
  return AI_PROVIDER_DEFINITIONS.find((item) => item.provider === provider);
}
