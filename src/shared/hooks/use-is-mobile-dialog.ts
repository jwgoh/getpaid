"use client";

import { useMediaQuery, useTheme } from "@mui/material";

export function useIsMobileDialog(): boolean {
  const theme = useTheme();

  return useMediaQuery(theme.breakpoints.down("sm"));
}
