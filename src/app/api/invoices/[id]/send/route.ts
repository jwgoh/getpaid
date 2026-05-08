import { NextResponse } from "next/server";

import { asInvoiceId, asUserId } from "@app/shared/types/ids";

import { errorResponse, withAuth } from "@app/server/api/route-helpers";
import {
  InvoiceAlreadySentError,
  InvoiceNotFoundError,
  sendInvoice,
} from "@app/server/invoices/send";

export const POST = withAuth(
  async (user, _request, context) => {
    const { id } = await context.params;
    const updated = await sendInvoice(asInvoiceId(id), asUserId(user.id));

    return NextResponse.json(updated);
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
