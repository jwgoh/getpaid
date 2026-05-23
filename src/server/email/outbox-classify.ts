export type OutboxFailureKind = "transient" | "permanent";

export interface ResendErrorShape {
  statusCode: number | null;
  name: string | null;
  message: string | null;
}

const STATUS_RATE_LIMITED = 429;
const STATUS_SERVER_ERROR_MIN = 500;
const STATUS_CLIENT_ERROR_MIN = 400;
const STATUS_CLIENT_ERROR_MAX = 500;

const TRANSIENT_NAMES = new Set<string>([
  "rate_limit_exceeded",
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
  "internal_server_error",
  "application_error",
]);

export function extractResendError(value: unknown): ResendErrorShape | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const rawStatus = candidate.statusCode;
  const rawName = candidate.name;
  const rawMessage = candidate.message;

  const hasShape = "statusCode" in candidate || "name" in candidate || "message" in candidate;

  if (!hasShape) {
    return null;
  }

  return {
    statusCode: typeof rawStatus === "number" ? rawStatus : null,
    name: typeof rawName === "string" ? rawName : null,
    message: typeof rawMessage === "string" ? rawMessage : null,
  };
}

export function classifyResendError(error: ResendErrorShape | null): OutboxFailureKind {
  if (!error) {
    return "transient";
  }

  if (error.name && TRANSIENT_NAMES.has(error.name)) {
    return "transient";
  }

  const status = error.statusCode;

  if (status === null) {
    return "transient";
  }

  if (status === STATUS_RATE_LIMITED) {
    return "transient";
  }

  if (status >= STATUS_SERVER_ERROR_MIN) {
    return "transient";
  }

  if (status >= STATUS_CLIENT_ERROR_MIN && status < STATUS_CLIENT_ERROR_MAX) {
    return "permanent";
  }

  return "transient";
}
