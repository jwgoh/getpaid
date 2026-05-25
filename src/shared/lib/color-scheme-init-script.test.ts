import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COOKIE_KEYS } from "@app/shared/config/config";

import {
  COLOR_SCHEME_ATTRIBUTE,
  COLOR_SCHEME_INIT_SCRIPT,
  COLOR_SCHEME_INIT_SCRIPT_SHA256,
} from "./color-scheme-init-script";

interface MockedDom {
  attr: () => string | null;
  colorScheme: () => string;
}

function withMockedDom(cookie: string, prefersDark: boolean): MockedDom {
  const attrs: Record<string, string> = {};
  const style: { colorScheme: string } = { colorScheme: "" };

  vi.stubGlobal("document", {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string): void => {
        attrs[name] = value;
      },
      style,
    },
  });

  vi.stubGlobal("window", {
    matchMedia: (query: string): { matches: boolean } => ({
      matches: query.includes("dark") && prefersDark,
    }),
  });

  return {
    attr: () => attrs[COLOR_SCHEME_ATTRIBUTE] ?? null,
    colorScheme: () => style.colorScheme,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("COLOR_SCHEME_INIT_SCRIPT", () => {
  it("is a non-empty string", () => {
    expect(typeof COLOR_SCHEME_INIT_SCRIPT).toBe("string");
    expect(COLOR_SCHEME_INIT_SCRIPT.length).toBeGreaterThan(0);
  });

  it("references the theme cookie name", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain(COOKIE_KEYS.THEME_MODE);
  });

  it("sets the COLOR_SCHEME_ATTRIBUTE and documentElement.style.colorScheme", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain(COLOR_SCHEME_ATTRIBUTE);
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("documentElement.style.colorScheme");
  });

  it("wraps its body in try/catch so a runtime error never blocks paint", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("try{");
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("catch");
  });
});

describe("COLOR_SCHEME_INIT_SCRIPT_SHA256", () => {
  it("matches the actual sha256 of COLOR_SCHEME_INIT_SCRIPT (CSP whitelist sync)", () => {
    const actual = createHash("sha256").update(COLOR_SCHEME_INIT_SCRIPT).digest("base64");

    expect(COLOR_SCHEME_INIT_SCRIPT_SHA256).toBe(`sha256-${actual}`);
  });
});

describe("COLOR_SCHEME_INIT_SCRIPT execution", () => {
  it("applies dark mode when the theme cookie says dark", () => {
    const dom = withMockedDom("getpaid-theme=dark", false);

    new Function(COLOR_SCHEME_INIT_SCRIPT)();

    expect(dom.attr()).toBe("dark");
    expect(dom.colorScheme()).toBe("dark");
  });

  it("falls back to the prefers-color-scheme media query when the cookie is absent", () => {
    const dom = withMockedDom("other=1", true);

    new Function(COLOR_SCHEME_INIT_SCRIPT)();

    expect(dom.attr()).toBe("dark");
  });

  it("extracts the cookie value when surrounded by other cookies", () => {
    const dom = withMockedDom("a=1; getpaid-theme=dark; b=2", false);

    new Function(COLOR_SCHEME_INIT_SCRIPT)();

    expect(dom.attr()).toBe("dark");
  });
});
