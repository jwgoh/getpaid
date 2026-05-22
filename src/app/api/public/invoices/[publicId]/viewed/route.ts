import { NextResponse } from "next/server";

import { asPublicId } from "@app/shared/types/ids";

import { applyRateLimit, RATE_LIMITS } from "@app/server/api/rate-limit";
import { getUser } from "@app/server/auth/require-user";
import { tryMarkViewed } from "@app/server/invoices";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { response: limited } = await applyRateLimit(request, {
    bucket: "public.invoice.viewed",
    ...RATE_LIMITS.PUBLIC_VIEW,
  });

  if (limited) {
    return limited;
  }

  try {
    const { publicId } = await params;
    const user = await getUser();
    const result = await tryMarkViewed(asPublicId(publicId), user?.id ?? null);

    if (!result.found) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark invoice viewed error:", error);

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
