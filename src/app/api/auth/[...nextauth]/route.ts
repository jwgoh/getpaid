import type { NextRequest } from "next/server";

import { applyRateLimit, RATE_LIMITS } from "@app/server/api/rate-limit";
import { handlers } from "@app/server/auth";

const CREDENTIALS_CALLBACK_PATH = "/api/auth/callback/credentials";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith(CREDENTIALS_CALLBACK_PATH)) {
    const { response: limited } = await applyRateLimit(request, {
      bucket: "auth.sign-in",
      ...RATE_LIMITS.SIGN_IN,
    });

    if (limited) {
      return limited;
    }
  }

  return handlers.POST(request);
}
