"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";

import { ErrorScreen } from "@app/shared/ui/error-screen";

import { lightTheme } from "@app/providers/theme";

interface GlobalErrorScreenProps {
  onReset: () => void;
}

export function GlobalErrorScreen({ onReset }: GlobalErrorScreenProps) {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <ErrorScreen onReset={onReset} />
    </ThemeProvider>
  );
}
