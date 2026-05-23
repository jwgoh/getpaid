const STATUS_RATE_LIMITED = 429;
const STATUS_SERVER_ERROR_MIN = 500;
const STATUS_CLIENT_ERROR_MIN = 400;
const STATUS_CLIENT_ERROR_MAX = 500;
const JITTER_MIN_RATIO = 0.5;
const JITTER_RANGE_RATIO = 0.5;

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  signal?: AbortSignal;
  random?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface RetryableHttpError {
  status: number;
}

function isRetryableHttpError(value: unknown): value is RetryableHttpError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = (value as { status?: unknown }).status;

  return typeof status === "number";
}

function isAbortError(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const name = (value as { name?: unknown }).name;

  return name === "AbortError" || name === "TimeoutError";
}

export function isTransientStatus(status: number): boolean {
  if (status === STATUS_RATE_LIMITED) {
    return true;
  }

  if (status >= STATUS_SERVER_ERROR_MIN) {
    return true;
  }

  return false;
}

export function isTransientError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
  }

  if (isRetryableHttpError(error)) {
    const status = error.status;

    if (status === STATUS_RATE_LIMITED) {
      return true;
    }

    if (status >= STATUS_SERVER_ERROR_MIN) {
      return true;
    }

    if (status >= STATUS_CLIENT_ERROR_MIN && status < STATUS_CLIENT_ERROR_MAX) {
      return false;
    }

    return false;
  }

  return true;
}

async function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("aborted");
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve();
    }, ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
      };

      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function computeBackoff(attempt: number, baseDelayMs: number, random: () => number): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitterRatio = JITTER_MIN_RATIO + random() * JITTER_RANGE_RATIO;

  return Math.floor(exponential * jitterRatio);
}

export async function retryOnTransient<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, baseDelayMs, signal } = options;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error("aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === maxAttempts - 1;

      if (isLast || !isTransientError(error)) {
        throw error;
      }

      await sleep(computeBackoff(attempt, baseDelayMs, random), signal);
    }
  }

  throw lastError;
}
