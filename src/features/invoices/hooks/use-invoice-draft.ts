"use client";

import * as React from "react";
import type { UseFormReset } from "react-hook-form";

import { STORAGE_KEYS } from "@app/shared/config/config";
import { useAutosave } from "@app/shared/hooks";
import { useToast } from "@app/shared/hooks/use-toast";
import { storage } from "@app/shared/lib/storage";
import type { InvoiceFormInput } from "@app/shared/schemas";

import type { InvoiceFormMode } from "../types";

const DRAFT_KEY = STORAGE_KEYS.INVOICE_DRAFT;

interface UseInvoiceDraftOptions {
  mode: InvoiceFormMode;
  formValues: InvoiceFormInput;
  isDirty: boolean;
  reset: UseFormReset<InvoiceFormInput>;
}

export function useInvoiceDraft({ mode, formValues, isDirty, reset }: UseInvoiceDraftOptions) {
  const toast = useToast();
  const [isDraftBannerVisible, setIsDraftBannerVisible] = React.useState(false);
  const isCreateMode = mode === "create";

  const { restoreDraft, clearDraft, lastSaved } = useAutosave({
    key: DRAFT_KEY,
    data: formValues,
    onRestore: (data) => {
      reset(data);
      toast.success("Draft restored");
    },
    enabled: isCreateMode && isDirty,
  });

  React.useEffect(() => {
    if (!isCreateMode) {
      return;
    }

    if (storage.get(DRAFT_KEY)) {
      setIsDraftBannerVisible(true);
    }
  }, [isCreateMode]);

  const handleRestoreDraft = React.useCallback(() => {
    restoreDraft();
    setIsDraftBannerVisible(false);
  }, [restoreDraft]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setIsDraftBannerVisible(false);
  }, [clearDraft]);

  return {
    isDraftBannerVisible,
    lastSaved,
    clearDraft,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
