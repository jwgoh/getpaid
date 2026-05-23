export type ThemeMode = "light" | "dark";

export function parseThemeMode(raw: string | null | undefined): ThemeMode | null {
  if (raw === "light" || raw === "dark") {
    return raw;
  }

  return null;
}

export function readThemeModeFromCookieString(
  cookieString: string,
  cookieName: string
): ThemeMode | null {
  const entries = cookieString.split(";");

  for (const entry of entries) {
    const separatorIndex = entry.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = entry.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    const value = entry.slice(separatorIndex + 1).trim();

    return parseThemeMode(value);
  }

  return null;
}
