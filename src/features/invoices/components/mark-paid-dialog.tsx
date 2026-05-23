"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { useIsMobileDialog } from "@app/shared/hooks/use-is-mobile-dialog";
import { LoadingButton } from "@app/shared/ui/loading-button";

interface MarkPaidDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function MarkPaidDialog({ open, onClose, onConfirm, isLoading }: MarkPaidDialogProps) {
  const isMobile = useIsMobileDialog();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 600 }}>Mark as Paid</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will mark the invoice as fully paid. Use this if you received the full payment
          amount.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <LoadingButton
          variant="contained"
          onClick={onConfirm}
          loading={isLoading}
          startIcon={<CheckCircleIcon />}
        >
          Mark as Paid
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
