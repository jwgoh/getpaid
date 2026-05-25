import { faker } from "@faker-js/faker";
import { type IdempotencyKey, Prisma, type PrismaClient } from "@prisma/client";

import { TIME } from "@app/shared/config/config";

const REQUEST_HASH_LENGTH = 64;
const KEY_LENGTH = 32;
const DEFAULT_TTL_HOURS = 24;
const DEFAULT_ENDPOINT = "POST /api/test";

type IdempotencyKeyOverrides = Partial<Prisma.IdempotencyKeyUncheckedCreateInput> & {
  userId: string;
};

function defaultExpiresAt(): Date {
  return new Date(Date.now() + DEFAULT_TTL_HOURS * TIME.HOUR);
}

export function makeIdempotencyKey(
  overrides: IdempotencyKeyOverrides
): Prisma.IdempotencyKeyUncheckedCreateInput {
  return {
    key: faker.string.hexadecimal({ length: KEY_LENGTH, casing: "lower", prefix: "" }),
    endpoint: DEFAULT_ENDPOINT,
    requestHash: faker.string.hexadecimal({
      length: REQUEST_HASH_LENGTH,
      casing: "lower",
      prefix: "",
    }),
    responseStatus: null,
    responseBody: Prisma.DbNull,
    expiresAt: defaultExpiresAt(),
    ...overrides,
  };
}

export function createIdempotencyKey(
  prisma: PrismaClient,
  overrides: IdempotencyKeyOverrides
): Promise<IdempotencyKey> {
  return prisma.idempotencyKey.create({ data: makeIdempotencyKey(overrides) });
}
