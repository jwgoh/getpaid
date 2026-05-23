import type { ZodError, ZodIssue, ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiResponseShapeError extends Error {
  constructor(
    public url: string,
    cause: ZodError
  ) {
    super(`API response shape mismatch for ${url}`, { cause });
    this.name = "ApiResponseShapeError";
  }

  get issues(): ZodIssue[] {
    return (this.cause as ZodError).issues;
  }
}

export async function fetchApi<T>(
  url: string,
  options?: RequestInit,
  schema?: ZodType<T>
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const body = (json ?? {}) as Record<string, unknown>;
    const error =
      typeof body.error === "object" && body.error !== null
        ? (body.error as Record<string, unknown>)
        : {};
    const details =
      typeof error.details === "object" && error.details !== null
        ? (error.details as Record<string, unknown>)
        : undefined;

    throw new ApiError(
      typeof error.code === "string" ? error.code : "UNKNOWN_ERROR",
      typeof error.message === "string" ? error.message : "An unexpected error occurred",
      response.status,
      details
    );
  }

  if (!schema) {
    return json as T;
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    console.error(
      JSON.stringify({
        event: "api.response.shape_mismatch",
        url,
        issues: parsed.error.issues,
      })
    );

    throw new ApiResponseShapeError(url, parsed.error);
  }

  return parsed.data;
}
