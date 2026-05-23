"use client";

import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { Box, Stack, Typography, useTheme } from "@mui/material";

import { UI } from "@app/shared/config/config";
import { ensureReadableForeground } from "@app/shared/lib/contrast";

interface InvoiceHeaderProps {
  logoUrl: string | null;
  senderName: string;
  primaryColor: string;
  accentColor: string;
}

export function InvoiceHeader({
  logoUrl,
  senderName,
  primaryColor,
  accentColor,
}: InvoiceHeaderProps) {
  const theme = useTheme();
  const bg = theme.palette.background.default;
  const fallback = theme.palette.text.primary;
  const readablePrimary = ensureReadableForeground(primaryColor, bg, fallback);
  const readableAccent = ensureReadableForeground(accentColor, bg, fallback);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        mb: 4,
        "@media print": { display: "none" },
      }}
    >
      {logoUrl ? (
        <Box
          component="img"
          src={logoUrl}
          alt="Company logo"
          sx={{
            maxWidth: 180,
            maxHeight: 60,
            objectFit: "contain",
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <>
          <ReceiptLongIcon sx={{ color: readablePrimary, fontSize: UI.ICON_SIZE_MD }} />
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              background: `linear-gradient(135deg, ${readablePrimary} 0%, ${readableAccent} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {senderName}
          </Typography>
        </>
      )}
    </Stack>
  );
}
