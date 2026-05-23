import { NextResponse } from "next/server";

import { asUserId } from "@app/shared/types/ids";

import { getAnalytics } from "@app/server/analytics";
import { withAuth } from "@app/server/api/route-helpers";

export const GET = withAuth(async (user) => {
  const analytics = await getAnalytics(asUserId(user.id));

  return NextResponse.json(analytics);
});
