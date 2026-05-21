"use client";

import { COOKIE_KEYS } from "@app/shared/config/config";
import {
  DEFAULT_THEME_MODE,
  readThemeModeFromCookieString,
  type ThemeMode,
} from "@app/shared/lib/theme-mode";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const listeners = new Set<() => void>();

function getPrefersDarkMediaQuery(): MediaQueryList | null {
  return window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  const mediaQuery = getPrefersDarkMediaQuery();

  mediaQuery?.addEventListener("change", callback);

  return () => {
    listeners.delete(callback);
    mediaQuery?.removeEventListener("change", callback);
  };
}

export function getSnapshot(): ThemeMode {
  const fromCookie = readThemeModeFromCookieString(document.cookie, COOKIE_KEYS.THEME_MODE);

  if (fromCookie !== null) {
    return fromCookie;
  }

  if (getPrefersDarkMediaQuery()?.matches) {
    return "dark";
  }

  return DEFAULT_THEME_MODE;
}

export function setThemeMode(mode: ThemeMode): void {
  const isSecure = window.location.protocol === "https:";
  const attributes = [
    `${COOKIE_KEYS.THEME_MODE}=${mode}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];

  if (isSecure) {
    attributes.push("secure");
  }

  document.cookie = attributes.join("; ");

  for (const listener of listeners) {
    listener();
  }
}
