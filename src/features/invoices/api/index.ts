import { fetchApi } from "@app/shared/api/base";
import { idempotencyHeader } from "@app/shared/api/idempotency-key";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@app/shared/schemas";
import {
  type Invoice,
  type InvoiceListItem,
  invoiceListSchema,
  invoiceSchema,
  type Payment,
  paymentListSchema,
  successAckSchema,
} from "@app/shared/schemas/api";
import type { RecordPaymentInput } from "@app/shared/schemas/payment";

export type { Payment, RecordPaymentInput };

export const invoicesApi = {
  list: () => fetchApi<InvoiceListItem[]>("/api/invoices", undefined, invoiceListSchema),

  get: (id: string) => fetchApi<Invoice>(`/api/invoices/${id}`, undefined, invoiceSchema),

  create: (data: CreateInvoiceInput, idempotencyKey: string) =>
    fetchApi<Invoice>(
      "/api/invoices",
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: idempotencyHeader(idempotencyKey),
      },
      invoiceSchema
    ),

  update: (id: string, data: UpdateInvoiceInput) =>
    fetchApi<Invoice>(
      `/api/invoices/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      invoiceSchema
    ),

  send: (id: string, idempotencyKey: string) =>
    fetchApi<Invoice>(
      `/api/invoices/${id}/send`,
      {
        method: "POST",
        headers: idempotencyHeader(idempotencyKey),
      },
      invoiceSchema
    ),

  markPaid: (id: string, idempotencyKey: string) =>
    fetchApi<Invoice>(
      `/api/invoices/${id}/mark-paid`,
      {
        method: "POST",
        headers: idempotencyHeader(idempotencyKey),
      },
      invoiceSchema
    ),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(
      `/api/invoices/${id}`,
      {
        method: "DELETE",
      },
      successAckSchema
    ),

  duplicate: (id: string, idempotencyKey: string) =>
    fetchApi<Invoice>(
      `/api/invoices/${id}/duplicate`,
      {
        method: "POST",
        headers: idempotencyHeader(idempotencyKey),
      },
      invoiceSchema
    ),

  getPayments: (invoiceId: string) =>
    fetchApi<Payment[]>(`/api/invoices/${invoiceId}/payments`, undefined, paymentListSchema),

  recordPayment: (invoiceId: string, data: RecordPaymentInput, idempotencyKey: string) =>
    fetchApi<Invoice>(
      `/api/invoices/${invoiceId}/payments`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: idempotencyHeader(idempotencyKey),
      },
      invoiceSchema
    ),

  deletePayment: (invoiceId: string, paymentId: string) =>
    fetchApi<Invoice>(
      `/api/invoices/${invoiceId}/payments?paymentId=${paymentId}`,
      {
        method: "DELETE",
      },
      invoiceSchema
    ),
};
