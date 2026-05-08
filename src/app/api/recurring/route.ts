import { NextResponse } from "next/server";

import { createRecurringApiSchema } from "@app/shared/schemas";

import { notFoundResponse, parseBody, withAuth } from "@app/server/api/route-helpers";
import {
  ClientNotFoundError,
  createRecurringInvoice,
  getRecurringInvoices,
} from "@app/server/recurring";

export const GET = withAuth(async (user) => {
  const recurringInvoices = await getRecurringInvoices(user.id);

  return NextResponse.json(recurringInvoices);
});

export const POST = withAuth(
  async (user, request) => {
    const { data, error } = await parseBody(request, createRecurringApiSchema);

    if (error) {
      return error;
    }

    const recurring = await createRecurringInvoice(user.id, data);

    return NextResponse.json(recurring, { status: 201 });
  },
  [
    {
      check: (error) => error instanceof ClientNotFoundError,
      respond: () => notFoundResponse("Client"),
    },
  ]
);
