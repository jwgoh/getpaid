import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "@app/shared/config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for time tracking integrations"
    );
  }

  const decoded = Buffer.from(key, "base64");

  if (decoded.length !== KEY_LENGTH) {
    throw new Error(
      "ENCRYPTION_KEY must decode to exactly 32 bytes — generate via: openssl rand -base64 32"
    );
  }

  return decoded;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export class TokenDecryptError extends Error {
  constructor(cause?: unknown) {
    super("Failed to decrypt token", cause === undefined ? undefined : { cause });
    this.name = "TokenDecryptError";
  }
}

export function decrypt(ciphertext: string): string {
  const key = getKey();

  try {
    const data = Buffer.from(ciphertext, "base64");

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (error) {
    throw new TokenDecryptError(error);
  }
}
