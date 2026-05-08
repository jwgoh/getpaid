"use client";

import * as React from "react";

import { Box, useTheme } from "@mui/material";

import { UI } from "@app/shared/config/config";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const theme = useTheme();
  const [isMounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Box
      sx={{
        opacity: isMounted ? 1 : 0,
        transform: isMounted ? "none" : `translateY(${UI.PAGE_TRANSITION_OFFSET}px)`,
        transition: theme.transitions.create(["opacity", "transform"], {
          duration: UI.PAGE_TRANSITION_DURATION,
          easing: theme.transitions.easing.easeOut,
        }),
      }}
    >
      {children}
    </Box>
  );
}
