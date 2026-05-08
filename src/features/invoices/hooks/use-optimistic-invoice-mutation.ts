"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@app/shared/config/query";
import type { Invoice, InvoiceListItem } from "@app/shared/schemas/api";

interface OptimisticInvoiceMutationOptions {
  mutationFn: (id: string) => Promise<unknown>;
  buildPatch: () => Partial<InvoiceListItem & Invoice>;
}

export function useOptimisticInvoiceMutation({
  mutationFn,
  buildPatch,
}: OptimisticInvoiceMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices });
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) });

      const previousInvoices = queryClient.getQueryData<InvoiceListItem[]>(queryKeys.invoices);
      const previousInvoice = queryClient.getQueryData<Invoice>(queryKeys.invoice(id));
      const patch = buildPatch();

      queryClient.setQueryData<InvoiceListItem[]>(queryKeys.invoices, (old) =>
        old?.map((invoice) => (invoice.id === id ? { ...invoice, ...patch } : invoice))
      );

      queryClient.setQueryData<Invoice>(queryKeys.invoice(id), (old) =>
        old ? { ...old, ...patch } : old
      );

      return { previousInvoices, previousInvoice };
    },
    onError: (_, id, context) => {
      if (context?.previousInvoices) {
        queryClient.setQueryData(queryKeys.invoices, context.previousInvoices);
      }

      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice);
      }
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
  });
}
