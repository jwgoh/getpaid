"use client";

import * as React from "react";

import { alpha, Box, Container, Paper, Stack, Typography, useTheme } from "@mui/material";

import { Logo } from "@app/shared/ui/logo";

type GradientCorner = "top-right" | "bottom-left" | "none";

interface AuthLayoutProps {
  children: React.ReactNode;
  gradientCorner?: GradientCorner;
  paperPadding?: number;
  beforePaper?: React.ReactNode;
}

const GRADIENT_POSITIONS: Record<Exclude<GradientCorner, "none">, React.CSSProperties> = {
  "top-right": { top: "-20%", right: "-10%" },
  "bottom-left": { bottom: "-20%", left: "-10%" },
};

const AUTH_GRADIENT_ALPHA = 0.06;
const AUTH_GRADIENT_FALLOFF_PERCENT = 70;

function GradientBackdrop({ corner }: { corner: Exclude<GradientCorner, "none"> }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "absolute",
        ...GRADIENT_POSITIONS[corner],
        width: "50%",
        height: "60%",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, AUTH_GRADIENT_ALPHA)} 0%, transparent ${AUTH_GRADIENT_FALLOFF_PERCENT}%)`,
        pointerEvents: "none",
      }}
    />
  );
}

export function AuthLayout({
  children,
  gradientCorner = "none",
  paperPadding = 5,
  beforePaper,
}: AuthLayoutProps) {
  const hasGradient = gradientCorner !== "none";

  return (
    <Stack
      direction="row"
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        ...(hasGradient ? { position: "relative", overflow: "hidden" } : {}),
      }}
    >
      {hasGradient ? <GradientBackdrop corner={gradientCorner} /> : null}

      <Container maxWidth="sm" sx={hasGradient ? { position: "relative", zIndex: 1 } : undefined}>
        <Stack direction="column" sx={{ alignItems: "center" }}>
          <Box sx={{ mb: 4 }}>
            <Logo size="large" />
          </Box>

          {beforePaper}

          <Paper sx={{ p: paperPadding, width: "100%", borderRadius: 3 }}>{children}</Paper>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
            &copy; {new Date().getFullYear()}{" "}
            <a
              href="https://getpaid.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit" }}
            >
              GetPaid
            </a>
          </Typography>
        </Stack>
      </Container>
    </Stack>
  );
}
