"use client";

import { Box, keyframes } from "@mui/material";

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

export function PulsingText({ width = 100 }: { width?: number | string }) {
  return (
    <Box
      sx={{
        width,
        height: 16,
        borderRadius: 1,
        bgcolor: "action.hover",
        animation: `${pulse} 2s ease-in-out infinite`,
      }}
    />
  );
}
