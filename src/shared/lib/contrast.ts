import { darken, getContrastRatio, getLuminance, lighten } from "@mui/material/styles";

const WCAG_AA_NORMAL = 4.5;
const BRAND_ADJUSTMENT_AMOUNT = 0.4;
const LIGHT_BG_LUMINANCE_THRESHOLD = 0.5;

export function isReadableContrast(
  foreground: string,
  background: string,
  minRatio: number = WCAG_AA_NORMAL
): boolean {
  return getContrastRatio(foreground, background) >= minRatio;
}

export function ensureReadableForeground(brand: string, bg: string, fallback?: string): string {
  if (isReadableContrast(brand, bg)) {
    return brand;
  }

  const isLightBg = getLuminance(bg) > LIGHT_BG_LUMINANCE_THRESHOLD;
  const adjust = isLightBg ? darken : lighten;
  const adjusted = adjust(brand, BRAND_ADJUSTMENT_AMOUNT);

  if (isReadableContrast(adjusted, bg)) {
    return adjusted;
  }

  return fallback ?? adjusted;
}
