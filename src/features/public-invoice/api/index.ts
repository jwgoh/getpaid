import { fetchApi } from "@app/shared/api/base";
import { type PublicInvoice, publicInvoiceSchema, successAckSchema } from "@app/shared/schemas/api";

export const publicApi = {
  getInvoice: (publicId: string) =>
    fetchApi<PublicInvoice>(`/api/public/invoices/${publicId}`, undefined, publicInvoiceSchema),

  markViewed: (publicId: string) =>
    fetchApi<{ success: boolean }>(
      `/api/public/invoices/${publicId}/viewed`,
      {
        method: "POST",
      },
      successAckSchema
    ),
};
