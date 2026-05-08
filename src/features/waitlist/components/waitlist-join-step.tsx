"use client";

import { Box, Link as MuiLink, Typography } from "@mui/material";

import { LoadingButton } from "@app/shared/ui/loading-button";

interface WaitlistJoinStepProps {
  email: string;
  isLoading: boolean;
  onJoin: () => void;
  onUseDifferentEmail: () => void;
}

export function WaitlistJoinStep({
  email,
  isLoading,
  onJoin,
  onUseDifferentEmail,
}: WaitlistJoinStepProps) {
  return (
    <Box>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Join the waitlist
        </Typography>

        <Typography variant="body2" color="text.secondary">
          We&apos;re not open for public registration yet. We&apos;ll notify you at{" "}
          <strong>{email}</strong> when it&apos;s your turn.
        </Typography>
      </Box>

      <LoadingButton
        variant="contained"
        fullWidth
        size="large"
        sx={{ py: 1.5 }}
        loading={isLoading}
        onClick={onJoin}
      >
        Join Waitlist
      </LoadingButton>

      <Box sx={{ textAlign: "center", mt: 2 }}>
        <MuiLink
          component="button"
          type="button"
          onClick={onUseDifferentEmail}
          sx={{ fontWeight: 600, fontSize: "0.875rem" }}
        >
          Use a different email
        </MuiLink>
      </Box>
    </Box>
  );
}
