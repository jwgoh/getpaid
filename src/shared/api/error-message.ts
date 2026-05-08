import { ApiError } from "@app/shared/api/base";

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
