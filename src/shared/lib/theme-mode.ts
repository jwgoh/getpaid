export type ThemeMode = "light" | "dark";

export const DEFAULT_THEME_MODE: ThemeMode = "light";

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

    return parseThemeMode(decodeURIComponent(value));
  }

  return null;
}

export function buildColorSchemeScript(cookieName: string): string {
  return `(function(){try{var m=document.cookie.match(new RegExp('(?:^|; )${cookieName}=([^;]*)'));var c=m?decodeURIComponent(m[1]):null;var mode=c==='light'||c==='dark'?c:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.style.colorScheme=mode;}catch(e){}})();`;
}
