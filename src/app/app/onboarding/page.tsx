"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  Alert,
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";

import { zodResolver } from "@hookform/resolvers/zod";

import { extractApiErrorMessage } from "@app/shared/api/error-message";
import { useToast } from "@app/shared/hooks/use-toast";
import { AuthLayout } from "@app/shared/layout/auth-layout";
import { SenderProfileFormInput, senderProfileFormSchema } from "@app/shared/schemas";
import { LoadingButton } from "@app/shared/ui/loading-button";

import { senderProfileApi } from "@app/features/settings";

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

const steps = ["Account Created", "Business Profile", "Ready to Invoice"];

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<SenderProfileFormInput>({
    resolver: zodResolver(senderProfileFormSchema),
    defaultValues: {
      defaultCurrency: "USD",
    },
  });

  const onSubmit = async (data: SenderProfileFormInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await senderProfileApi.create(data);

      toast.success("Profile saved successfully!");
      router.push("/app/invoices");
    } catch (err) {
      setError(extractApiErrorMessage(err, "An unexpected error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const currency = useWatch({ control, name: "defaultCurrency" });

  const stepperNode = (
    <Stepper activeStep={1} alternativeLabel sx={{ mb: 4, width: "100%" }}>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );

  return (
    <AuthLayout paperPadding={4} beforePaper={stepperNode}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Set Up Your Business Profile
        </Typography>

        <Typography variant="body2" color="text.secondary">
          This information will appear on your invoices
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          {...register("companyName")}
          label="Company Name"
          fullWidth
          margin="normal"
          error={!!errors.companyName}
          helperText={
            errors.companyName?.message ||
            "Enter your company name or leave blank if using personal name"
          }
        />

        <TextField
          {...register("displayName")}
          label="Display Name (Personal)"
          fullWidth
          margin="normal"
          error={!!errors.displayName}
          helperText={errors.displayName?.message || "Your personal name if not using a company"}
        />

        <TextField
          {...register("emailFrom")}
          label="Reply-to Email"
          type="email"
          fullWidth
          margin="normal"
          error={!!errors.emailFrom}
          helperText={errors.emailFrom?.message || "Email where clients can reply (optional)"}
        />

        <TextField
          {...register("address")}
          label="Business Address"
          fullWidth
          margin="normal"
          multiline
          rows={2}
          error={!!errors.address}
          helperText={errors.address?.message}
        />

        <TextField
          {...register("taxId")}
          label="Tax ID / VAT Number"
          fullWidth
          margin="normal"
          error={!!errors.taxId}
          helperText={errors.taxId?.message || "Optional"}
        />

        <FormControl fullWidth margin="normal" error={!!errors.defaultCurrency}>
          <InputLabel id="currency-label">Default Currency</InputLabel>

          <Select
            {...register("defaultCurrency")}
            labelId="currency-label"
            label="Default Currency"
            value={currency || "USD"}
          >
            {currencies.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>

          {errors.defaultCurrency && (
            <FormHelperText>{errors.defaultCurrency.message}</FormHelperText>
          )}
        </FormControl>

        <LoadingButton
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 4, py: 1.5 }}
          loading={isLoading}
        >
          Complete Setup
        </LoadingButton>
      </Box>
    </AuthLayout>
  );
}
