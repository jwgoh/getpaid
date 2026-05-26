import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  assertTestDatabase,
  findLatestMigrationOnDisk,
  HarnessError,
  resolveExpectedDatabaseName,
  TRUNCATE_TABLES,
  truncateAll,
  verifyMigrationsApplied,
} from "./integration-harness";

const SCHEMA_PATH = join(process.cwd(), "prisma", "schema.prisma");
const MODEL_DECLARATION_PATTERN = /^model\s+(\w+)\s*\{/gm;

function buildPrismaMock(
  queryRaw: (...args: unknown[]) => Promise<unknown>,
  executeRawUnsafe?: (...args: unknown[]) => Promise<unknown>
): PrismaClient {
  return {
    $queryRaw: queryRaw,
    $executeRawUnsafe: executeRawUnsafe ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as PrismaClient;
}

function extractSchemaModelNames(): string[] {
  const source = readFileSync(SCHEMA_PATH, "utf-8");
  const matches = source.matchAll(MODEL_DECLARATION_PATTERN);

  return Array.from(matches, (match) => match[1]);
}

describe("resolveExpectedDatabaseName — MT-002 URL parsing", () => {
  it("returns the database name when the URL points at a test-named database", () => {
    const dbName = resolveExpectedDatabaseName(
      "postgresql://postgres:postgres@localhost:5434/getpaid_test"
    );

    expect(dbName).toBe("getpaid_test");
  });

  it("accepts uppercase 'TEST' token in the database name (case-insensitive guard)", () => {
    const dbName = resolveExpectedDatabaseName("postgresql://u:p@h:5432/MyTESTdb");

    expect(dbName).toBe("MyTESTdb");
  });

  it("throws HarnessError when the URL has no database name in its path", () => {
    expect(() =>
      resolveExpectedDatabaseName("postgresql://postgres:postgres@localhost:5434/")
    ).toThrow(HarnessError);
  });

  it("throws HarnessError when the database name does not contain the 'test' token", () => {
    expect(() => resolveExpectedDatabaseName("postgresql://u:p@h:5432/getpaid_prod")).toThrow(
      /does not contain "test"/
    );
  });

  it("throws HarnessError when the URL is not parseable", () => {
    expect(() => resolveExpectedDatabaseName("not-a-url")).toThrow(HarnessError);
  });

  it("redacts credentials when the URL parses but has no database name in the path", () => {
    try {
      resolveExpectedDatabaseName("postgresql://user:secret@host:5432/");
      expect.fail("should have thrown");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).not.toContain("secret");
    }
  });
});

describe("assertTestDatabase — MT-001 non-test DB guard", () => {
  it("throws HarnessError when current_database() returns a non-test name", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ current_database: "getpaid_prod" }]);
    const client = buildPrismaMock(queryRaw);

    await expect(assertTestDatabase(client, "getpaid_test")).rejects.toBeInstanceOf(HarnessError);
    await expect(assertTestDatabase(client, "getpaid_test")).rejects.toThrow(/getpaid_prod/);
  });

  it("resolves when current_database() matches the expected name", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ current_database: "getpaid_test" }]);
    const client = buildPrismaMock(queryRaw);

    await expect(assertTestDatabase(client, "getpaid_test")).resolves.toBeUndefined();
  });

  it("throws when current_database() returns an empty row set", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const client = buildPrismaMock(queryRaw);

    await expect(assertTestDatabase(client, "getpaid_test")).rejects.toBeInstanceOf(HarnessError);
  });

  it("includes both expected and actual database names in the failure message", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ current_database: "wrong_db" }]);
    const client = buildPrismaMock(queryRaw);

    try {
      await assertTestDatabase(client, "getpaid_test");
      expect.fail("should have thrown");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).toContain("wrong_db");
      expect(message).toContain("getpaid_test");
    }
  });
});

describe("verifyMigrationsApplied — MT-003 schema drift detection", () => {
  it("throws HarnessError when the latest on-disk migration is not in _prisma_migrations", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const client = buildPrismaMock(queryRaw);

    await expect(verifyMigrationsApplied(client)).rejects.toBeInstanceOf(HarnessError);
    await expect(verifyMigrationsApplied(client)).rejects.toThrow(/is not applied/);
  });

  it("resolves when the latest on-disk migration is found in _prisma_migrations", async () => {
    const latestOnDisk = findLatestMigrationOnDisk();
    const queryRaw = vi.fn().mockResolvedValue([{ migration_name: latestOnDisk }]);
    const client = buildPrismaMock(queryRaw);

    await expect(verifyMigrationsApplied(client)).resolves.toBeUndefined();
  });

  it("wraps a $queryRaw failure as HarnessError with the actionable message", async () => {
    const queryRaw = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const client = buildPrismaMock(queryRaw);

    await expect(verifyMigrationsApplied(client)).rejects.toBeInstanceOf(HarnessError);
    await expect(verifyMigrationsApplied(client)).rejects.toThrow(/test:integration:up/);
  });
});

describe("findLatestMigrationOnDisk — MT-003 helper", () => {
  it("returns the alphabetically last timestamp-prefixed migration directory", () => {
    const latest = findLatestMigrationOnDisk();

    expect(latest).toMatch(/^\d{14}_/);
  });
});

describe("TRUNCATE_TABLES — MT-009/010 schema-vs-truncate-list drift", () => {
  it("covers every model declared in prisma/schema.prisma", () => {
    const schemaModels = extractSchemaModelNames();

    expect(schemaModels.length).toBeGreaterThan(0);

    const missingFromList = schemaModels.filter(
      (model) => !TRUNCATE_TABLES.includes(model as never)
    );

    expect(missingFromList).toEqual([]);
  });

  it("does not list a table that is absent from prisma/schema.prisma", () => {
    const schemaModels = new Set(extractSchemaModelNames());
    const extraEntries = TRUNCATE_TABLES.filter((table) => !schemaModels.has(table));

    expect(extraEntries).toEqual([]);
  });

  it("lists at least one table (sanity check against accidental empty list)", () => {
    expect(TRUNCATE_TABLES.length).toBeGreaterThan(0);
  });
});

describe("truncateAll — MT-009 raw SQL composition", () => {
  it("issues a single TRUNCATE statement that quotes every TRUNCATE_TABLES entry", async () => {
    const executeRawUnsafe = vi.fn().mockResolvedValue(0);
    const queryRaw = vi.fn();
    const client = buildPrismaMock(queryRaw, executeRawUnsafe);

    await truncateAll(client);

    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
    const issued = executeRawUnsafe.mock.calls[0]?.[0];

    expect(typeof issued).toBe("string");
    expect(issued).toContain("RESTART IDENTITY CASCADE");

    for (const table of TRUNCATE_TABLES) {
      expect(issued).toContain(`"${table}"`);
    }
  });
});
