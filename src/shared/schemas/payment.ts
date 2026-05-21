import { z } from "zod";

import { TIME } from "@app/shared/config/config";
import { PAYMENT_METHOD } from "@app/shared/config/payment-method";

import { SCHEMA_LIMITS } from "./limits";

const paymentMethodSchema = z.nativeEnum(PAYMENT_METHOD);

const PAYMENT_PAID_AT_MIN_DATE = new Date("2000-01-01T00:00:00.000Z");

const paidAtSchema = z.coerce
  .date()
  .refine((value) => !Number.isNaN(value.getTime()), "Invalid date")
  .refine((value) => value >= PAYMENT_PAID_AT_MIN_DATE, "Payment date is too far in the past")
  .refine(
    (value) => value.getTime() <= Date.now() + SCHEMA_LIMITS.PAYMENT_PAID_AT_GRACE_DAYS * TIME.DAY,
    "Payment date cannot be in the future"
  );

export const recordPaymentSchema = z.object({
  amount: z.number().positive().max(SCHEMA_LIMITS.MONEY_MAX_CENTS, "Amount is too large"),
  method: paymentMethodSchema,
  note: z.string().max(SCHEMA_LIMITS.PAYMENT_NOTE_MAX).optional(),
  paidAt: z.string().optional(),
});

export const recordPaymentApiSchema = z.object({
  amount: z.number().positive().max(SCHEMA_LIMITS.MONEY_MAX_CENTS, "Amount is too large"),
  method: paymentMethodSchema,
  note: z.string().max(SCHEMA_LIMITS.PAYMENT_NOTE_MAX).optional(),
  paidAt: paidAtSchema.optional(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
