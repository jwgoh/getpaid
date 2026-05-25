import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { disconnectDb, truncateAll, verifyMigrationsApplied } from "./integration-harness";

const DEFAULT_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/getpaid_test";
const NEXTAUTH_SECRET_BYTES = 32;

let prisma: PrismaClient | undefined;

beforeAll(async () => {
  const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? DEFAULT_TEST_DATABASE_URL;
  const nextAuthSecret =
    process.env.NEXTAUTH_SECRET ?? randomBytes(NEXTAUTH_SECRET_BYTES).toString("base64");

  vi.stubEnv("DATABASE_URL", testDatabaseUrl);
  vi.stubEnv("NEXTAUTH_SECRET", nextAuthSecret);
  vi.stubEnv("NODE_ENV", "test");

  const db = await import("@app/server/db");

  prisma = db.prisma;

  await verifyMigrationsApplied(prisma);
});

beforeEach(async () => {
  if (!prisma) {
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
