"use client";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { alpha, Box, Button, Paper, Stack, Typography } from "@mui/material";

import { UI } from "@app/shared/config/config";
import { Logo } from "@app/shared/ui/logo";

interface ErrorScreenProps {
  onReset: () => void;
}

export function ErrorScreen({ onReset }: ErrorScreenProps) {
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
            bgcolor: alpha(theme.palette.error.main, UI.ALPHA_MUTED),
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          })}
        >
          <ErrorOutlineIcon sx={{ fontSize: UI.EMPTY_STATE_ICON_FONT_SIZE, color: "error.main" }} />
        </Stack>

        <Typography variant="h6" fontWeight={600} gutterBottom>
          Something went wrong
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 360, mx: "auto" }}
        >
          An unexpected error occurred. Please try again — if it keeps happening, come back in a few
          minutes.
        </Typography>

        <Button variant="contained" startIcon={<RefreshIcon />} onClick={onReset}>
          Try again
        </Button>
      </Paper>
    </Stack>
  );
}
