import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import crypto from "node:crypto";

import { errorResponse } from "@app/server/api/route-helpers";
import { prisma } from "@app/server/db";

const IDEMPOTENCY_HEADER = "Idempotency-Key";
const KEY_MIN_LENGTH = 8;
const KEY_MAX_LENGTH = 128;
const KEY_PATTERN = /^[\x21-\x7e]+$/;
const TTL_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;

type AuthUser = { id: string; email: string };

type RouteContext = { params: Promise<Record<string, string>> };

type AuthHandler = (
  user: AuthUser,
  request: Request,
  context: RouteContext
) => Promise<NextResponse>;

interface IdempotencyOptions {
  endpoint: string;
}

function isValidKey(value: string): boolean {
  if (value.length < KEY_MIN_LENGTH || value.length > KEY_MAX_LENGTH) {
    return false;
  }

  return KEY_PATTERN.test(value);
}

function hashRequest(method: string, body: string): string {
  return crypto.createHash("sha256").update(`${method}:${body}`).digest("hex");
}

function buildCachedResponse(status: number, body: Prisma.JsonValue): NextResponse {
  return NextResponse.json(body, { status });
}

function parseJsonInput(text: string): Prisma.InputJsonValue {
  if (text.length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as Prisma.InputJsonValue;
  } catch {
    return {};
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function readBody(request: Request): Promise<{ raw: string; clone: Request }> {
  const cloned = request.clone();
  const raw = await request.text();
  const replay = new Request(cloned.url, {
    method: cloned.method,
    headers: cloned.headers,
    body: raw.length > 0 ? raw : undefined,
  });

  return { raw, clone: replay };
}

export function withIdempotency(handler: AuthHandler, options: IdempotencyOptions) {
  return async (user: AuthUser, request: Request, context: RouteContext) => {
    const key = request.headers.get(IDEMPOTENCY_HEADER);

    if (!key) {
      return errorResponse(
        "IDEMPOTENCY_KEY_REQUIRED",
        `${IDEMPOTENCY_HEADER} header is required for this endpoint`,
        400
      );
    }

    if (!isValidKey(key)) {
      return errorResponse(
        "IDEMPOTENCY_KEY_INVALID",
        `${IDEMPOTENCY_HEADER} must be ${KEY_MIN_LENGTH}-${KEY_MAX_LENGTH} ASCII characters`,
        400
      );
    }

    const { raw, clone } = await readBody(request);
    const requestHash = hashRequest(request.method, raw);
    const now = new Date();

    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        userId_endpoint_key: {
          userId: user.id,
          endpoint: options.endpoint,
          key,
        },
      },
    });

    if (existing && existing.expiresAt > now) {
      if (existing.requestHash !== requestHash) {
        return errorResponse(
          "IDEMPOTENCY_KEY_REUSED",
          `${IDEMPOTENCY_HEADER} reused with a different request body`,
          422
        );
      }

      return buildCachedResponse(existing.responseStatus, existing.responseBody);
    }

    const response = await handler(user, clone, context);
    const responseClone = response.clone();
    const rawText = await responseClone.text();
    const responseBody = parseJsonInput(rawText);

    if (response.status >= 200 && response.status < 300) {
      try {
        await prisma.idempotencyKey.create({
          data: {
            key,
            userId: user.id,
            endpoint: options.endpoint,
            requestHash,
            responseStatus: response.status,
            responseBody,
            expiresAt: new Date(now.getTime() + TTL_HOURS * MS_PER_HOUR),
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const racing = await prisma.idempotencyKey.findUnique({
          where: {
            userId_endpoint_key: {
              userId: user.id,
              endpoint: options.endpoint,
              key,
            },
          },
        });

        if (racing && racing.expiresAt > now && racing.requestHash === requestHash) {
          return buildCachedResponse(racing.responseStatus, racing.responseBody);
        }
      }
    }

    return response;
  };
}
