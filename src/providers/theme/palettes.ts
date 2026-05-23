export const brand = {
  primary: "#0f766e",
  primaryLight: "#2dd4bf",
  primaryDark: "#0a5e58",
  secondary: "#6366f1",
  secondaryLight: "#a5b4fc",
  secondaryDark: "#4338ca",
  accent: "#f97316",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  success: "#10b981",
};

export const lightPalette = {
  primary: {
    main: brand.primary,
    light: brand.primaryLight,
    dark: brand.primaryDark,
    contrastText: "#fff",
  },
  secondary: {
    main: brand.secondary,
    light: brand.secondaryLight,
    dark: brand.secondaryDark,
    contrastText: "#fff",
  },
  error: { main: brand.error, contrastText: "#fff" },
  warning: { main: brand.warning, contrastText: "#fff" },
  info: { main: brand.info, contrastText: "#fff" },
  success: { main: brand.success, contrastText: "#fff" },
  background: {
    default: "#f8f9fb",
    paper: "#ffffff",
  },
  text: {
    primary: "#111827",
    secondary: "#5b6270",
  },
  divider: "rgba(107,114,128,0.15)",
};

export const darkPalette = {
  primary: {
    main: brand.primaryLight,
    light: "#5eead4",
    dark: brand.primary,
    contrastText: "#111827",
  },
  secondary: {
    main: brand.secondaryLight,
    light: "#c7d2fe",
    dark: brand.secondary,
    contrastText: "#111827",
  },
  error: { main: "#f87171", contrastText: "#111827" },
  warning: { main: "#fbbf24", contrastText: "#111827" },
  info: { main: "#60a5fa", contrastText: "#111827" },
  success: { main: "#4ade80", contrastText: "#111827" },
  background: {
    default: "#0f1214",
    paper: "#1a1f25",
  },
  text: {
    primary: "#f3f4f6",
    secondary: "#9ca3af",
  },
  divider: "rgba(156,163,175,0.16)",
};
