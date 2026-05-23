import type { StorageManager } from "@mui/material/styles";

import { parseThemeMode, readThemeModeFromCookieString } from "@app/shared/lib/theme-mode";

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const NOOP_UNSUBSCRIBE = (): void => {};

function hasDocument(): boolean {
  return typeof document !== "undefined";
}

function buildCookieString(key: string, value: string): string {
  const parts = [
    `${key}=${value}`,
    "path=/",
    `max-age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    parts.push("secure");
  }

  return parts.join("; ");
}

export const cookieStorageManager: StorageManager = ({ key }) => ({
  get(defaultValue) {
    if (!hasDocument()) {
      return defaultValue;
    }

    const fromCookie = readThemeModeFromCookieString(document.cookie, key);

    return fromCookie ?? defaultValue;
  },
  set(value) {
    if (!hasDocument()) {
      return;
    }

    if (typeof value !== "string" || parseThemeMode(value) === null) {
      return;
    }

    document.cookie = buildCookieString(key, value);
  },
  subscribe() {
    return NOOP_UNSUBSCRIBE;
  },
});
