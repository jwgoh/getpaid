import { UI } from "@app/shared/config/config";

import {
  LIGHT_APPBAR_BG,
  LIGHT_APPBAR_COLOR,
  LIGHT_APPBAR_SHADOW,
  LIGHT_BORDER,
  LIGHT_ELEVATION_1,
  LIGHT_ELEVATION_2,
  LIGHT_TABLE_HEAD_COLOR,
} from "./style-tokens";

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
