"use client";

import Link from "next/link";

import SearchOffIcon from "@mui/icons-material/SearchOff";
import { alpha, Box, Button, Paper, Stack, Typography } from "@mui/material";

import { UI } from "@app/shared/config/config";
import { Logo } from "@app/shared/ui/logo";

export function NotFoundScreen() {
  return (
    <Stack
      direction="row"
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          borderRadius: 3,
          textAlign: "center",
          maxWidth: 480,
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Logo size="large" />
        </Box>

        <Stack
          direction="row"
          sx={(theme) => ({
            width: UI.EMPTY_STATE_ICON_SIZE,
            height: UI.EMPTY_STATE_ICON_SIZE,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.primary.main, UI.ALPHA_MUTED),
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          })}
        >
          <SearchOffIcon sx={{ fontSize: UI.EMPTY_STATE_ICON_FONT_SIZE, color: "primary.main" }} />
        </Stack>

        <Typography variant="h6" fontWeight={600} gutterBottom>
          Invoice not found
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 360, mx: "auto" }}
        >
          This page or invoice link doesn&apos;t exist anymore. The link may have expired or been
          mistyped.
        </Typography>

        <Button component={Link} href="/" variant="contained">
          Go to homepage
        </Button>
      </Paper>
    </Stack>
  );
}
