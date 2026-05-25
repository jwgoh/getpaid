import { createTheme } from "@mui/material/styles";

import { UI } from "@app/shared/config/config";
import { COLOR_SCHEME_ATTRIBUTE } from "@app/shared/lib/color-scheme-init-script";

import { sharedComponents } from "./components";
import { lightOnlyComponents } from "./components-light-only";
import { darkPalette, lightPalette } from "./palettes";
import { typography } from "./typography";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE,
  },
  colorSchemes: {
    light: {
      palette: lightPalette,
    },
    dark: {
      palette: darkPalette,
    },
  },
  typography,
  shape: {
    borderRadius: UI.BORDER_RADIUS_SM,
  },
  components: sharedComponents,
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    ...lightPalette,
  },
  typography,
  shape: {
    borderRadius: UI.BORDER_RADIUS_SM,
  },
  components: {
    ...sharedComponents,
    ...lightOnlyComponents,
  },
});
