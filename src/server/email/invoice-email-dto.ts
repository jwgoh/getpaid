import type { SenderProfile } from "@prisma/client";

import { BRANDING } from "@app/shared/config/config";
import { asCents } from "@app/shared/types/money";

import type { EmailBranding } from "./index";
import type { EmailItemGroup, EmailLineItem } from "./template";

interface InvoiceItemSource {
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceItemGroupSource {
  title: string;
  items: InvoiceItemSource[];
}

export function buildEmailBranding(profile: SenderProfile | null): EmailBranding {
  return {
    primaryColor: profile?.primaryColor || BRANDING.DEFAULT_PRIMARY_COLOR,
    logoUrl: profile?.logoUrl || null,
    fontFamily: profile?.fontFamily || null,
    footerText: profile?.footerText || null,
    companyAddress: profile?.address || null,
  };
}

export function mapInvoiceItem(item: InvoiceItemSource): EmailLineItem {
  return {
    title: item.title,
    description: item.description,
    quantity: item.quantity,
    unitPrice: asCents(item.unitPrice),
    amount: asCents(item.amount),
  };
}

export function mapInvoiceItemGroups(groups: InvoiceItemGroupSource[]): EmailItemGroup[] {
  return groups.map((group) => ({
    title: group.title,
    items: group.items.map(mapInvoiceItem),
  }));
}
