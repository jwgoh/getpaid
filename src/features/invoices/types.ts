import type { CreateClientInput, InvoiceFormInput } from "@app/shared/schemas";
import type { Cents } from "@app/shared/types/money";

export type { FormMode as InvoiceFormMode } from "@app/shared/config/config";

export interface TemplateData {
  name: string;
  currency: string;
  dueDays: number;
  notes: string | null;
  items: { title: string; description: string | null; quantity: number; unitPrice: Cents }[];
  itemGroups: {
    title: string;
    items: { title: string; description: string | null; quantity: number; unitPrice: Cents }[];
  }[];
}

export interface CreateClientMutation {
  mutate: (
    data: CreateClientInput,
    options: {
      onSuccess: () => void;
      onError: (err: Error) => void;
    }
  ) => void;
  isPending: boolean;
}

export interface InvoiceInitialData {
  clientId: string;
  currency: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  items: { title: string; description: string; quantity: number; unitPrice: number }[];
  itemGroups?: NonNullable<InvoiceFormInput["itemGroups"]>;
  notes: string;
  message?: string;
}
