"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import { zodResolver } from "@hookform/resolvers/zod";

import { useIsMobileDialog } from "@app/shared/hooks/use-is-mobile-dialog";
import { ClientFormInput, clientFormSchema, type CreateClientInput } from "@app/shared/schemas";
import { fromDollars } from "@app/shared/types/money";
import { LoadingButton } from "@app/shared/ui/loading-button";

interface InlineClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientInput) => void;
  isPending: boolean;
  error?: string | null;
}

export function InlineClientDialog({
  open,
  onClose,
  onSubmit: onSubmitProp,
  isPending,
  error,
}: InlineClientDialogProps) {
  const isMobile = useIsMobileDialog();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientFormSchema),
  });

  const onSubmit = (data: ClientFormInput) => {
    onSubmitProp({
      name: data.name,
      email: data.email,
      defaultRate: data.defaultRate !== undefined ? fromDollars(data.defaultRate) : undefined,
    });
  };

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 600 }}>Add New Client</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            {...register("name")}
            label="Client Name"
            fullWidth
            margin="normal"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            {...register("email")}
            label="Client Email"
            type="email"
            fullWidth
            margin="normal"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <LoadingButton type="submit" variant="contained" loading={isPending}>
            Add Client
          </LoadingButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
