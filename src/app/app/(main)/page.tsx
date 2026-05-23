"use client";

import { INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { AppLayout } from "@app/shared/layout/app-layout";

import { useClients } from "@app/features/clients";
import { DashboardContent } from "@app/features/dashboard/components";
import { useInvoices } from "@app/features/invoices";
import { useSenderProfile } from "@app/features/settings";

export default function DashboardPage() {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices();
  const { data: profile, isLoading: isProfileLoading } = useSenderProfile();

  return (
    <AppLayout>
      <DashboardContent
        clientCount={clients?.length ?? 0}
        invoiceCount={invoices?.length ?? 0}
        hasSentInvoice={invoices?.some((inv) => inv.status !== INVOICE_STATUS.DRAFT) ?? false}
        hasProfile={Boolean(profile?.companyName || profile?.displayName)}
        isExternalDataLoading={isClientsLoading || isInvoicesLoading || isProfileLoading}
      />
    </AppLayout>
  );
}
