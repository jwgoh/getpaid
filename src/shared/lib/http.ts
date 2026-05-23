export const EXTERNAL_HTTP_TIMEOUTS_MS = {
  TOGGL: 15_000,
  RESEND: 10_000,
} as const;

class HttpTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`External HTTP call to ${label} timed out after ${timeoutMs}ms`);
    this.name = "HttpTimeoutError";
  }
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new HttpTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
