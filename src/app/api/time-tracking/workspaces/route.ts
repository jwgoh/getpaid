import { NextResponse } from "next/server";

import { asUserId } from "@app/shared/types/ids";

import { errorResponse, withAuth } from "@app/server/api/route-helpers";
import {
  ConnectionNotFoundError,
  getWorkspaces,
  UnknownProviderError,
} from "@app/server/time-tracking";

export const GET = withAuth(
  async (user, request) => {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return errorResponse("VALIDATION_ERROR", "Provider is required", 400);
    }

    const workspaces = await getWorkspaces(asUserId(user.id), provider);

    return NextResponse.json(workspaces);
  },
  [
    {
      check: (error) => error instanceof UnknownProviderError,
      respond: (error) => errorResponse("BAD_REQUEST", error.message, 400),
    },
    {
      check: (error) => error instanceof ConnectionNotFoundError,
      respond: (error) => errorResponse("NOT_FOUND", error.message, 404),
    },
  ]
);
