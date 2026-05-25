export const API_ERROR_CODES = {
  CONNECTION_DECRYPT_FAILED: "CONNECTION_DECRYPT_FAILED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
