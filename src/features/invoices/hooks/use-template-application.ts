"use client";

import * as React from "react";

import { useToast } from "@app/shared/hooks/use-toast";
import type { InvoiceFormInput } from "@app/shared/schemas";
import { toDollars } from "@app/shared/types/money";

import { getTemplateDueDate } from "../lib/invoice-calculations";
import type { InvoiceFormMode, TemplateData } from "../types";

export function useTemplateApplication(
  mode: InvoiceFormMode,
  template: TemplateData | undefined,
  isTemplateLoading: boolean,
  reset: (values: InvoiceFormInput) => void
) {
  const toast = useToast();
  const isAppliedRef = React.useRef(false);

  React.useEffect(() => {
    if (mode === "create" && template && !isAppliedRef.current && !isTemplateLoading) {
      reset({
        clientId: "",
        currency: template.currency,
        dueDate: getTemplateDueDate(template.dueDays),
        items: template.items.map((item) => ({
          title: item.title,
          description: item.description ?? "",
          quantity: item.quantity,
          unitPrice: toDollars(item.unitPrice),
        })),
        itemGroups: template.itemGroups.map((group) => ({
          title: group.title,
          items: group.items.map((item) => ({
            title: item.title,
            description: item.description ?? "",
            quantity: item.quantity,
            unitPrice: toDollars(item.unitPrice),
          })),
        })),
        notes: template.notes || "",
      });
      isAppliedRef.current = true;
      toast.success(`Template "${template.name}" applied`);
    }
  }, [mode, template, isTemplateLoading, reset, toast]);
}
