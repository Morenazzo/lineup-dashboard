import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import config from "@/lineup.config";
import { getAdminSession } from "@/lib/db/auth";
import { coachAvailable } from "@/lib/db/env";
import { parseMessages, resolveModelId } from "@/lib/lineup/validate";
import { createRateLimiter } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/same-origin";

/**
 * The coach conversation on the Lineup page. The page sends the whole chat (the first
 * message already carries its context block) and reads the answer as a text stream.
 * Needs OPENROUTER_API_KEY; without it this answers 503 and the page says so.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const allowPerAdmin = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

const DEFAULT_MODEL = process.env.AI_MODEL || "anthropic/claude-sonnet-5.5";

function reply(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply("origin", 403);
  const session = await getAdminSession();
  if (!session) return reply("unauthenticated", 401);
  if (!coachAvailable()) return reply("ai_not_configured", 503);
  if (!allowPerAdmin(session.email)) return reply("rate_limited", 429);

  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const messages = parseMessages(body?.messages);
  if (!messages) return reply("bad_request", 400);

  const modelId = resolveModelId(
    body?.model,
    config.coach.models.map((model) => model.id),
    DEFAULT_MODEL,
  );
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const result = streamText({
    model: openrouter.chat(modelId),
    messages,
    maxOutputTokens: 1200,
    abortSignal: request.signal,
  });
  return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
}
