"use client";

import { CircularProgress } from "@mui/material";

export function Spinner({ size = 24 }: { size?: number }) {
  return <CircularProgress size={size} thickness={4} />;
}
