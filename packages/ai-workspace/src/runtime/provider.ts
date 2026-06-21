import { buildAIWorkspacePrompt } from "../prompts/builders";
import type { AIWorkspaceRequest } from "../contracts/request";
import { aiWorkspaceRuntimeEnv } from "./env";
import { AppError } from "./app-error";

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

export async function generateAIWorkspaceText(
  request: AIWorkspaceRequest,
): Promise<string> {
  if (!aiWorkspaceRuntimeEnv.AI_ENABLED) {
    throw new AppError({
      message:
        "AI is currently disabled. Enable it in packages/ai-workspace/.env to continue.",
      statusCode: 503,
      code: "AI_DISABLED",
    });
  }

  if (!aiWorkspaceRuntimeEnv.OPENAI_API_KEY) {
    throw new AppError({
      message:
        "Missing AI provider credentials. Add OPENAI_API_KEY to packages/ai-workspace/.env before using AI features.",
      statusCode: 500,
      code: "AI_CONFIG_ERROR",
    });
  }

  const prompt = buildAIWorkspacePrompt({
    actionKey: request.actionKey,
    context: request.context,
    ...(request.instruction ? { instruction: request.instruction } : {}),
  });

  const response = await fetch(
    `${request.settings.defaultModel.baseUrl ?? aiWorkspaceRuntimeEnv.AI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${aiWorkspaceRuntimeEnv.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:
          request.settings.defaultModel.model || aiWorkspaceRuntimeEnv.AI_MODEL,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature:
          request.settings.defaultModel.temperature ??
          aiWorkspaceRuntimeEnv.AI_TEMPERATURE,
        max_tokens:
          request.settings.defaultModel.maxTokens ??
          aiWorkspaceRuntimeEnv.AI_MAX_TOKENS,
      }),
    },
  );

  const data = (await parseResponseJson(response)) as OpenAICompatibleResponse;

  if (!response.ok) {
    throw mapAIProviderError({
      status: response.status,
      errorMessage: data.error?.message,
      errorCode: data.error?.code,
      errorType: data.error?.type,
    });
  }

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new AppError({
      message:
        "The AI provider returned an empty response. Try again or switch to another model.",
      statusCode: 502,
      code: "AI_UPSTREAM_ERROR",
    });
  }

  return text;
}

async function parseResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function mapAIProviderError(input: {
  status: number;
  errorMessage: string | undefined;
  errorCode: string | undefined;
  errorType: string | undefined;
}): AppError {
  const normalizedMessage = (input.errorMessage ?? "").toLowerCase();
  const normalizedCode = (input.errorCode ?? "").toLowerCase();
  const normalizedType = (input.errorType ?? "").toLowerCase();

  if (input.status === 400) {
    return new AppError({
      message:
        "The AI request is invalid. Check AI model and request settings in packages/ai-workspace/.env.",
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  }

  if (input.status === 401) {
    return new AppError({
      message:
        "AI provider authentication failed. Check OPENAI_API_KEY in packages/ai-workspace/.env.",
      statusCode: 401,
      code: "AI_AUTH_ERROR",
    });
  }

  if (input.status === 403) {
    return new AppError({
      message:
        "The current AI provider key does not have permission to use this model or project.",
      statusCode: 403,
      code: "AI_PERMISSION_ERROR",
    });
  }

  if (
    input.status === 404 ||
    normalizedCode.includes("model") ||
    normalizedType.includes("not_found_error") ||
    (normalizedMessage.includes("model") &&
      normalizedMessage.includes("not found"))
  ) {
    return new AppError({
      message:
        "The configured AI model was not found. Check AI_MODEL in packages/ai-workspace/.env.",
      statusCode: 404,
      code: "AI_MODEL_NOT_FOUND",
    });
  }

  if (
    input.status === 429 &&
    (normalizedMessage.includes("quota") ||
      normalizedMessage.includes("billing"))
  ) {
    return new AppError({
      message:
        "AI provider quota has been exceeded. Check billing, usage, or project quota settings.",
      statusCode: 429,
      code: "AI_QUOTA_EXCEEDED",
    });
  }

  if (input.status === 429) {
    return new AppError({
      message: "AI provider rate limit reached. Please wait and try again.",
      statusCode: 429,
      code: "AI_RATE_LIMITED",
    });
  }

  if (input.status >= 500) {
    return new AppError({
      message:
        "AI provider is temporarily unavailable. Please try again later.",
      statusCode: 502,
      code: "AI_UPSTREAM_ERROR",
    });
  }

  return new AppError({
    message:
      "AI request failed. Check your provider configuration and try again.",
    statusCode: 502,
    code: "AI_UPSTREAM_ERROR",
  });
}
