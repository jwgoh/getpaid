import { NextResponse } from "next/server";

import { recordPaymentApiSchema } from "@app/shared/schemas";
import { asInvoiceId, asPaymentId, asUserId } from "@app/shared/types/ids";

import { withIdempotency } from "@app/server/api/idempotency";
import {
  errorResponse,
  notFoundResponse,
  parseBody,
  withAuth,
} from "@app/server/api/route-helpers";
import {
  deletePayment,
  getPayments,
  PaymentExceedsBalanceError,
  recordPayment,
} from "@app/server/invoices";

export const GET = withAuth(async (user, _request, context) => {
  const { id } = await context.params;
  const payments = await getPayments(asInvoiceId(id), asUserId(user.id));

  if (payments === null) {
    return notFoundResponse("Invoice");
  }

  return NextResponse.json(payments);
});

export const POST = withAuth(
  withIdempotency(
    async (user, request, context) => {
      const { id } = await context.params;
      const { data, error } = await parseBody(request, recordPaymentApiSchema);

      if (error) {
        return error;
      }

      try {
        const invoice = await recordPayment(asInvoiceId(id), asUserId(user.id), data);

        if (!invoice) {
          return errorResponse(
            "BAD_REQUEST",
            "Cannot record payment. Invoice may not exist or be a draft.",
            400
          );
        }

        return NextResponse.json(invoice);
      } catch (error) {
        if (error instanceof PaymentExceedsBalanceError) {
          return errorResponse(
            "PAYMENT_EXCEEDS_BALANCE",
            "Payment amount exceeds the remaining invoice balance.",
            400
          );
        }

        throw error;
      }
    },
    { endpoint: "POST /api/invoices/:id/payments" }
  )
);

export const DELETE = withAuth(async (user, request, context) => {
  const { id: invoiceId } = await context.params;
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return errorResponse("VALIDATION_ERROR", "Payment ID is required", 400);
  }

  const invoice = await deletePayment(
    asInvoiceId(invoiceId),
    asPaymentId(paymentId),
    asUserId(user.id)
  );

  if (!invoice) {
    return notFoundResponse("Payment not found or cannot be deleted");
  }

  return NextResponse.json(invoice);
});
