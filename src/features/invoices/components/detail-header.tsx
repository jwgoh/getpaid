"use client";

import { Box, Chip, type ChipProps, Stack, Typography } from "@mui/material";

import { formatDate } from "@app/shared/lib/format";
import type { Invoice } from "@app/shared/schemas/api";
import { Breadcrumbs } from "@app/shared/ui/breadcrumbs";

import { useInvoiceDetail } from "../hooks/use-invoice-detail";
import { DetailActions } from "./detail-actions";

type InvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

interface DetailHeaderProps {
  invoice: Invoice;
  status: { label: string; color: NonNullable<ChipProps["color"]> };
  isDraft: boolean;
  isPaid: boolean;
  isPartiallyPaid: boolean;
  invoiceId: string;
  detail: InvoiceDetailReturn;
}

export function DetailHeader({
  invoice,
  status,
  isDraft,
  isPaid,
  isPartiallyPaid,
  invoiceId,
  detail,
}: DetailHeaderProps) {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Invoices", href: "/app/invoices" }, { label: `#${invoice.publicId}` }]}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 4,
        }}
      >
        <Box>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 0.5 }}>
            <Typography variant="h4" component="h1" fontWeight={700}>
              Invoice #{invoice.publicId}
            </Typography>
            <Chip label={status.label} color={status.color} sx={{ fontWeight: 600 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Created on {formatDate(invoice.createdAt)}
          </Typography>
        </Box>

        <DetailActions
          isDraft={isDraft}
          isPaid={isPaid}
          isPartiallyPaid={isPartiallyPaid}
          invoiceId={invoiceId}
          detail={detail}
        />
      </Stack>
    </>
  );
}
