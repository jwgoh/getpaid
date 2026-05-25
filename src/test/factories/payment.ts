import { faker } from "@faker-js/faker";
import type { Payment, Prisma, PrismaClient } from "@prisma/client";

import { PAYMENT_METHOD } from "@app/shared/config/payment-method";

const DEFAULT_AMOUNT_MIN_CENTS = 100;
const DEFAULT_AMOUNT_MAX_CENTS = 10_000;

type PaymentOverrides = Partial<Prisma.PaymentUncheckedCreateInput> & { invoiceId: string };

export function makePayment(overrides: PaymentOverrides): Prisma.PaymentUncheckedCreateInput {
  return {
    amount: faker.number.int({ min: DEFAULT_AMOUNT_MIN_CENTS, max: DEFAULT_AMOUNT_MAX_CENTS }),
    method: PAYMENT_METHOD.MANUAL,
    ...overrides,
  };
}

export function createPayment(prisma: PrismaClient, overrides: PaymentOverrides): Promise<Payment> {
  return prisma.payment.create({ data: makePayment(overrides) });
}
