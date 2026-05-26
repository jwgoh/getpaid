import type { PrismaClient } from "@prisma/client";

const USER_DATA_TABLES = [
  "EmailOutbox",
  "IdempotencyKey",
  "InvoiceTemplateItem",
  "InvoiceTemplateItemGroup",
  "InvoiceTemplate",
  "Payment",
  "InvoiceEvent",
  "InvoiceItem",
  "InvoiceItemGroup",
  "Invoice",
  "Client",
  "SenderProfile",
  "TimeTrackingConnection",
  "VerificationToken",
  "Session",
  "Account",
  "User",
  "WaitlistEntry",
] as const;

const NOT_READY_MESSAGE = "Integration test DB not ready. Run `pnpm test:integration:up` first.";
const TEST_DB_NAME_TOKEN = "test";

export class HarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarnessError";
  }
}

export function resolveExpectedDatabaseName(databaseUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new HarnessError(
      `DATABASE_URL_TEST is not a parseable URL. Got: ${describeSafeUrl(databaseUrl)}`
    );
  }

  const dbName = parsed.pathname.replace(/^\//, "");

  if (!dbName) {
    throw new HarnessError(
      `DATABASE_URL_TEST has no database name in its path. Got: ${describeSafeUrl(databaseUrl)}`
    );
  }

  if (!dbName.toLowerCase().includes(TEST_DB_NAME_TOKEN)) {
    throw new HarnessError(
      `DATABASE_URL_TEST database name "${dbName}" does not contain "${TEST_DB_NAME_TOKEN}". ` +
        `Refusing to run integration tests against a database whose name does not signal a test environment.`
    );
  }

  return dbName;
}

function describeSafeUrl(databaseUrl: string): string {
  return databaseUrl.replace(/:\/\/[^@]*@/, "://***@");
}

export async function assertTestDatabase(
  client: PrismaClient,
  expectedDatabaseName: string
): Promise<void> {
  const rows = await client.$queryRaw<Array<{ current_database: string }>>`
    SELECT current_database() AS current_database;
  `;
  const actual = rows[0]?.current_database ?? "";

  if (actual !== expectedDatabaseName) {
    throw new HarnessError(
      `Refusing to run integration tests against database "${actual}". ` +
        `Expected "${expectedDatabaseName}" (parsed from DATABASE_URL_TEST). ` +
        `This safeguard prevents TRUNCATE against a non-test database.`
    );
  }
}

export async function truncateAll(client: PrismaClient): Promise<void> {
  const quoted = USER_DATA_TABLES.map((table) => `"${table}"`).join(", ");

  await client.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

export async function verifyMigrationsApplied(client: PrismaClient): Promise<void> {
  try {
    await client.$queryRaw`SELECT 1 FROM "_prisma_migrations" LIMIT 1`;
  } catch {
    throw new HarnessError(NOT_READY_MESSAGE);
  }
}

export async function disconnectDb(client: PrismaClient): Promise<void> {
  await client.$disconnect();
}

export { USER_DATA_TABLES };
