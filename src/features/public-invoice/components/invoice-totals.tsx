"use client";

import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";

import { ensureReadableForeground } from "@app/shared/lib/contrast";
import { formatCurrency } from "@app/shared/lib/format";
import type { Cents } from "@app/shared/types/money";

interface InvoiceTotalsProps {
  subtotal: Cents;
  total: Cents;
  currency: string;
  primaryColor: string;
}

export function InvoiceTotals({ subtotal, total, currency, primaryColor }: InvoiceTotalsProps) {
  const theme = useTheme();
  const readablePrimary = ensureReadableForeground(
    primaryColor,
    theme.palette.background.paper,
    theme.palette.text.primary
  );

  return (
    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
      <Box sx={{ minWidth: 280 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1.5 }}>
          <Typography color="text.secondary">Subtotal</Typography>
          <Typography>{formatCurrency(subtotal, currency)}</Typography>
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={600}>
            Total Due
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: readablePrimary }}>
            {formatCurrency(total, currency)}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}
