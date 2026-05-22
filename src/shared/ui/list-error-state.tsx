"use client";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { alpha, Button, Paper, Stack, Typography, useTheme } from "@mui/material";

import { UI } from "@app/shared/config/config";

interface ListErrorStateProps {
  entity: string;
  onRetry?: () => void;
}

export function ListErrorState({ entity, onRetry }: ListErrorStateProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 6,
        textAlign: "center",
        borderRadius: 3,
        bgcolor: alpha(theme.palette.error.main, UI.ALPHA_LIGHT),
        border: `1px dashed ${alpha(theme.palette.error.main, UI.ALPHA_BORDER)}`,
      }}
      elevation={0}
    >
      <Stack
        direction="row"
        sx={{
          width: UI.EMPTY_STATE_ICON_SIZE,
          height: UI.EMPTY_STATE_ICON_SIZE,
          borderRadius: "50%",
          bgcolor: alpha(theme.palette.error.main, UI.ALPHA_MUTED),
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 3,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: UI.EMPTY_STATE_ICON_FONT_SIZE, color: "error.main" }} />
      </Stack>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Couldn&apos;t load {entity}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: onRetry ? 3 : 0, maxWidth: 400, mx: "auto" }}
      >
        Something went wrong while loading your {entity}. Check your connection and try again.
      </Typography>
      {onRetry && (
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Paper>
  );
}
