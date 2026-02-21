import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { generateMarketsFromChat } from "@/lib/llm/generate-markets";
import { saveImportResult } from "@/lib/storage";

export const runtime = "nodejs";

const TXT_FILE_PATTERN = /\.txt$/i;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
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

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return secureJson({ error: "No file uploaded." }, { status: 400 });
    }

    const isTxt = TXT_FILE_PATTERN.test(file.name) || file.type === "text/plain";
    if (!isTxt) {
      return secureJson({ error: "Please select a .txt WhatsApp export file." }, { status: 400 });
    }

    if (file.size <= 0) {
      return secureJson({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return secureJson({ error: "File is too large. Maximum size is 10MB." }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const chatText = new TextDecoder("utf-8").decode(buffer);

    if (!chatText.trim()) {
      return secureJson({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const importId = randomUUID();
    const { result, modelUsed, reasoningDetails } = await generateMarketsFromChat(chatText);

    const stored = await saveImportResult({
      importId,
      fileName: file.name,
      fileSize: file.size,
      model: modelUsed,
      chatText,
      markets: result.market_ideas,
      reasoning_details: reasoningDetails
    });

    return secureJson({
      ok: true,
      importId: stored.importId,
      marketCount: stored.markets.length
    });
  } catch (error) {
    console.error("WhatsApp import failed:", error);
    return secureJson({ error: "Failed to import WhatsApp export." }, { status: 500 });
  }
}
