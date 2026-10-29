/** What the Lineup page may store: six collections of small JSON documents. */
export const COLLECTIONS = ["game", "reports", "weeks", "tasks", "chats", "deals"] as const;
export type Collection = (typeof COLLECTIONS)[number];

/** A day of reports is a few KB; a long chat is the biggest document. */
export const MAX_DOC_BYTES = 256 * 1024;

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parseCollection(value: unknown): Collection | null {
  return COLLECTIONS.find((name) => name === value) ?? null;
}

export function parseId(value: unknown): string | null {
  return typeof value === "string" && ID.test(value) ? value : null;
}

export interface DocRef {
  coll: Collection;
  id: string;
}

export interface DocWrite extends DocRef {
  data: Record<string, unknown>;
}

export function parseRef(body: unknown): DocRef | null {
  if (!body || typeof body !== "object") return null;
  const { coll, id } = body as Record<string, unknown>;
  const parsedColl = parseCollection(coll);
  const parsedId = parseId(id);
  return parsedColl && parsedId ? { coll: parsedColl, id: parsedId } : null;
}

/** A write needs a valid reference and a plain JSON object under the size cap. */
export function parseWrite(body: unknown): DocWrite | "too_large" | null {
  const ref = parseRef(body);
  if (!ref) return null;
  const { data } = body as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (JSON.stringify(data).length > MAX_DOC_BYTES) return "too_large";
  return { ...ref, data: data as Record<string, unknown> };
}

/**
 * The model the page asked for, if it is one the config offers. The empty id and any
 * unknown id mean "the default" (AI_MODEL, or the fallback passed in).
 */
export function resolveModelId(requested: unknown, allowed: readonly string[], fallback: string): string {
  return typeof requested === "string" && requested !== "" && allowed.includes(requested) ? requested : fallback;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 30_000;

/** The conversation the page sends. The first user message carries the context block. */
export function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    if (!content.trim() || content.length > MAX_MESSAGE_CHARS) return null;
    messages.push({ role, content });
  }
  return messages[messages.length - 1].role === "user" ? messages : null;
}
