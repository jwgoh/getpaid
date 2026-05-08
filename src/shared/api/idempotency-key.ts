export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function idempotencyHeader(key: string): Record<string, string> {
  return { "Idempotency-Key": key };
}
