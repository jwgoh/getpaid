import { NextResponse } from "next/server";

import { asUserId } from "@app/shared/types/ids";

import { errorResponse, withAuth } from "@app/server/api/route-helpers";
import { getWorkspaces } from "@app/server/time-tracking";
import { timeTrackingErrorHandlers } from "@app/server/time-tracking/api-errors";

export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return errorResponse("VALIDATION_ERROR", "Provider is required", 400);
  }

  const workspaces = await getWorkspaces(asUserId(user.id), provider);

  return NextResponse.json(workspaces);
}, timeTrackingErrorHandlers);
