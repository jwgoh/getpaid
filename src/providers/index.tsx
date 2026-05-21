"use client";

import * as React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import type { ThemeMode } from "@app/shared/lib/theme-mode";
import { ScreenReaderProvider } from "@app/shared/ui/screen-reader-announcer";

import { CommandPaletteProvider } from "./command-palette";
import { QueryProvider } from "./query";
import { SessionProvider } from "./session-provider";
import { ThemeRegistry } from "./theme/registry";
import { ToastProvider } from "./toast";

export { QueryProvider } from "./query";
export { SessionProvider } from "./session-provider";
export { type ThemeMode, ThemeRegistry, useThemeMode } from "./theme/registry";

export function Providers({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeRegistry initialMode={initialMode}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ScreenReaderProvider>
              <ToastProvider>
                <CommandPaletteProvider>{children}</CommandPaletteProvider>
              </ToastProvider>
            </ScreenReaderProvider>
          </LocalizationProvider>
        </ThemeRegistry>
      </QueryProvider>
    </SessionProvider>
  );
}
