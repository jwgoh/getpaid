import { errorResponse } from "@app/server/api/route-helpers";
import {
  ConnectionNotFoundError,
  TogglApiError,
  UnknownProviderError,
} from "@app/server/time-tracking";

const STATUS_RATE_LIMITED = 429;
const STATUS_SERVER_ERROR_MIN = 500;
const STATUS_BAD_GATEWAY = 502;
const STATUS_NOT_FOUND = 404;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;

type Respond = (error: Error) => ReturnType<typeof errorResponse>;

interface ErrorHandler {
  check: (error: unknown) => boolean;
  respond: Respond;
}

function respondTogglError(error: TogglApiError) {
  const status = error.status;

  if (status === STATUS_RATE_LIMITED) {
    return errorResponse("UPSTREAM_RATE_LIMITED", "Toggl rate limit reached. Try again.", status);
  }

  if (status >= STATUS_SERVER_ERROR_MIN) {
    return errorResponse(
      "UPSTREAM_ERROR",
      "Toggl is currently unavailable. Try again.",
      STATUS_BAD_GATEWAY
    );
  }

  if (status === STATUS_UNAUTHORIZED || status === STATUS_FORBIDDEN) {
    return errorResponse(
      "UPSTREAM_UNAUTHORIZED",
      "Toggl rejected the request. Reconnect your account.",
      STATUS_UNAUTHORIZED
    );
  }

  if (status === STATUS_NOT_FOUND) {
    return errorResponse("UPSTREAM_NOT_FOUND", "Toggl resource not found.", STATUS_NOT_FOUND);
  }

  return errorResponse(
    "UPSTREAM_BAD_REQUEST",
    `Toggl rejected the request (status ${status}).`,
    STATUS_BAD_REQUEST
  );
}

export const timeTrackingErrorHandlers: ErrorHandler[] = [
  {
    check: (error) => error instanceof UnknownProviderError,
    respond: (error) => errorResponse("BAD_REQUEST", error.message, STATUS_BAD_REQUEST),
  },
  {
    check: (error) => error instanceof ConnectionNotFoundError,
    respond: (error) => errorResponse("NOT_FOUND", error.message, STATUS_NOT_FOUND),
  },
  {
    check: (error) => error instanceof TogglApiError,
    respond: (error) => respondTogglError(error as TogglApiError),
  },
];
