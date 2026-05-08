import { NextResponse } from "next/server";

import { errorResponse } from "@app/shared/api/route-helpers";

interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowMs: number;
  keyResolver?: (request: Request) => string | Promise<string>;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_HEADER_LIMIT = "RateLimit-Limit";
const RATE_LIMIT_HEADER_REMAINING = "RateLimit-Remaining";
const RATE_LIMIT_HEADER_RESET = "RateLimit-Reset";
const RATE_LIMIT_HEADER_RETRY_AFTER = "Retry-After";

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const store = new Map<string, RateLimitEntry>();

let lastSweepAt = 0;

function sweepIfDue(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return;
  }

  lastSweepAt = now;

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

function consume(key: string, limit: number, windowMs: number): ConsumeResult {
  const now = Date.now();

  sweepIfDue(now);

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;

    store.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function applyRateLimitHeaders(response: NextResponse, result: ConsumeResult, limit: number): void {
  response.headers.set(RATE_LIMIT_HEADER_LIMIT, String(limit));
  response.headers.set(RATE_LIMIT_HEADER_REMAINING, String(result.remaining));
  response.headers.set(RATE_LIMIT_HEADER_RESET, String(Math.ceil(result.resetAt / 1000)));
}

export async function applyRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<{ response: NextResponse | null; result: ConsumeResult }> {
  const identifier = options.keyResolver
    ? await options.keyResolver(request)
    : resolveClientIp(request);
  const key = `${options.bucket}:${identifier}`;
  const result = consume(key, options.limit, options.windowMs);

  if (!result.allowed) {
    const blocked = errorResponse("RATE_LIMITED", "Too many requests, please try again later", 429);

    blocked.headers.set(RATE_LIMIT_HEADER_RETRY_AFTER, String(result.retryAfterSec));
    applyRateLimitHeaders(blocked, result, options.limit);

    return { response: blocked, result };
  }

  return { response: null, result };
}

export const RATE_LIMITS = {
  SIGN_UP: { limit: 5, windowMs: 60 * 60 * 1000 },
  SIGN_IN: { limit: 10, windowMs: 5 * 60 * 1000 },
  WAITLIST: { limit: 5, windowMs: 60 * 60 * 1000 },
  WAITLIST_CHECK: { limit: 30, windowMs: 60 * 60 * 1000 },
  PUBLIC_VIEW: { limit: 60, windowMs: 5 * 60 * 1000 },
} as const;
