import { NextResponse } from "next/server";

import { applyRateLimit, RATE_LIMITS } from "@app/shared/api/rate-limit";

import { getUser } from "@app/server/auth/require-user";
import { getInvoiceByPublicId, markInvoiceViewed } from "@app/server/invoices";

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

    const invoice = await getInvoiceByPublicId(publicId);

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    const user = await getUser();

    if (user?.id !== invoice.userId) {
      await markInvoiceViewed(publicId);
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
