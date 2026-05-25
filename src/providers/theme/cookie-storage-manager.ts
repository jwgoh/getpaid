import type { StorageManager } from "@mui/material/styles";

const STORED_MODES = ["light", "dark", "system"] as const;

type StoredMode = (typeof STORED_MODES)[number];

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const NOOP_UNSUBSCRIBE = (): void => {};

function hasDocument(): boolean {
  return typeof document !== "undefined";
}

function isStoredMode(value: unknown): value is StoredMode {
  return typeof value === "string" && (STORED_MODES as readonly string[]).includes(value);
}

function readStoredModeFromCookie(cookieString: string, cookieName: string): StoredMode | null {
  for (const entry of cookieString.split(";")) {
    const separatorIndex = entry.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    if (entry.slice(0, separatorIndex).trim() !== cookieName) {
      continue;
    }

    const value = entry.slice(separatorIndex + 1).trim();

    return isStoredMode(value) ? value : null;
  }

  return null;
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

    const fromCookie = readStoredModeFromCookie(document.cookie, key);

    return fromCookie ?? defaultValue;
  },
  set(value) {
    if (!hasDocument() || !isStoredMode(value)) {
      return;
    }

    document.cookie = buildCookieString(key, value);
  },
  subscribe() {
    return NOOP_UNSUBSCRIBE;
  },
});
