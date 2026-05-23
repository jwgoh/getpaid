import { NextResponse } from "next/server";

import { asUserId } from "@app/shared/types/ids";

import { errorResponse, withAuth } from "@app/server/api/route-helpers";
import { getProjects } from "@app/server/time-tracking";

export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const workspaceId = searchParams.get("workspaceId");

  if (!provider || !workspaceId) {
    return errorResponse("VALIDATION_ERROR", "Provider and workspaceId are required", 400);
  }

  const projects = await getProjects(asUserId(user.id), provider, workspaceId);

  return NextResponse.json(projects);
});
