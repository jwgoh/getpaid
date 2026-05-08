import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { asPublicId } from "@app/shared/types/ids";

import PublicInvoiceView from "@app/features/public-invoice/components/public-invoice-view";

import {
  getInvoiceByPublicId,
  toPublicInvoiceBrandingDTO,
  toPublicInvoiceDTO,
} from "@app/server/invoices";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

interface Props {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ paid?: string }>;
}

export default async function PublicInvoicePage({ params, searchParams }: Props) {
  const { publicId } = await params;
  const { paid } = await searchParams;

  const invoice = await getInvoiceByPublicId(asPublicId(publicId));

  if (!invoice) {
    notFound();
  }

  return (
    <PublicInvoiceView
      publicId={publicId}
      invoice={toPublicInvoiceDTO(invoice)}
      branding={toPublicInvoiceBrandingDTO(invoice)}
      justPaid={paid === "1"}
    />
  );
}
