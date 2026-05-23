"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  alpha,
  Box,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";

import { zodResolver } from "@hookform/resolvers/zod";

import { authApi } from "@app/shared/api/auth";
import { extractApiErrorMessage } from "@app/shared/api/error-message";
import { UI } from "@app/shared/config/config";
import { features } from "@app/shared/config/features";
import { useToast } from "@app/shared/hooks/use-toast";
import { AuthLayout } from "@app/shared/layout/auth-layout";
import { SignUpInput, signUpSchema } from "@app/shared/schemas";
import { LoadingButton } from "@app/shared/ui/loading-button";

import { WaitlistForm } from "@app/features/waitlist/components";

const SIGN_UP_FEATURES = [
  "Create professional invoices in minutes",
  "Track payments",
  "Record payments with multiple methods",
  "Manage all your clients in one place",
] as const;

export default function SignUpPage() {
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);

    try {
      await authApi.signUp(data);

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.success("Account created! Please sign in.");
        router.push("/auth/sign-in");

        return;
      }

      toast.success("Welcome to GetPaid!");
      router.push("/app");
      router.refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "An unexpected error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout gradientCorner="bottom-left">
      {features.publicRegistration ? (
        <>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Create your account
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Start managing invoices like a pro
            </Typography>
          </Box>

          <Box
            sx={{
              mb: 4,
              p: 2.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, UI.ALPHA_HOVER),
            }}
          >
            {SIGN_UP_FEATURES.map((feature) => (
              <Stack
                key={feature}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", py: 0.75 }}
              >
                <CheckCircleIcon sx={{ fontSize: UI.ICON_SIZE_SM, color: "primary.main" }} />

                <Typography variant="body2" color="text.secondary">
                  {feature}
                </Typography>
              </Stack>
            ))}
          </Box>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register("email")}
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
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

            <TextField
              {...register("password")}
              label="Password"
              type={isPasswordVisible ? "text" : "password"}
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message || "At least 8 characters"}
              autoComplete="new-password"
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
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
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

          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: 1,
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <MuiLink component={Link} href="/auth/sign-in" sx={{ fontWeight: 600 }}>
                Sign in
              </MuiLink>
            </Typography>
          </Box>
        </>
      ) : (
        <WaitlistForm />
      )}
    </AuthLayout>
  );
}
