"use client";

import * as React from "react";

import { CssBaseline, ThemeProvider } from "@mui/material";

import { STORAGE_KEYS } from "@app/shared/config/config";
import { storage } from "@app/shared/lib/storage";

import { darkTheme, lightTheme } from ".";

export type ThemeMode = "light" | "dark";

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

function readInitialMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = storage.get(STORAGE_KEYS.THEME_MODE);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ThemeMode>(readInitialMode);

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
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";

      storage.set(STORAGE_KEYS.THEME_MODE, next);

      return next;
    });
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
