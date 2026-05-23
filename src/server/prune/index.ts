import type { PrismaClient } from "@prisma/client";

import {
  countExpiredIdempotencyKeys,
  pruneExpiredIdempotencyKeys,
} from "@app/server/api/idempotency";
import { countSentOutbox, pruneSentOutbox } from "@app/server/email/outbox";
import { countConvertedWaitlistEntries, pruneConvertedWaitlistEntries } from "@app/server/waitlist";

export { RetentionMisconfiguredError } from "./errors";

export type PruneTableResult =
  | { ok: true; deleted: number; durationMs: number }
  | { ok: false; error: string; durationMs: number };

export interface PruneReport {
  mode: "live" | "dry-run";
  now: string;
  idempotencyKeys: PruneTableResult;
  emailOutboxSent: PruneTableResult;
  emailOutboxFailed: PruneTableResult;
  waitlistEntries: PruneTableResult;
  hasError: boolean;
}

export interface PruneOptions {
  dryRun?: boolean;
  now?: Date;
}

function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runIdempotencyKeys(
  client: PrismaClient,
  now: Date,
  isDryRun: boolean
): Promise<PruneTableResult> {
  const start = performance.now();

  try {
    if (isDryRun) {
      const { count } = await countExpiredIdempotencyKeys(client, now);

      return { ok: true, deleted: count, durationMs: elapsedMs(start) };
    }

    const { deleted } = await pruneExpiredIdempotencyKeys(client, now);

    return { ok: true, deleted, durationMs: elapsedMs(start) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error), durationMs: elapsedMs(start) };
  }
}

async function runOutbox(
  client: PrismaClient,
  now: Date,
  isDryRun: boolean
): Promise<{ sent: PruneTableResult; failed: PruneTableResult }> {
  const start = performance.now();

  try {
    if (isDryRun) {
      const { sent, failed } = await countSentOutbox(client, now);
      const durationMs = elapsedMs(start);

      return {
        sent: { ok: true, deleted: sent, durationMs },
        failed: { ok: true, deleted: failed, durationMs },
      };
    }

    const { deletedSent, deletedFailed } = await pruneSentOutbox(client, now);
    const durationMs = elapsedMs(start);

    return {
      sent: { ok: true, deleted: deletedSent, durationMs },
      failed: { ok: true, deleted: deletedFailed, durationMs },
    };
  } catch (error) {
    const durationMs = elapsedMs(start);
    const message = toErrorMessage(error);

    return {
      sent: { ok: false, error: message, durationMs },
      failed: { ok: false, error: message, durationMs },
    };
  }
}

async function runWaitlist(
  client: PrismaClient,
  now: Date,
  isDryRun: boolean
): Promise<PruneTableResult> {
  const start = performance.now();

  try {
    if (isDryRun) {
      const { candidates } = await countConvertedWaitlistEntries(client, now);

      return { ok: true, deleted: candidates, durationMs: elapsedMs(start) };
    }

    const { deleted } = await pruneConvertedWaitlistEntries(client, now);

    return { ok: true, deleted, durationMs: elapsedMs(start) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error), durationMs: elapsedMs(start) };
  }
}

async function resolveNow(client: PrismaClient, override?: Date): Promise<Date> {
  if (override) {
    return override;
  }

  const rows = await client.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;

  return rows[0]?.now ?? new Date();
}

export async function pruneExpired(
  client: PrismaClient,
  options?: PruneOptions
): Promise<PruneReport> {
  const now = await resolveNow(client, options?.now);
  const isDryRun = options?.dryRun === true;

  const idempotencyKeys = await runIdempotencyKeys(client, now, isDryRun);
  const outbox = await runOutbox(client, now, isDryRun);
  const waitlistEntries = await runWaitlist(client, now, isDryRun);

  const hasError =
    !idempotencyKeys.ok || !outbox.sent.ok || !outbox.failed.ok || !waitlistEntries.ok;

  return {
    mode: isDryRun ? "dry-run" : "live",
    now: now.toISOString(),
    idempotencyKeys,
    emailOutboxSent: outbox.sent,
    emailOutboxFailed: outbox.failed,
    waitlistEntries,
    hasError,
  };
}
