import { NextResponse } from "next/server";

import { applyRateLimit, RATE_LIMITS } from "@app/shared/api/rate-limit";
import { waitlistSchema } from "@app/shared/schemas";

import { internalErrorResponse, parseBody } from "@app/server/api/route-helpers";
import { checkWaitlistStatus } from "@app/server/waitlist";

export async function POST(request: Request) {
  const { response: limited } = await applyRateLimit(request, {
    bucket: "waitlist.check",
    ...RATE_LIMITS.WAITLIST_CHECK,
  });

  if (limited) {
    return limited;
  }

  try {
    const { data, error } = await parseBody(request, waitlistSchema);

    if (error) {
      return error;
    }

    const status = await checkWaitlistStatus(data.email);

    return NextResponse.json({ status });
  } catch (err) {
    console.error("Waitlist check error:", err);

    return internalErrorResponse();
  }
}
