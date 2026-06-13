import { DefaultChatTransport } from "ai";

export type AIWorkspaceConfig = {
  baseUrl: string;
  chatPath: string;
  enabled: boolean;
  unavailableReason?: string;
};

export type AIAvailabilityState =
  | { status: "available" }
  | { status: "unavailable"; reason: string };

export function createAIWorkspaceConfig(
  config: Partial<AIWorkspaceConfig> = {},
): AIWorkspaceConfig {
  return {
    baseUrl: config.baseUrl ?? "http://localhost:3001/api",
    chatPath: config.chatPath ?? "/chat",
    enabled: config.enabled ?? true,
    unavailableReason: config.unavailableReason,
  };
}

export function getAIAvailabilityState(
  config: AIWorkspaceConfig,
): AIAvailabilityState {
  if (!config.enabled) {
    return {
      status: "unavailable",
      reason: config.unavailableReason ?? "AI is disabled by configuration.",
    };
  }

  return { status: "available" };
}

export function createBlockNoteChatTransport(config: AIWorkspaceConfig) {
  return new DefaultChatTransport({
    api: `${config.baseUrl}${config.chatPath}`,
  });
}

export function adaptElectronAIConfig(config: Partial<AIWorkspaceConfig> = {}) {
  return createAIWorkspaceConfig(config);
}
