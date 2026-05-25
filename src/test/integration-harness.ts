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

export class HarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarnessError";
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
