import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

import { ANIMATION, UI } from "@app/shared/config/config";

import { brand } from "./palettes";
import {
  DARK_APPBAR_BG,
  DARK_APPBAR_COLOR,
  DARK_APPBAR_SHADOW,
  DARK_BORDER,
  DARK_ELEVATION_1,
  DARK_ELEVATION_2,
  DARK_MENU_SHADOW,
  DARK_TABLE_HEAD_COLOR,
  LIGHT_APPBAR_BG,
  LIGHT_APPBAR_COLOR,
  LIGHT_APPBAR_SHADOW,
  LIGHT_BORDER,
  LIGHT_ELEVATION_1,
  LIGHT_ELEVATION_2,
  LIGHT_MENU_SHADOW,
  LIGHT_TABLE_HEAD_COLOR,
  TRANSITION_ALL,
} from "./style-tokens";

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
        transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
          transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
        transition: TRANSITION_ALL,
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
