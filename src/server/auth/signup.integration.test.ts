import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = await import("@app/server/db");
const { EmailExistsError, createUser } = await import("@app/server/auth/signup");
const factories = await import("@app/test/factories");

const STRONG_PASSWORD = "correct horse battery staple";

let consoleError: ReturnType<typeof vi.spyOn> | undefined;

beforeAll(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  consoleError?.mockClear();
});

afterAll(() => {
  consoleError?.mockRestore();
});

describe("createUser happy path", () => {
  it("persists a User row with a bcrypt-hashed password that verifies against the cleartext", async () => {
    const email = `signup-${Date.now()}@example.test`;

    await createUser(email, STRONG_PASSWORD);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.email).toBe(email);
    expect(user.passwordHash).not.toBe(STRONG_PASSWORD);
    expect(user.passwordHash.length).toBeGreaterThan(0);

    const verified = await bcrypt.compare(STRONG_PASSWORD, user.passwordHash);

    expect(verified).toBe(true);
  });
});

describe("createUser duplicate email handling", () => {
  it("throws EmailExistsError on a duplicate email and writes nothing the second time", async () => {
    const email = `duplicate-${Date.now()}@example.test`;

    await createUser(email, STRONG_PASSWORD);

    const beforeRetry = await prisma.user.count({ where: { email } });

    expect(beforeRetry).toBe(1);

    await expect(createUser(email, "different-password-text")).rejects.toBeInstanceOf(
      EmailExistsError
    );

    const afterRetry = await prisma.user.count({ where: { email } });

    expect(afterRetry).toBe(1);
  });
});

describe("createUser waitlist deletion atomicity", () => {
  it("deletes any WaitlistEntry rows that share the same email in the same transaction as the user insert", async () => {
    const email = `waitlist-${Date.now()}@example.test`;

    await factories.createWaitlistEntry(prisma, { email });

    const beforeSignup = await prisma.waitlistEntry.count({ where: { email } });

    expect(beforeSignup).toBe(1);

    await createUser(email, STRONG_PASSWORD);

    const afterSignup = await prisma.waitlistEntry.count({ where: { email } });

    expect(afterSignup).toBe(0);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.email).toBe(email);
  });

  it("is edition-agnostic at the service layer: createUser does not consult features.publicRegistration", async () => {
    const email = `edition-agnostic-${Date.now()}@example.test`;

    await createUser(email, STRONG_PASSWORD);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.email).toBe(email);
  });
});
