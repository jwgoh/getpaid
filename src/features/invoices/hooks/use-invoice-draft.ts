"use client";

import * as React from "react";
import type { UseFormReset } from "react-hook-form";

import { STORAGE_KEYS } from "@app/shared/config/config";
import { useAutosave, useHydrated } from "@app/shared/hooks";
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
  const isHydrated = useHydrated();
  const [isDraftDismissed, setIsDraftDismissed] = React.useState(false);
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

  const hasDraftInStorage = React.useMemo(
    () => isHydrated && Boolean(storage.get(DRAFT_KEY)),
    [isHydrated]
  );
  const isDraftBannerVisible = hasDraftInStorage && isCreateMode && !isDraftDismissed;

  const handleRestoreDraft = React.useCallback(() => {
    restoreDraft();
    setIsDraftDismissed(true);
  }, [restoreDraft]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setIsDraftDismissed(true);
  }, [clearDraft]);

  return {
    isDraftBannerVisible,
    lastSaved,
    clearDraft,
    handleRestoreDraft,
    handleDiscardDraft,
  };
}
