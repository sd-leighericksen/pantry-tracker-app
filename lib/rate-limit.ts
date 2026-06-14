import "server-only";

/* ------------------------------------------------------------------ *
 * Tiny in-memory fixed-window rate limiter. The app runs as a single
 * container (BRIEF §7 architecture), so process-local state is enough —
 * no Redis. Used to throttle auth endpoints (BRIEF §7 Security).
 * ------------------------------------------------------------------ */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Record a hit for `key` and report whether it is within `limit` per
 * `windowMs`. Sweeps expired buckets opportunistically.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const ok = existing.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Best-effort client IP from proxy headers (Caddy sets X-Forwarded-For). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() ?? "unknown";
}
