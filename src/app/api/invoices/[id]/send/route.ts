import { after, NextResponse } from "next/server";

import { asInvoiceId, asUserId } from "@app/shared/types/ids";

import { errorResponse, withAuth } from "@app/server/api/route-helpers";
import { dispatchOutbox } from "@app/server/email/outbox";
import {
  InvoiceAlreadySentError,
  InvoiceNotFoundError,
  sendInvoice,
} from "@app/server/invoices/send";

export const POST = withAuth(
  async (user, _request, context) => {
    const { id } = await context.params;
    const { invoice, outboxId } = await sendInvoice(asInvoiceId(id), asUserId(user.id));

    after(() =>
      dispatchOutbox(outboxId).catch((error) => {
        console.error("Invoice send outbox dispatch error:", error);
      })
    );

    return NextResponse.json(invoice);
  },
  [
    {
      check: (error) => error instanceof InvoiceNotFoundError,
      respond: (error) => errorResponse("NOT_FOUND", error.message, 404),
    },
    {
      check: (error) => error instanceof InvoiceAlreadySentError,
      respond: (error) => errorResponse("ALREADY_SENT", error.message, 400),
    },
  ]
);
