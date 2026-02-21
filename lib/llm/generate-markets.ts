import "server-only";

import { fixJsonPrompt, systemPrompt, userPrompt } from "@/lib/llm/prompts";
import { llmMarketsResponseSchema, type LlmMarketsResponse } from "@/lib/llm/schema";
import { createOpenRouterCompletion, isOpenRouterReasoningEnabled, type OpenRouterMessage } from "@/lib/openrouter";

const PRIMARY_MODEL = "stepfun/step-3.5-flash:free";
const FALLBACK_MODEL = "arcee-ai/trinity-large-preview:free";

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Model output is not valid JSON.");
  }
}

function getModelCandidates(): string[] {
  const preferred = process.env.OPENROUTER_MODEL?.trim();
  return Array.from(new Set([preferred, PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean) as string[]));
}

function validateMarkets(parsed: unknown): LlmMarketsResponse {
  const validated = llmMarketsResponseSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  const issues = validated.error.issues
    .map((issue: { path: Array<string | number>; message: string }) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`LLM response failed schema validation: ${issues}`);
}

export async function generateMarketsFromChat(chatText: string): Promise<{
  modelUsed: string;
  result: LlmMarketsResponse;
  reasoningDetails?: unknown[];
}> {
  const trimmedChat = chatText.trim();
  if (!trimmedChat) {
    throw new Error("Chat text is empty.");
  }

  const clippedChat = trimmedChat.length > 220_000 ? trimmedChat.slice(0, 220_000) : trimmedChat;
  const models = getModelCandidates();
  const modelErrors: string[] = [];

  for (const model of models) {
    try {
      const baseMessages: OpenRouterMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt(clippedChat) }
      ];

      const firstPass = await createOpenRouterCompletion({
        model,
        messages: baseMessages,
        responseFormatJson: true,
        temperature: 0.25
      });

      const firstReasoningDetails = firstPass.reasoning_details ? [firstPass.reasoning_details] : [];

      try {
        const parsed = parseJsonObject(firstPass.content);
        const result = validateMarkets(parsed);
        return {
          modelUsed: model,
          result,
          reasoningDetails: isOpenRouterReasoningEnabled() ? firstReasoningDetails : undefined
        };
      } catch {
        const repairMessages: OpenRouterMessage[] = [
          ...baseMessages,
          {
            role: "assistant",
            content: firstPass.content,
            reasoning_details: firstPass.reasoning_details
          },
          {
            role: "user",
            content: fixJsonPrompt(firstPass.content)
          }
        ];

        const repairedPass = await createOpenRouterCompletion({
          model,
          messages: repairMessages,
          responseFormatJson: true,
          temperature: 0
        });

        const repairedParsed = parseJsonObject(repairedPass.content);
        const result = validateMarkets(repairedParsed);

        const allReasoningDetails = [
          ...firstReasoningDetails,
          ...(repairedPass.reasoning_details ? [repairedPass.reasoning_details] : [])
        ];

        return {
          modelUsed: model,
          result,
          reasoningDetails: isOpenRouterReasoningEnabled() ? allReasoningDetails : undefined
        };
      }
    } catch (error) {
      modelErrors.push(`[${model}] ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  throw new Error(`Market generation failed on all models: ${modelErrors.join(" | ")}`);
}
