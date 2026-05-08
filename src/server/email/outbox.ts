import { EmailOutbox, Prisma } from "@prisma/client";

import {
  computeBackoffMs,
  EMAIL_OUTBOX,
  EMAIL_OUTBOX_STATUS,
  type EmailOutboxKindValue,
  type EmailOutboxRelatedTypeValue,
} from "@app/shared/config/email-outbox";

import { prisma } from "@app/server/db";

import { type ResendEmailPayload, sendEmail } from "./index";

export type EmailOutboxClient = Prisma.TransactionClient | typeof prisma;

export interface CreateEmailOutboxInput {
  userId: string | null;
  kind: EmailOutboxKindValue;
  relatedType: EmailOutboxRelatedTypeValue | null;
  relatedId: string | null;
  payload: ResendEmailPayload;
  idempotencyKey: string;
}

export async function createEmailOutbox(
  client: EmailOutboxClient,
  input: CreateEmailOutboxInput
): Promise<EmailOutbox> {
  return client.emailOutbox.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
    },
  });
}

export function buildOutboxIdempotencyKey(
  kind: EmailOutboxKindValue,
  relatedId: string | null,
  outboxRowId: string
): string {
  const related = relatedId ?? "none";

  return `${kind}-${related}-${outboxRowId}`;
}

function isResendPayload(value: Prisma.JsonValue): value is Prisma.JsonObject & ResendEmailPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.from === "string" &&
    typeof candidate.to === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.html === "string" &&
    typeof candidate.text === "string"
  );
}

function extractMessageId(result: unknown): string | null {
  if (typeof result !== "object" || result === null) {
    return null;
  }

  const data = (result as { data?: unknown }).data;

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const id = (data as { id?: unknown }).id;

  return typeof id === "string" ? id : null;
}

function extractSendError(result: unknown): string | null {
  if (typeof result !== "object" || result === null) {
    return null;
  }

  const error = (result as { error?: unknown }).error;

  if (typeof error !== "object" || error === null) {
    return null;
  }

  const message = (error as { message?: unknown }).message;

  return typeof message === "string" ? message : JSON.stringify(error);
}

async function markOutboxSent(rowId: string, messageId: string | null): Promise<void> {
  await prisma.emailOutbox.update({
    where: { id: rowId },
    data: {
      status: EMAIL_OUTBOX_STATUS.SENT,
      sentAt: new Date(),
      messageId,
      lastError: null,
      nextAttemptAt: null,
      lastAttemptedAt: new Date(),
    },
  });
}

async function markOutboxFailure(
  rowId: string,
  attempts: number,
  errorMessage: string
): Promise<void> {
  const nextAttempts = attempts + 1;
  const isExhausted = nextAttempts >= EMAIL_OUTBOX.MAX_ATTEMPTS;
  const now = new Date();
  const nextAttemptAt = isExhausted
    ? null
    : new Date(now.getTime() + computeBackoffMs(nextAttempts, EMAIL_OUTBOX.BASE_BACKOFF_MS));

  await prisma.emailOutbox.update({
    where: { id: rowId },
    data: {
      status: isExhausted ? EMAIL_OUTBOX_STATUS.FAILED : EMAIL_OUTBOX_STATUS.PENDING,
      attempts: nextAttempts,
      lastError: errorMessage,
      lastAttemptedAt: now,
      nextAttemptAt,
    },
  });
}

export async function dispatchOutbox(rowId: string): Promise<EmailOutbox | null> {
  const row = await prisma.emailOutbox.findUnique({ where: { id: rowId } });

  if (!row || row.status !== EMAIL_OUTBOX_STATUS.PENDING) {
    return row;
  }

  if (!isResendPayload(row.payload)) {
    await markOutboxFailure(row.id, row.attempts, "Outbox payload is malformed");

    return prisma.emailOutbox.findUnique({ where: { id: rowId } });
  }

  const idempotencyKey = row.idempotencyKey;

  try {
    const result = await sendEmail(row.payload, { idempotencyKey });
    const sendError = extractSendError(result);

    if (sendError) {
      await markOutboxFailure(row.id, row.attempts, sendError);
    } else {
      await markOutboxSent(row.id, extractMessageId(result));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await markOutboxFailure(row.id, row.attempts, message);
  }

  return prisma.emailOutbox.findUnique({ where: { id: rowId } });
}

export interface ProcessOutboxResult {
  attempted: number;
  sent: number;
  failed: number;
  pending: number;
}

export async function processOutbox(now: Date = new Date()): Promise<ProcessOutboxResult> {
  const candidates = await prisma.emailOutbox.findMany({
    where: {
      status: EMAIL_OUTBOX_STATUS.PENDING,
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: EMAIL_OUTBOX.BATCH_SIZE,
    select: { id: true },
  });

  const result: ProcessOutboxResult = {
    attempted: candidates.length,
    sent: 0,
    failed: 0,
    pending: 0,
  };

  for (const candidate of candidates) {
    const updated = await dispatchOutbox(candidate.id);

    if (!updated) {
      continue;
    }

    if (updated.status === EMAIL_OUTBOX_STATUS.SENT) {
      result.sent += 1;
    } else if (updated.status === EMAIL_OUTBOX_STATUS.FAILED) {
      result.failed += 1;
    } else {
      result.pending += 1;
    }
  }

  return result;
}
