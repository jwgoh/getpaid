import { describe, expect, it } from "vitest";

import { COOKIE_KEYS } from "@app/shared/config/config";

import { COLOR_SCHEME_INIT_SCRIPT } from "./color-scheme-init-script";

describe("COLOR_SCHEME_INIT_SCRIPT", () => {
  it("is a non-empty string", () => {
    expect(typeof COLOR_SCHEME_INIT_SCRIPT).toBe("string");
    expect(COLOR_SCHEME_INIT_SCRIPT.length).toBeGreaterThan(0);
  });

  it("references the theme cookie name", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain(COOKIE_KEYS.THEME_MODE);
  });

  it("sets the data-mui-color-scheme attribute and documentElement.style.colorScheme", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("data-mui-color-scheme");
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("documentElement.style.colorScheme");
  });

  it("wraps its body in try/catch so a runtime error never blocks paint", () => {
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("try{");
    expect(COLOR_SCHEME_INIT_SCRIPT).toContain("catch");
  });
});
