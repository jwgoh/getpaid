"use client";

import { CircularProgress, Stack, Typography } from "@mui/material";

import { UI } from "@app/shared/config/config";

export function PageLoader({ message }: { message?: string }) {
  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
      }}
    >
      <CircularProgress size={UI.LOADER_SIZE_LG} thickness={4} />
      {message && (
        <Typography color="text.secondary" variant="body2">
          {message}
        </Typography>
      )}
    </Stack>
  );
}
