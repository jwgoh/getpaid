import { BRANDING, CURRENCY, INVOICE, TIME } from "@app/shared/config/config";
import { calculateSubtotal } from "@app/shared/lib/calculations";
import type { InvoiceFormInput, InvoiceItemGroupInput } from "@app/shared/schemas";
import { asCents } from "@app/shared/types/money";

export function getDefaultDueDate(): string {
  return new Date(Date.now() + INVOICE.DEFAULT_DUE_DAYS * TIME.DAY).toISOString().split("T")[0];
}

export function getTemplateDueDate(dueDays: number): string {
  return new Date(Date.now() + dueDays * TIME.DAY).toISOString().split("T")[0];
}

export function getFormDefaults(
  dueDate: string,
  currency = BRANDING.DEFAULT_CURRENCY
): InvoiceFormInput {
  return {
    clientId: "",
    currency,
    dueDate,
    periodStart: "",
    periodEnd: "",
    items: [{ title: "", description: "", quantity: 1, unitPrice: 0 }],
    itemGroups: [],
    notes: "",
    message: "",
  };
}

export function computeSubtotal(items: InvoiceFormInput["items"], groups: InvoiceItemGroupInput[]) {
  const allItems = [...items, ...groups.flatMap((group) => group.items)];
  const itemsInCents = allItems.map((item) => ({
    quantity: item.quantity || 0,
    unitPrice: asCents(Math.round((item.unitPrice || 0) * CURRENCY.CENTS_MULTIPLIER)),
  }));

  return calculateSubtotal(itemsInCents) / CURRENCY.CENTS_MULTIPLIER;
}
