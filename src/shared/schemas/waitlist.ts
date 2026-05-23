import { z } from "zod";

import { SCHEMA_LIMITS } from "./limits";

export const waitlistSchema = z.object({
  email: z.email("Invalid email address").max(SCHEMA_LIMITS.EMAIL_MAX),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const WAITLIST_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  NOT_FOUND: "not_found",
} as const;

export type WaitlistCheckStatus = (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];

export const waitlistCheckResponseSchema = z.object({
  status: z.enum([WAITLIST_STATUS.APPROVED, WAITLIST_STATUS.PENDING, WAITLIST_STATUS.NOT_FOUND]),
});

export type WaitlistCheckResponse = z.infer<typeof waitlistCheckResponseSchema>;
