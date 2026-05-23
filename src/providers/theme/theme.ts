import { createTheme } from "@mui/material/styles";

import { UI } from "@app/shared/config/config";

import { lightOnlyComponents, sharedComponents } from "./components";
import { darkPalette, lightPalette } from "./palettes";
import { typography } from "./typography";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
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
