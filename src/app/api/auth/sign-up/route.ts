import { NextResponse } from "next/server";

import { features } from "@app/shared/config/features";
import { signUpSchema } from "@app/shared/schemas";

import { applyRateLimit, RATE_LIMITS } from "@app/server/api/rate-limit";
import { errorResponse, internalErrorResponse, parseBody } from "@app/server/api/route-helpers";
import { createUser, EmailExistsError } from "@app/server/auth/signup";
import { isEmailApproved } from "@app/server/waitlist";

export async function POST(request: Request) {
  const { response: limited } = await applyRateLimit(request, {
    bucket: "auth.sign-up",
    ...RATE_LIMITS.SIGN_UP,
  });

  if (limited) {
    return limited;
  }

  const parsed = await parseBody(request, signUpSchema);

  if (parsed.error) {
    return parsed.error;
  }

  const { email, password } = parsed.data;

  try {
    if (!features.publicRegistration) {
      const approved = await isEmailApproved(email);

      if (!approved) {
        return errorResponse("REGISTRATION_DISABLED", "Registration is not available", 403);
      }
    }

    await createUser(email, password);

    return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailExistsError) {
      return errorResponse("EMAIL_EXISTS", error.message, 409);
    }

    console.error("Sign-up error:", error);

    return internalErrorResponse();
  }
}
