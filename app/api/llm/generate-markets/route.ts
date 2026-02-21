import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "next/dist/compiled/zod";

import { generateMarketsFromChat } from "@/lib/llm/generate-markets";
import { saveImportResult } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_CHAT_CHARS = 220_000;
const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function secureJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: SECURITY_HEADERS
  });
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

const generateRequestSchema = z.object({
  chatText: z.string().min(1).max(MAX_CHAT_CHARS),
  importId: z
    .string()
    .regex(/^[a-f0-9-]{36}$/i, "importId must be a UUID.")
    .optional(),
  sourceFileName: z.string().min(1).optional(),
  sourceFileSize: z.number().int().nonnegative().optional()
});

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return secureJson({ error: "Invalid request payload." }, { status: 400 });
    }

    const importId = parsed.data.importId ?? randomUUID();
    const { result, modelUsed, reasoningDetails } = await generateMarketsFromChat(parsed.data.chatText);

    const stored = await saveImportResult({
      importId,
      fileName: parsed.data.sourceFileName ?? "manual-input.txt",
      fileSize: parsed.data.sourceFileSize ?? parsed.data.chatText.length,
      model: modelUsed,
      chatText: parsed.data.chatText,
      markets: result.market_ideas,
      reasoning_details: reasoningDetails
    });

    return secureJson({
      ok: true,
      importId: stored.importId,
      modelUsed: stored.model,
      marketCount: stored.markets.length
    });
  } catch (error) {
    console.error("LLM market generation failed:", error);
    return secureJson({ error: "Failed to generate markets." }, { status: 500 });
  }
}
