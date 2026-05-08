"use client";

import { useForm } from "react-hook-form";

import EmailIcon from "@mui/icons-material/Email";
import { Box, InputAdornment, TextField, Typography } from "@mui/material";

import { zodResolver } from "@hookform/resolvers/zod";

import { type WaitlistInput, waitlistSchema } from "@app/shared/schemas";
import { LoadingButton } from "@app/shared/ui/loading-button";

interface WaitlistEmailStepProps {
  isLoading: boolean;
  onSubmit: (data: WaitlistInput) => void;
}

export function WaitlistEmailStep({ isLoading, onSubmit }: WaitlistEmailStepProps) {
  const form = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
  });

  return (
    <Box>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Get started
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Enter your email to check your access or join the waitlist.
        </Typography>
      </Box>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <TextField
          {...form.register("email")}
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          error={!!form.formState.errors.email}
          helperText={form.formState.errors.email?.message}
          autoComplete="email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <LoadingButton
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2, py: 1.5 }}
          loading={isLoading}
        >
          Continue
        </LoadingButton>
      </Box>
    </Box>
  );
}
