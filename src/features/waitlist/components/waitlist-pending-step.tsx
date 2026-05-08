"use client";

import Link from "next/link";

import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { Box, Link as MuiLink, Typography } from "@mui/material";

interface WaitlistPendingStepProps {
  email: string;
}

export function WaitlistPendingStep({ email }: WaitlistPendingStepProps) {
  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <HourglassEmptyIcon sx={{ fontSize: 48, color: "warning.main", mb: 2 }} />

      <Typography variant="h5" fontWeight={700} gutterBottom>
        You&apos;re on the waitlist
      </Typography>

      <Typography variant="body2" color="text.secondary">
        We&apos;ll notify you at <strong>{email}</strong> when your account is ready.
      </Typography>

      <MuiLink
        component={Link}
        href="/auth/sign-in"
        sx={{ fontWeight: 600, display: "inline-block", mt: 3 }}
      >
        Back to sign in
      </MuiLink>
    </Box>
  );
}
