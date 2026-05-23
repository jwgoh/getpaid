import { TIME } from "./config";

export const EMAIL_OUTBOX_KIND = {
  INVOICE: "INVOICE",
  WAITLIST_CONFIRMATION: "WAITLIST_CONFIRMATION",
  WAITLIST_NOTIFICATION: "WAITLIST_NOTIFICATION",
  WAITLIST_APPROVAL: "WAITLIST_APPROVAL",
} as const;

export type EmailOutboxKindValue = (typeof EMAIL_OUTBOX_KIND)[keyof typeof EMAIL_OUTBOX_KIND];

export const EMAIL_OUTBOX_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type EmailOutboxStatusValue = (typeof EMAIL_OUTBOX_STATUS)[keyof typeof EMAIL_OUTBOX_STATUS];

export const EMAIL_OUTBOX_RELATED_TYPE = {
  INVOICE: "Invoice",
  WAITLIST_ENTRY: "WaitlistEntry",
} as const;

export type EmailOutboxRelatedTypeValue =
  (typeof EMAIL_OUTBOX_RELATED_TYPE)[keyof typeof EMAIL_OUTBOX_RELATED_TYPE];

export const EMAIL_OUTBOX = {
  MAX_ATTEMPTS: 5,
  BASE_BACKOFF_MS: 5 * TIME.MINUTE,
  BATCH_SIZE: 25,
  DISPATCH_CONCURRENCY: 5,
  MAX_BACKOFF_MS: 60 * TIME.MINUTE,
  JITTER_MIN_RATIO: 0.5,
  JITTER_RANGE_RATIO: 0.5,
  RETENTION_SENT_DAYS: 30,
  RETENTION_FAILED_DAYS: 90,
} as const;

export function computeBackoffMs(
  attempts: number,
  baseMs: number,
  random: () => number = Math.random
): number {
  const exponential = Math.min(baseMs * 2 ** attempts, EMAIL_OUTBOX.MAX_BACKOFF_MS);
  const jitterRatio = EMAIL_OUTBOX.JITTER_MIN_RATIO + random() * EMAIL_OUTBOX.JITTER_RANGE_RATIO;

  return Math.floor(exponential * jitterRatio);
}
