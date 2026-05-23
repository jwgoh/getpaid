"use client";

import { Box, keyframes, Stack } from "@mui/material";

const bounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`;

export function DotsLoader() {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
            animation: `${bounce} 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </Stack>
  );
}
