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

export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
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

  return json as T;
}
