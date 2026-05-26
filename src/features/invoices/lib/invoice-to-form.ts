import type { Invoice } from "@app/shared/schemas";
import { toDollars } from "@app/shared/types/money";

import type { InvoiceInitialData } from "../types";

export function mapInvoiceToFormData(invoice: Invoice): InvoiceInitialData {
  return {
    clientId: invoice.client.id,
    currency: invoice.currency,
    dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
    items: invoice.items.map((item) => ({
      title: item.title,
      description: item.description ?? "",
      quantity: item.quantity,
      unitPrice: toDollars(item.unitPrice),
    })),
    itemGroups: invoice.itemGroups?.map((group) => ({
      title: group.title,
      sortOrder: group.sortOrder,
      items: group.items.map((item) => ({
        title: item.title,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: toDollars(item.unitPrice),
        sortOrder: item.sortOrder,
      })),
    })),
    notes: invoice.notes || "",
    message: invoice.message || "",
    periodStart: invoice.periodStart
      ? new Date(invoice.periodStart).toISOString().split("T")[0]
      : "",
    periodEnd: invoice.periodEnd ? new Date(invoice.periodEnd).toISOString().split("T")[0] : "",
  };
}
