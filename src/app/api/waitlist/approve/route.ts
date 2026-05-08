import { NextResponse } from "next/server";

import { notFoundResponse, parseBody, withAdmin } from "@app/shared/api/route-helpers";
import { waitlistSchema } from "@app/shared/schemas";

import { dispatchOutbox } from "@app/server/email/outbox";
import { approveWaitlistEntry, WaitlistEntryNotFoundError } from "@app/server/waitlist";

export const POST = withAdmin(async (_user, request) => {
  const { data, error } = await parseBody(request, waitlistSchema);

  if (error) {
    return error;
  }

  try {
    const result = await approveWaitlistEntry(data.email);

    await dispatchOutbox(result.outboxId);

    return NextResponse.json({ message: "User approved and notified" });
  } catch (err) {
    if (err instanceof WaitlistEntryNotFoundError) {
      return notFoundResponse("Waitlist entry");
    }

    throw err;
  }
});
