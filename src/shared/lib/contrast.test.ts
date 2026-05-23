import { getContrastRatio } from "@mui/material/styles";

import { describe, expect, it } from "vitest";

import { ensureReadableForeground, isReadableContrast } from "./contrast";

const WHITE = "#ffffff";
const BLACK = "#000000";
const DARK_PAPER = "#1a1f25";
const LIGHT_YELLOW = "#fef9c3";
const NAVY = "#1e293b";
const SLATE_700 = "#374151";
const BRAND_ORANGE = "#f97316";

describe("isReadableContrast", () => {
  it("returns true when contrast clears WCAG-AA against white", () => {
    expect(isReadableContrast(BLACK, WHITE)).toBe(true);
  });

  it("returns false for a light brand color on white", () => {
    expect(isReadableContrast(LIGHT_YELLOW, WHITE)).toBe(false);
  });

  it("respects a custom minimum ratio", () => {
    expect(isReadableContrast(BRAND_ORANGE, WHITE, 2)).toBe(true);
    expect(isReadableContrast(BRAND_ORANGE, WHITE, 7)).toBe(false);
  });
});

describe("ensureReadableForeground", () => {
  it("returns the brand color unchanged when it already clears AA on a light background", () => {
    expect(ensureReadableForeground(NAVY, WHITE)).toBe(NAVY);
  });

  it("returns the brand color unchanged when it already clears AA on a dark background", () => {
    expect(ensureReadableForeground(WHITE, DARK_PAPER)).toBe(WHITE);
  });

  it("returns a darkened, AA-safe variant when the brand fails on a light background but darken clears AA", () => {
    const result = ensureReadableForeground(BRAND_ORANGE, WHITE);

    expect(result).not.toBe(BRAND_ORANGE);
    expect(getContrastRatio(result, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("returns a lightened, AA-safe variant when the brand fails on a dark background but lighten clears AA", () => {
    const result = ensureReadableForeground(SLATE_700, DARK_PAPER);

    expect(result).not.toBe(SLATE_700);
    expect(getContrastRatio(result, DARK_PAPER)).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to the supplied fallback when even an adjusted brand fails AA", () => {
    const fallback = "#5b6270";
    const result = ensureReadableForeground(LIGHT_YELLOW, WHITE, fallback);

    expect(result).toBe(fallback);
  });

  it("returns the best-effort adjusted brand when no fallback is supplied and the adjusted brand still fails AA", () => {
    const result = ensureReadableForeground(LIGHT_YELLOW, WHITE);

    expect(result).not.toBe(LIGHT_YELLOW);
  });
});
