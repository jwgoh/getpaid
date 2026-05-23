import { after, NextResponse } from "next/server";

import { waitlistSchema } from "@app/shared/schemas";

import { applyRateLimit, RATE_LIMITS } from "@app/server/api/rate-limit";
import { parseBody, withPublic } from "@app/server/api/route-helpers";
import { dispatchOutbox } from "@app/server/email/outbox";
import { addToWaitlist } from "@app/server/waitlist";

export const POST = withPublic(async (request) => {
  const { response: limited } = await applyRateLimit(request, {
    bucket: "waitlist.join",
    ...RATE_LIMITS.WAITLIST,
  });

  if (limited) {
    return limited;
  }

  const { data, error } = await parseBody(request, waitlistSchema);

  if (error) {
    return error;
  }

  const result = await addToWaitlist(data.email);

  if (result.confirmationOutboxId) {
    const confirmationOutboxId = result.confirmationOutboxId;

    after(() =>
      dispatchOutbox(confirmationOutboxId).catch((dispatchError) => {
        console.error("Waitlist confirmation outbox dispatch error:", dispatchError);
      })
    );
  }

  if (result.notificationOutboxId) {
    const notificationOutboxId = result.notificationOutboxId;

    after(() =>
      dispatchOutbox(notificationOutboxId).catch((dispatchError) => {
        console.error("Waitlist notification outbox dispatch error:", dispatchError);
      })
    );
  }

  return NextResponse.json({ message: "You've been added to the waitlist!" }, { status: 201 });
});
