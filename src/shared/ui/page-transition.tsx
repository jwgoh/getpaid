"use client";

import * as React from "react";

import { Box, useTheme } from "@mui/material";

import { UI } from "@app/shared/config/config";
import { fadeSlideIn } from "@app/shared/ui/keyframes";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        animation: `${fadeSlideIn} ${UI.PAGE_TRANSITION_DURATION}ms ${theme.transitions.easing.easeOut} both`,
      }}
    >
      {children}
    </Box>
  );
}
