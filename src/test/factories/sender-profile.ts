import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient, SenderProfile } from "@prisma/client";

type SenderProfileOverrides = Partial<Prisma.SenderProfileUncheckedCreateInput> & {
  userId: string;
};

export function makeSenderProfile(
  overrides: SenderProfileOverrides
): Prisma.SenderProfileUncheckedCreateInput {
  return {
    companyName: faker.company.name(),
    displayName: faker.person.fullName(),
    emailFrom: faker.internet.email().toLowerCase(),
    address: faker.location.streetAddress({ useFullAddress: true }),
    ...overrides,
  };
}

export function createSenderProfile(
  prisma: PrismaClient,
  overrides: SenderProfileOverrides
): Promise<SenderProfile> {
  return prisma.senderProfile.create({ data: makeSenderProfile(overrides) });
}
