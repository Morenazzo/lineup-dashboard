/**
 * In-memory rate limiter. Each serverless instance keeps its own counts, so this
 * slows floods rather than guaranteeing a limit. Phase 2 moves to Upstash.
 */

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

const SWEEP_EVERY = 500;

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();
  let calls = 0;

  /** True when the key is under its limit. A true result counts as one hit. */
  return function allow(key: string, now: number = Date.now()): boolean {
    if (++calls % SWEEP_EVERY === 0) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

/** The caller's IP. On Vercel, x-forwarded-for is set by the platform. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
