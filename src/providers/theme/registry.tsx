"use client";

import * as React from "react";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";

import { COOKIE_KEYS } from "@app/shared/config/config";
import type { ThemeMode } from "@app/shared/lib/theme-mode";

import { cookieStorageManager } from "./cookie-storage-manager";
import { theme } from "./theme";

export type { ThemeMode } from "@app/shared/lib/theme-mode";

interface UseThemeModeResult {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const DEFAULT_FALLBACK_MODE: ThemeMode = "light";

function resolveEffectiveMode(
  mode: "light" | "dark" | "system" | undefined,
  systemMode: "light" | "dark" | undefined
): ThemeMode {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (systemMode === "light" || systemMode === "dark") {
    return systemMode;
  }

  return DEFAULT_FALLBACK_MODE;
}

export function useThemeMode(): UseThemeModeResult {
  const { mode, systemMode, setMode } = useColorScheme();

  const effectiveMode = resolveEffectiveMode(mode, systemMode);

  const toggleTheme = React.useCallback(() => {
    setMode(effectiveMode === "dark" ? "light" : "dark");
  }, [effectiveMode, setMode]);

  return { mode: effectiveMode, toggleTheme };
}

function FocusTabClassEffect(): null {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Tab") {
        document.body.classList.add("user-is-tabbing");
      }
    };

    const handleMouseDown = (): void => {
      document.body.classList.remove("user-is-tabbing");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return null;
}

interface ThemeRegistryProps {
  children: React.ReactNode;
}

export function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      modeStorageKey={COOKIE_KEYS.THEME_MODE}
      storageManager={cookieStorageManager}
      disableTransitionOnChange
    >
      <CssBaseline />
      <FocusTabClassEffect />
      {children}
    </ThemeProvider>
  );
}
