import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient, WaitlistEntry } from "@prisma/client";

type WaitlistEntryOverrides = Partial<Prisma.WaitlistEntryUncheckedCreateInput>;

export function makeWaitlistEntry(
  overrides: WaitlistEntryOverrides = {}
): Prisma.WaitlistEntryUncheckedCreateInput {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
}

export function createWaitlistEntry(
  prisma: PrismaClient,
  overrides: WaitlistEntryOverrides = {}
): Promise<WaitlistEntry> {
  return prisma.waitlistEntry.create({ data: makeWaitlistEntry(overrides) });
}
