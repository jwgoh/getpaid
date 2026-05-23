import { after, NextResponse } from "next/server";

import { waitlistSchema } from "@app/shared/schemas";

import { notFoundResponse, parseBody, withAdmin } from "@app/server/api/route-helpers";
import { dispatchOutbox } from "@app/server/email/outbox";
import { approveWaitlistEntry, WaitlistEntryNotFoundError } from "@app/server/waitlist";

export const POST = withAdmin(async (_user, request) => {
  const { data, error } = await parseBody(request, waitlistSchema);

  if (error) {
    return error;
  }

  try {
    const result = await approveWaitlistEntry(data.email);
    const outboxId = result.outboxId;

    after(() =>
      dispatchOutbox(outboxId).catch((dispatchError) => {
        console.error("Waitlist approval outbox dispatch error:", dispatchError);
      })
    );

    return NextResponse.json({ message: "User approved and notified" });
  } catch (err) {
    if (err instanceof WaitlistEntryNotFoundError) {
      return notFoundResponse("Waitlist entry");
    }

    throw err;
  }
});
