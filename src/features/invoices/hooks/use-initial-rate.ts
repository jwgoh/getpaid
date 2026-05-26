"use client";

import * as React from "react";

import type { InvoiceFormInput } from "@app/shared/schemas";
import { type Cents, toDollars } from "@app/shared/types/money";

import type { InvoiceFormMode } from "../types";

export function useInitialRate(
  mode: InvoiceFormMode,
  hasInitialData: boolean,
  hasTemplate: boolean,
  resolvedRate: Cents,
  items: InvoiceFormInput["items"],
  setValue: (name: `items.${number}.unitPrice`, value: number) => void
) {
  const applied = React.useRef(false);

  React.useEffect(() => {
    if (
      mode !== "create" ||
      hasInitialData ||
      hasTemplate ||
      applied.current ||
      resolvedRate <= 0
    ) {
      return;
    }

    const rateInDollars = toDollars(resolvedRate);

    items.forEach((item, index) => {
      if (item.unitPrice === 0) {
        setValue(`items.${index}.unitPrice`, rateInDollars);
      }
    });
    applied.current = true;
  }, [mode, hasInitialData, hasTemplate, resolvedRate, items, setValue]);
}
