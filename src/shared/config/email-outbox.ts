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
} as const;

export function computeBackoffMs(attempts: number, baseMs: number): number {
  return baseMs * 2 ** attempts;
}
