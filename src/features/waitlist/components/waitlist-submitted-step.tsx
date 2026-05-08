"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Box, Typography } from "@mui/material";

interface WaitlistSubmittedStepProps {
  email: string;
}

export function WaitlistSubmittedStep({ email }: WaitlistSubmittedStepProps) {
  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "success.main", mb: 2 }} />

      <Typography variant="h5" fontWeight={700} gutterBottom>
        You&apos;re on the list!
      </Typography>

      <Typography variant="body2" color="text.secondary">
        We&apos;ll notify you at <strong>{email}</strong> when your account is ready.
      </Typography>
    </Box>
  );
}
