import { NextResponse } from "next/server";

import { createClientSchema } from "@app/shared/schemas";
import { asUserId } from "@app/shared/types/ids";

import { parseBody, withAuth } from "@app/server/api/route-helpers";
import { createClient, getClients } from "@app/server/clients";

export const GET = withAuth(async (user) => {
  const clients = await getClients(asUserId(user.id));

  return NextResponse.json(clients);
});

export const POST = withAuth(async (user, request) => {
  const { data, error } = await parseBody(request, createClientSchema);

  if (error) {
    return error;
  }

  const client = await createClient(asUserId(user.id), data);

  return NextResponse.json(client, { status: 201 });
});
