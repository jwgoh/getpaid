import { faker } from "@faker-js/faker";
import type { EmailOutbox, Prisma, PrismaClient } from "@prisma/client";

import {
  EMAIL_OUTBOX_KIND,
  EMAIL_OUTBOX_RELATED_TYPE,
  EMAIL_OUTBOX_STATUS,
} from "@app/shared/config/email-outbox";

const IDEMPOTENCY_KEY_BYTES = 16;
const TEST_EMAIL_FROM = "no-reply@test.local";

type EmailOutboxOverrides = Partial<Prisma.EmailOutboxUncheckedCreateInput>;

function buildDefaultPayload(): Prisma.InputJsonValue {
  return {
    from: TEST_EMAIL_FROM,
    to: faker.internet.email().toLowerCase(),
    subject: faker.lorem.sentence(),
    html: "<p>test email body</p>",
    text: "test email body",
  };
}

export function makeEmailOutbox(
  overrides: EmailOutboxOverrides = {}
): Prisma.EmailOutboxUncheckedCreateInput {
  return {
    kind: EMAIL_OUTBOX_KIND.INVOICE,
    relatedType: EMAIL_OUTBOX_RELATED_TYPE.INVOICE,
    status: EMAIL_OUTBOX_STATUS.PENDING,
    attempts: 0,
    idempotencyKey: faker.string.hexadecimal({
      length: IDEMPOTENCY_KEY_BYTES * 2,
      casing: "lower",
      prefix: "",
    }),
    payload: buildDefaultPayload(),
    ...overrides,
  };
}

export function createEmailOutbox(
  prisma: PrismaClient,
  overrides: EmailOutboxOverrides = {}
): Promise<EmailOutbox> {
  return prisma.emailOutbox.create({ data: makeEmailOutbox(overrides) });
}
