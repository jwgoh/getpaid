import { NextResponse } from "next/server";

import { internalErrorResponse, parseBody } from "@app/shared/api/route-helpers";
import { waitlistSchema } from "@app/shared/schemas";

import { dispatchOutbox } from "@app/server/email/outbox";
import { addToWaitlist } from "@app/server/waitlist";

export async function POST(request: Request) {
  try {
    const { data, error } = await parseBody(request, waitlistSchema);

    if (error) {
      return error;
    }

    const result = await addToWaitlist(data.email);

    if (result.confirmationOutboxId) {
      await dispatchOutbox(result.confirmationOutboxId);
    }

    if (result.notificationOutboxId) {
      await dispatchOutbox(result.notificationOutboxId);
    }

    return NextResponse.json({ message: "You've been added to the waitlist!" }, { status: 201 });
  } catch (err) {
    console.error("Waitlist error:", err);

    return internalErrorResponse();
  }
}
