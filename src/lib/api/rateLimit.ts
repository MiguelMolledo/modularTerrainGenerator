import { NextResponse } from 'next/server';

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Keyed by user id (falling back to client IP). This is per-instance and
 * resets on redeploy — fine as a first line of defense against a single user
 * hammering the paid AI routes. For production-grade, cross-instance limiting
 * swap the Map for Upstash Redis (@upstash/ratelimit) behind the same
 * checkRateLimit() signature.
 */

type Hit = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // per key per window

const buckets = new Map<string, Hit>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse<{ error: string }> };

export function checkRateLimit(
  key: string,
  max: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || now >= hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (hit.count >= max) {
    const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      ),
    };
  }

  hit.count += 1;
  return { ok: true };
}

/** Best-effort client identifier for rate limiting. */
export function clientKey(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const fwd = request.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/** Occasionally drop expired buckets so the Map doesn't grow unbounded. */
function sweep() {
  const now = Date.now();
  for (const [key, hit] of buckets) {
    if (now >= hit.resetAt) buckets.delete(key);
  }
}

// Sweep every 5 minutes (only in a long-lived runtime; harmless otherwise).
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(sweep, 5 * 60_000);
  // Don't keep the process alive just for the sweeper.
  (timer as unknown as { unref?: () => void }).unref?.();
}
