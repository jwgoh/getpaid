import { describe, expect, it } from "vitest";

import {
  buildColorSchemeScript,
  parseThemeMode,
  readThemeModeFromCookieString,
} from "./theme-mode";

const COOKIE_NAME = "getpaid-theme";

describe("parseThemeMode", () => {
  it("returns 'light' for the literal 'light'", () => {
    expect(parseThemeMode("light")).toBe("light");
  });

  it("returns 'dark' for the literal 'dark'", () => {
    expect(parseThemeMode("dark")).toBe("dark");
  });

  it("returns null for an unknown value", () => {
    expect(parseThemeMode("blue")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseThemeMode("")).toBeNull();
  });

  it("returns null for a value with the wrong casing", () => {
    expect(parseThemeMode("LIGHT")).toBeNull();
  });

  it("returns null for a value with leading whitespace", () => {
    expect(parseThemeMode(" dark")).toBeNull();
  });

  it("returns null for the string '0'", () => {
    expect(parseThemeMode("0")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseThemeMode(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseThemeMode(undefined)).toBeNull();
  });
});

describe("readThemeModeFromCookieString — resolution", () => {
  it("reads the value from a single cookie", () => {
    expect(readThemeModeFromCookieString("getpaid-theme=dark", COOKIE_NAME)).toBe("dark");
  });

  it("reads the value when the cookie is in the middle of others", () => {
    expect(readThemeModeFromCookieString("a=1; getpaid-theme=light; b=2", COOKIE_NAME)).toBe(
      "light"
    );
  });

  it("reads the value when the cookie is in the first position", () => {
    expect(readThemeModeFromCookieString("getpaid-theme=dark; a=1; b=2", COOKIE_NAME)).toBe("dark");
  });

  it("reads the value when the cookie is in the last position", () => {
    expect(readThemeModeFromCookieString("a=1; b=2; getpaid-theme=light", COOKIE_NAME)).toBe(
      "light"
    );
  });

  it("returns null when the cookie is absent", () => {
    expect(readThemeModeFromCookieString("a=1; b=2", COOKIE_NAME)).toBeNull();
  });

  it("returns null for an empty cookie string", () => {
    expect(readThemeModeFromCookieString("", COOKIE_NAME)).toBeNull();
  });

  it("uses the first occurrence when the cookie name is duplicated", () => {
    expect(
      readThemeModeFromCookieString("getpaid-theme=dark; getpaid-theme=light", COOKIE_NAME)
    ).toBe("dark");
  });

  it("returns null when the cookie value is neither light nor dark", () => {
    expect(readThemeModeFromCookieString("getpaid-theme=blue", COOKIE_NAME)).toBeNull();
  });

  it("does not match a longer cookie name that ends with the target name", () => {
    expect(readThemeModeFromCookieString("xgetpaid-theme=dark", COOKIE_NAME)).toBeNull();
  });

  it("trims surrounding whitespace from the cookie value", () => {
    expect(readThemeModeFromCookieString("getpaid-theme= dark ", COOKIE_NAME)).toBe("dark");
  });
});

describe("readThemeModeFromCookieString — malformed percent-encoding (REV-001 regression)", () => {
  it("returns null and does not throw for a lone percent sign", () => {
    expect(() => readThemeModeFromCookieString("getpaid-theme=%", COOKIE_NAME)).not.toThrow();
    expect(readThemeModeFromCookieString("getpaid-theme=%", COOKIE_NAME)).toBeNull();
  });

  it("returns null and does not throw for a truncated percent-escape", () => {
    expect(() =>
      readThemeModeFromCookieString("getpaid-theme=%E0%A4%A", COOKIE_NAME)
    ).not.toThrow();
    expect(readThemeModeFromCookieString("getpaid-theme=%E0%A4%A", COOKIE_NAME)).toBeNull();
  });

  it("returns null and does not throw for an invalid percent-escape", () => {
    expect(() => readThemeModeFromCookieString("getpaid-theme=%zz", COOKIE_NAME)).not.toThrow();
    expect(readThemeModeFromCookieString("getpaid-theme=%zz", COOKIE_NAME)).toBeNull();
  });
});

describe("buildColorSchemeScript", () => {
  it("returns a non-empty string", () => {
    expect(buildColorSchemeScript(COOKIE_NAME).length).toBeGreaterThan(0);
  });

  it("includes the passed cookie name", () => {
    expect(buildColorSchemeScript(COOKIE_NAME)).toContain(COOKIE_NAME);
  });

  it("references colorScheme", () => {
    expect(buildColorSchemeScript(COOKIE_NAME)).toContain("colorScheme");
  });

  it("wraps the body in a try/catch", () => {
    const script = buildColorSchemeScript(COOKIE_NAME);

    expect(script).toContain("try{");
    expect(script).toContain("catch");
  });
});
