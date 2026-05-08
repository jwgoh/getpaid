import { BRANDING } from "@app/shared/config/config";

import { markInvoiceViewed } from "./lifecycle";
import { getInvoiceByPublicId } from "./queries";

type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoiceByPublicId>>>;

export interface PublicInvoiceItemDTO {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PublicInvoiceItemGroupDTO {
  id: string;
  title: string;
  items: PublicInvoiceItemDTO[];
}

export interface PublicInvoiceSenderDTO {
  name: string;
  address: string;
  taxId: string;
}

export interface PublicInvoiceClientDTO {
  name: string;
  email: string;
}

export interface PublicInvoiceDTO {
  publicId: string;
  status: string;
  currency: string;
  subtotal: number;
  total: number;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  message: string | null;
  paymentReference: string | null;
  client: PublicInvoiceClientDTO;
  items: PublicInvoiceItemDTO[];
  itemGroups: PublicInvoiceItemGroupDTO[];
  sender: PublicInvoiceSenderDTO;
}

export interface PublicInvoiceBrandingDTO {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string | null;
}

function toItemDTO(item: InvoiceWithRelations["items"][number]): PublicInvoiceItemDTO {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
  };
}

function toSenderDTO(invoice: InvoiceWithRelations): PublicInvoiceSenderDTO {
  const profile = invoice.user.senderProfile;

  return {
    name: profile?.companyName || profile?.displayName || invoice.user.email,
    address: profile?.address || "",
    taxId: profile?.taxId || "",
  };
}

export function toPublicInvoiceDTO(invoice: InvoiceWithRelations): PublicInvoiceDTO {
  return {
    publicId: invoice.publicId,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    total: invoice.total,
    dueDate: invoice.dueDate.toISOString(),
    periodStart: invoice.periodStart?.toISOString() ?? null,
    periodEnd: invoice.periodEnd?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    message: invoice.message ?? null,
    paymentReference: invoice.paymentReference ?? null,
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
    },
    items: invoice.items.map(toItemDTO),
    itemGroups: invoice.itemGroups.map((group) => ({
      id: group.id,
      title: group.title,
      items: group.items.map(toItemDTO),
    })),
    sender: toSenderDTO(invoice),
  };
}

export function toPublicInvoiceBrandingDTO(
  invoice: InvoiceWithRelations
): PublicInvoiceBrandingDTO {
  const profile = invoice.user.senderProfile;

  return {
    logoUrl: profile?.logoUrl || null,
    primaryColor: profile?.primaryColor || BRANDING.DEFAULT_PRIMARY_COLOR,
    accentColor: profile?.accentColor || BRANDING.DEFAULT_ACCENT_COLOR,
    fontFamily: profile?.fontFamily || null,
  };
}

export interface TryMarkViewedResult {
  found: boolean;
}

export async function tryMarkViewed(
  publicId: string,
  viewerUserId: string | null
): Promise<TryMarkViewedResult> {
  const invoice = await getInvoiceByPublicId(publicId);

  if (!invoice) {
    return { found: false };
  }

  if (viewerUserId !== invoice.userId) {
    await markInvoiceViewed(publicId);
  }

  return { found: true };
}
