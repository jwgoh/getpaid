export const typography = {
  fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1: {
    fontWeight: 800,
    fontSize: "2.25rem",
    lineHeight: 1.15,
    letterSpacing: "-0.025em",
    "@media (min-width:900px)": {
      fontSize: "3.5rem",
    },
  },
  h2: {
    fontWeight: 700,
    fontSize: "2rem",
    lineHeight: 1.3,
    letterSpacing: "-0.02em",
  },
  h3: {
    fontWeight: 700,
    fontSize: "1.5rem",
    lineHeight: 1.4,
    letterSpacing: "-0.015em",
  },
  h4: {
    fontWeight: 700,
    fontSize: "1.25rem",
    lineHeight: 1.4,
    letterSpacing: "-0.01em",
  },
  h5: {
    fontWeight: 600,
    fontSize: "1.125rem",
    lineHeight: 1.5,
  },
  h6: {
    fontWeight: 600,
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: "0.9375rem",
    lineHeight: 1.6,
  },
  body2: {
    fontSize: "0.8125rem",
    lineHeight: 1.6,
  },
  button: {
    fontWeight: 600,
    textTransform: "none" as const,
    letterSpacing: "0.01em",
  },
  caption: {
    fontSize: "0.75rem",
    lineHeight: 1.5,
  },
  overline: {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
};
