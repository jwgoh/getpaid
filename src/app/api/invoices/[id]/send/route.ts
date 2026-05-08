import { NextResponse } from "next/server";

import { errorResponse, withAuth } from "@app/shared/api/route-helpers";

import {
  InvoiceAlreadySentError,
  InvoiceNotFoundError,
  sendInvoice,
} from "@app/server/invoices/send";

export const POST = withAuth(
  async (user, _request, context) => {
    const { id } = await context.params;
    const updated = await sendInvoice(id, user.id);

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
