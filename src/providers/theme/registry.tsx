"use client";

import * as React from "react";

import { CssBaseline, ThemeProvider } from "@mui/material";

import type { ThemeMode } from "@app/shared/lib/theme-mode";

import { darkTheme, lightTheme } from ".";
import { getSnapshot, setThemeMode, subscribe } from "./theme-store";

export type { ThemeMode } from "@app/shared/lib/theme-mode";

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  mode: "light",
  toggleTheme: () => {},
});

export function useThemeMode() {
  return React.useContext(ThemeContext);
}

export function ThemeRegistry({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: React.ReactNode;
}) {
  const getServerSnapshot = React.useCallback(() => initialMode, [initialMode]);
  const mode = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        document.body.classList.add("user-is-tabbing");
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("user-is-tabbing");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeMode(getSnapshot() === "dark" ? "light" : "dark");
  }, []);

  const theme = mode === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
