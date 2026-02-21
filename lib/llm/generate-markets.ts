import "server-only";

import { fixJsonPrompt, systemPrompt, userPrompt } from "@/lib/llm/prompts";
import { llmMarketsResponseSchema, type LlmMarketsResponse } from "@/lib/llm/schema";
import { createOpenRouterCompletion, isOpenRouterReasoningEnabled, type OpenRouterMessage } from "@/lib/openrouter";

const ONLY_MODEL = "stepfun/step-3.5-flash:free";

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
  const model = ONLY_MODEL;
  console.log("[llm] generate:start", {
    model,
    inputChars: chatText.length,
    clippedChars: clippedChat.length
  });

  try {
    const modelStartedAt = Date.now();
    console.log("[llm] model:attempt", { model });
    const baseMessages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt(clippedChat) }
    ];

    const firstPass = await createOpenRouterCompletion({
      model,
      messages: baseMessages,
      temperature: 0.25
    });

    const firstReasoningDetails = firstPass.reasoning_details ? [firstPass.reasoning_details] : [];

    try {
      const parsed = parseJsonObject(firstPass.content);
      const result = validateMarkets(parsed);
      console.log("[llm] model:success-first-pass", {
        model,
        marketCount: result.market_ideas.length,
        elapsedMs: Date.now() - modelStartedAt
      });
      return {
        modelUsed: model,
        result,
        reasoningDetails: isOpenRouterReasoningEnabled() ? firstReasoningDetails : undefined
      };
    } catch {
      console.log("[llm] model:first-pass-invalid-json-or-schema", { model });
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
        temperature: 0
      });

      const repairedParsed = parseJsonObject(repairedPass.content);
      const result = validateMarkets(repairedParsed);
      console.log("[llm] model:success-after-repair", {
        model,
        marketCount: result.market_ideas.length,
        elapsedMs: Date.now() - modelStartedAt
      });

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
    console.log("[llm] model:failed", { model, error: error instanceof Error ? error.message : "Unknown error" });
    throw new Error(`[${model}] ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
