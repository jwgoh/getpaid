import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

import { ANIMATION, UI } from "@app/shared/config/config";

import { brand } from "./palettes";

const transitionAll = `all ${ANIMATION.FAST}ms ease`;

const LIGHT_BORDER = "1px solid rgba(107,114,128,0.12)";
const DARK_BORDER = "1px solid rgba(156,163,175,0.16)";

const LIGHT_ELEVATION_1 = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)";
const DARK_ELEVATION_1 = "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)";

const LIGHT_ELEVATION_2 = "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)";
const DARK_ELEVATION_2 = "0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)";

const LIGHT_APPBAR_SHADOW = "0 1px 3px rgba(0,0,0,0.05)";
const DARK_APPBAR_SHADOW = "0 1px 3px rgba(0,0,0,0.2)";

const LIGHT_MENU_SHADOW = "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)";
const DARK_MENU_SHADOW = "0 4px 16px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)";

const LIGHT_APPBAR_BG = "#ffffff";
const LIGHT_APPBAR_COLOR = "#1f2937";
const DARK_APPBAR_BG = "#1a1f25";
const DARK_APPBAR_COLOR = "#f3f4f6";

const LIGHT_TABLE_HEAD_COLOR = "#5b6270";
const DARK_TABLE_HEAD_COLOR = "#9ca3af";

export const sharedComponents = {
  MuiCssBaseline: {
    styleOverrides: {
      "*, *::before, *::after": {
        "&:focus-visible": {
          outline: `2px solid ${brand.primary}`,
          outlineOffset: "2px",
        },
      },
      "body:not(.user-is-tabbing) *:focus": {
        outline: "none",
      },
    },
  },
  MuiButtonBase: {
    styleOverrides: {
      root: {
        transition: transitionAll,
        "&:active": {
          transform: `scale(${ANIMATION.BUTTON_PRESS_SCALE})`,
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_SM,
        padding: "10px 20px",
        fontSize: "0.9375rem",
        boxShadow: "none",
        transition: transitionAll,
        "&:hover": {
          boxShadow: "none",
        },
        "&:active": {
          transform: `scale(${ANIMATION.BUTTON_PRESS_SCALE})`,
        },
        "&:focus-visible": {
          outline: `2px solid ${brand.primary}`,
          outlineOffset: "2px",
        },
      },
      sizeLarge: {
        padding: "12px 28px",
        fontSize: "1rem",
      },
      sizeSmall: {
        padding: "6px 14px",
        fontSize: "0.8125rem",
      },
      contained: {
        "&:hover": {
          boxShadow: `0 4px 14px ${alpha(brand.primary, 0.35)}`,
        },
      },
      outlined: {
        borderWidth: 1.5,
        "&:hover": {
          borderWidth: 1.5,
        },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: transitionAll,
        "@media (pointer: coarse)": {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: UI.BORDER_RADIUS_LG,
        ...theme.applyStyles("dark", {
          backgroundImage: "none",
        }),
      }),
      elevation1: ({ theme }: { theme: Theme }) => ({
        boxShadow: LIGHT_ELEVATION_1,
        border: LIGHT_BORDER,
        ...theme.applyStyles("dark", {
          boxShadow: DARK_ELEVATION_1,
          border: DARK_BORDER,
        }),
      }),
      elevation2: ({ theme }: { theme: Theme }) => ({
        boxShadow: LIGHT_ELEVATION_2,
        ...theme.applyStyles("dark", {
          boxShadow: DARK_ELEVATION_2,
        }),
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: UI.BORDER_RADIUS_LG,
        border: LIGHT_BORDER,
        boxShadow: LIGHT_ELEVATION_1,
        ...theme.applyStyles("dark", {
          border: DARK_BORDER,
          boxShadow: DARK_ELEVATION_1,
        }),
      }),
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        "& .MuiOutlinedInput-root": {
          borderRadius: UI.BORDER_RADIUS_SM,
          transition: transitionAll,
          "&.Mui-focused": {
            boxShadow: `0 0 0 ${UI.FOCUS_RING_WIDTH}px ${alpha(brand.primary, UI.ALPHA_FOCUS_RING)}`,
          },
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_SM,
        transition: transitionAll,
        "&.Mui-focused": {
          boxShadow: `0 0 0 ${UI.FOCUS_RING_WIDTH}px ${alpha(brand.primary, UI.ALPHA_FOCUS_RING)}`,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_SM,
        fontWeight: 500,
        transition: transitionAll,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      head: ({ theme }: { theme: Theme }) => ({
        fontWeight: 600,
        fontSize: "0.8125rem",
        color: LIGHT_TABLE_HEAD_COLOR,
        ...theme.applyStyles("dark", {
          color: DARK_TABLE_HEAD_COLOR,
        }),
      }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: UI.BORDER_RADIUS_XL,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_SM,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: LIGHT_APPBAR_BG,
        color: LIGHT_APPBAR_COLOR,
        boxShadow: LIGHT_APPBAR_SHADOW,
        ...theme.applyStyles("dark", {
          backgroundColor: DARK_APPBAR_BG,
          color: DARK_APPBAR_COLOR,
          boxShadow: DARK_APPBAR_SHADOW,
        }),
      }),
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: UI.BORDER_RADIUS_MD,
        boxShadow: LIGHT_MENU_SHADOW,
        ...theme.applyStyles("dark", {
          boxShadow: DARK_MENU_SHADOW,
        }),
      }),
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: UI.BORDER_RADIUS_SM,
      },
    },
  },
  MuiLink: {
    styleOverrides: {
      root: {
        transition: transitionAll,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 999,
      },
      bar: {
        borderRadius: 999,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        transition: transitionAll,
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: `background-color ${ANIMATION.FAST}ms ease`,
      },
    },
  },
};

export const lightOnlyComponents = {
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_LG,
      },
      elevation1: {
        boxShadow: LIGHT_ELEVATION_1,
        border: LIGHT_BORDER,
      },
      elevation2: {
        boxShadow: LIGHT_ELEVATION_2,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: UI.BORDER_RADIUS_LG,
        border: LIGHT_BORDER,
        boxShadow: LIGHT_ELEVATION_1,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      head: {
        fontWeight: 600,
        fontSize: "0.8125rem",
        color: LIGHT_TABLE_HEAD_COLOR,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: LIGHT_APPBAR_BG,
        color: LIGHT_APPBAR_COLOR,
        boxShadow: LIGHT_APPBAR_SHADOW,
      },
    },
  },
};
