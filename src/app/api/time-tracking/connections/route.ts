import { NextResponse } from "next/server";

import { z } from "zod";

import { asUserId } from "@app/shared/types/ids";

import { errorResponse, parseBody, withAuth } from "@app/server/api/route-helpers";
import {
  connectProvider,
  getConnections,
  InvalidProviderTokenError,
  UnknownProviderError,
} from "@app/server/time-tracking";

const connectSchema = z.object({
  provider: z.string().min(1),
  token: z.string().min(1),
});

export const GET = withAuth(async (user) => {
  const connections = await getConnections(asUserId(user.id));

  return NextResponse.json(connections);
});

export const POST = withAuth(
  async (user, request) => {
    const { data, error } = await parseBody(request, connectSchema);

    if (error) {
      return error;
    }

    const connection = await connectProvider(asUserId(user.id), data.provider, data.token);

    return NextResponse.json(connection, { status: 201 });
  },
  [
    {
      check: (error) => error instanceof InvalidProviderTokenError,
      respond: () => errorResponse("VALIDATION_ERROR", "Invalid API token", 400),
    },
    {
      check: (error) => error instanceof UnknownProviderError,
      respond: (error) => errorResponse("BAD_REQUEST", error.message, 400),
    },
  ]
);
