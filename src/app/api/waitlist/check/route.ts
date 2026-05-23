import { NextResponse } from "next/server";

import { waitlistSchema } from "@app/shared/schemas";

import { applyRateLimit, RATE_LIMITS } from "@app/server/api/rate-limit";
import { parseBody, withPublic } from "@app/server/api/route-helpers";
import { checkWaitlistStatus } from "@app/server/waitlist";

export const POST = withPublic(async (request) => {
  const { response: limited } = await applyRateLimit(request, {
    bucket: "waitlist.check",
    ...RATE_LIMITS.WAITLIST_CHECK,
  });

  if (limited) {
    return limited;
  }

  const { data, error } = await parseBody(request, waitlistSchema);

  if (error) {
    return error;
  }

  const status = await checkWaitlistStatus(data.email);

  return NextResponse.json({ status });
});
