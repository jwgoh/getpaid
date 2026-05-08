"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, IconButton, InputAdornment, TextField, Typography } from "@mui/material";

import { zodResolver } from "@hookform/resolvers/zod";

import { type SignUpInput, signUpSchema } from "@app/shared/schemas";
import { LoadingButton } from "@app/shared/ui/loading-button";

interface WaitlistRegisterStepProps {
  email: string;
  isLoading: boolean;
  onSubmit: (data: SignUpInput) => void;
}

export function WaitlistRegisterStep({ email, isLoading, onSubmit }: WaitlistRegisterStepProps) {
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email },
  });

  return (
    <Box>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Create your account
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Your email has been approved. Set a password to get started.
        </Typography>
      </Box>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <TextField
          {...form.register("email")}
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          disabled
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

        <TextField
          {...form.register("password")}
          label="Password"
          type={isPasswordVisible ? "text" : "password"}
          fullWidth
          margin="normal"
          error={!!form.formState.errors.password}
          helperText={form.formState.errors.password?.message || "At least 8 characters"}
          autoComplete="new-password"
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {isPasswordVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
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
          sx={{ mt: 3, py: 1.5 }}
          loading={isLoading}
        >
          Create Account
        </LoadingButton>
      </Box>
    </Box>
  );
}
