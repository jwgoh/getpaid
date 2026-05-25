import { describe, expect, it } from "vitest";

import { lightTheme, theme } from "./theme";

describe("theme", () => {
  it("targets the data-mui-color-scheme attribute via the cssVariables selector", () => {
    expect(theme.colorSchemeSelector).toBe("data-mui-color-scheme");
  });

  it("exposes CSS-variable mode by attaching a vars object", () => {
    expect(theme.vars).toBeTruthy();
  });

  it("defines a light color scheme with palette mode 'light'", () => {
    expect(theme.colorSchemes.light?.palette.mode).toBe("light");
  });

  it("defines a dark color scheme with palette mode 'dark'", () => {
    expect(theme.colorSchemes.dark?.palette.mode).toBe("dark");
  });
});

describe("lightTheme", () => {
  it("is a single-mode theme used by the global error boundary", () => {
    expect(lightTheme.palette.mode).toBe("light");
  });
});
