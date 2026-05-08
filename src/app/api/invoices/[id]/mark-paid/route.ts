import { NextResponse } from "next/server";

import { asInvoiceId, asUserId } from "@app/shared/types/ids";

import { notFoundResponse, withAuth } from "@app/server/api/route-helpers";
import { markInvoicePaid } from "@app/server/invoices";

export const POST = withAuth(async (user, _request, context) => {
  const { id } = await context.params;
  const invoice = await markInvoicePaid(asInvoiceId(id), asUserId(user.id), "MANUAL");

  if (!invoice) {
    return notFoundResponse("Invoice not found or already paid");
  }

  return NextResponse.json(invoice);
});
