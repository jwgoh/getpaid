import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import {
  assertTestDatabase,
  disconnectDb,
  resolveExpectedDatabaseName,
  truncateAll,
  verifyMigrationsApplied,
} from "./integration-harness";

const NEXTAUTH_SECRET_BYTES = 32;
const NEXTAUTH_SECRET_MIN_LENGTH = 32;
const FAKER_SEED = 42;

function resolveNextAuthSecret(provided: string | undefined): string {
  if (provided && provided.length >= NEXTAUTH_SECRET_MIN_LENGTH) {
    return provided;
  }

  return randomBytes(NEXTAUTH_SECRET_BYTES).toString("base64");
}

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_TEST is required for integration tests. " +
      "Add it to .env (see .env.example) and run `pnpm test:integration:up` first."
  );
}

const expectedDatabaseName = resolveExpectedDatabaseName(testDatabaseUrl);

const mutableEnv = process.env as Record<string, string | undefined>;
const nextAuthSecret = resolveNextAuthSecret(process.env.NEXTAUTH_SECRET);

mutableEnv.DATABASE_URL = testDatabaseUrl;
mutableEnv.NEXTAUTH_SECRET = nextAuthSecret;
mutableEnv.NODE_ENV = "test";

faker.seed(FAKER_SEED);

let prisma: PrismaClient | undefined;
let harnessReady = false;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", testDatabaseUrl);
  vi.stubEnv("NEXTAUTH_SECRET", nextAuthSecret);
  vi.stubEnv("NODE_ENV", "test");

  const db = await import("@app/server/db");
  const client = db.prisma;

  await assertTestDatabase(client, expectedDatabaseName);
  await verifyMigrationsApplied(client);

  prisma = client;
  harnessReady = true;
});

beforeEach(async () => {
  if (!harnessReady || !prisma) {
    return;
  }

  await truncateAll(prisma);
});

afterAll(async () => {
  if (prisma) {
    await disconnectDb(prisma);
  }

  vi.unstubAllEnvs();
});
