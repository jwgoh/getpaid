import { randomBytes } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_KEY = randomBytes(32).toString("base64");

async function loadEncryption(encryptionKey: string | undefined) {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
  vi.stubEnv("NEXTAUTH_SECRET", randomBytes(32).toString("base64"));
  vi.stubEnv("ENCRYPTION_KEY", encryptionKey);

  return import("./encryption");
}

describe("encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("encrypt / decrypt round-trip", () => {
    it("returns the original plaintext after an encrypt then decrypt cycle", async () => {
      const { encrypt, decrypt } = await loadEncryption(VALID_KEY);
      const plaintext = "toggl-api-token-1234567890";

      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("preserves an empty string through the round-trip", async () => {
      const { encrypt, decrypt } = await loadEncryption(VALID_KEY);

      expect(decrypt(encrypt(""))).toBe("");
    });

    it("preserves a unicode string through the round-trip", async () => {
      const { encrypt, decrypt } = await loadEncryption(VALID_KEY);
      const plaintext = "токен-日本語-🔑";

      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("produces a different ciphertext for the same plaintext on each call", async () => {
      const { encrypt } = await loadEncryption(VALID_KEY);
      const plaintext = "same-input";

      expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
    });
  });

  describe("key validation", () => {
    it("rejects a key that base64-decodes to fewer than 32 bytes", async () => {
      const shortKey = randomBytes(16).toString("base64");
      const { encrypt } = await loadEncryption(shortKey);

      expect(() => encrypt("token")).toThrow(/exactly 32 bytes/);
    });

    it("rejects a key that base64-decodes to more than 32 bytes", async () => {
      const longKey = randomBytes(48).toString("base64");
      const { encrypt } = await loadEncryption(longKey);

      expect(() => encrypt("token")).toThrow(/exactly 32 bytes/);
    });

    it("rejects a 32-character non-base64 key whose decoded length is not 32 bytes", async () => {
      const { encrypt } = await loadEncryption("change-me-please-32-bytes-base64");

      expect(() => encrypt("token")).toThrow(/exactly 32 bytes/);
    });

    it("throws a descriptive error when the key is absent", async () => {
      const { encrypt } = await loadEncryption(undefined);

      expect(() => encrypt("token")).toThrow(/ENCRYPTION_KEY environment variable is required/);
    });
  });
});
