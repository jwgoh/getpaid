import { NextResponse } from "next/server";

import { asUserId } from "@app/shared/types/ids";

import { notFoundResponse, withAuth } from "@app/server/api/route-helpers";
import { getUserProfile } from "@app/server/user";

export const GET = withAuth(async (user) => {
  const profile = await getUserProfile(asUserId(user.id));

  if (!profile) {
    return notFoundResponse("User");
  }

  return NextResponse.json(profile);
});
