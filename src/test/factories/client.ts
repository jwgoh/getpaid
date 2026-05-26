import { faker } from "@faker-js/faker";
import type { Client, Prisma, PrismaClient } from "@prisma/client";

type ClientOverrides = Partial<Prisma.ClientUncheckedCreateInput> & { userId: string };

export function makeClient(overrides: ClientOverrides): Prisma.ClientUncheckedCreateInput {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
}

export function createClient(prisma: PrismaClient, overrides: ClientOverrides): Promise<Client> {
  return prisma.client.create({ data: makeClient(overrides) });
}
