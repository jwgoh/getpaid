import { z } from "zod";

import { PAYMENT_METHOD } from "@app/shared/config/payment-method";

import { SCHEMA_LIMITS } from "./limits";

const paymentMethodSchema = z.nativeEnum(PAYMENT_METHOD);

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
  paidAt: z.coerce.date().optional(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
