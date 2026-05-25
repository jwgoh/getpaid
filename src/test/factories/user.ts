import { faker } from "@faker-js/faker";
import type { Prisma, PrismaClient, User } from "@prisma/client";

export const defaultPassword = "password";

export const defaultPasswordHash = "$2b$12$yNyLS/erqLqYXk4WAiUgveDLFjWHW7.0bbTpwXKHRuVWtuW2GxoFG";

export function makeUser(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {}
): Prisma.UserUncheckedCreateInput {
  return {
    email: faker.internet.email().toLowerCase(),
    passwordHash: defaultPasswordHash,
    ...overrides,
  };
}

export function createUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {}
): Promise<User> {
  return prisma.user.create({ data: makeUser(overrides) });
}
