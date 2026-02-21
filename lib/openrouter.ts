import "server-only";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterRole = "system" | "user" | "assistant";

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
  reasoning_details?: unknown;
};

type OpenRouterChoice = {
  message?: {
    content?: string;
    reasoning_details?: unknown;
  };
};

type OpenRouterError = {
  message?: string;
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: OpenRouterError;
};

export type OpenRouterCompletionResult = {
  content: string;
  reasoning_details?: unknown;
};

function getReasoningMode(): "off" | "on" {
  return process.env.OPENROUTER_REASONING === "on" ? "on" : "off";
}

export function isOpenRouterReasoningEnabled(): boolean {
  return getReasoningMode() === "on";
}

function getRefererHeader(): string | null {
  const envReferer = process.env.OPENROUTER_REFERER?.trim();
  if (envReferer) {
    return envReferer;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

export async function createOpenRouterCompletion(params: {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  responseFormatJson?: boolean;
}): Promise<OpenRouterCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Title": "OrtiMarket"
  };

  const referer = getRefererHeader();
  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  const requestBody: Record<string, unknown> = {
    model: params.model,
    temperature: params.temperature ?? 0.25,
    messages: params.messages
  };

  if (params.responseFormatJson) {
    requestBody.response_format = { type: "json_object" };
  }

  if (getReasoningMode() === "on") {
    requestBody.reasoning = { enabled: true, exclude: false };
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });

  const data = (await response.json()) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenRouter request failed (${response.status}).`);
  }

  const message = data.choices?.[0]?.message;
  const content = message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return {
    content,
    reasoning_details: message?.reasoning_details
  };
}
