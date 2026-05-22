import {
  Invoice,
  InvoiceEvent,
  InvoiceEventType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import type { InvoiceId, PublicId, UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";

const INVOICE_PAID_INCLUDE = {
  client: true,
  items: true,
} as const satisfies Prisma.InvoiceInclude;

export type InvoicePaidEntity = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_PAID_INCLUDE }>;

export async function markInvoiceViewed(publicId: PublicId): Promise<Invoice | null> {
  const claim = await prisma.invoice.updateMany({
    where: { publicId, viewedAt: null },
    data: { viewedAt: new Date() },
  });

  if (claim.count === 1) {
    await prisma.$transaction(async (tx) => {
      await tx.invoice.updateMany({
        where: { publicId, status: INVOICE_STATUS.SENT },
        data: { status: INVOICE_STATUS.VIEWED },
      });

      const invoice = await tx.invoice.findUnique({ where: { publicId } });

      if (invoice) {
        await logInvoiceEvent(invoice.id, INVOICE_EVENT.VIEWED, {}, tx);
      }
    });
  }

  return prisma.invoice.findUnique({ where: { publicId } });
}

export async function markInvoicePaid(
  id: InvoiceId,
  userId: UserId,
  method: PaymentMethod = "MANUAL"
): Promise<InvoicePaidEntity | null> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id, userId, paidAt: null, paidAmount: 0 },
    });

    if (!invoice) {
      return null;
    }

    const updated = await tx.invoice.update({
      where: { id },
      data: {
        status: INVOICE_STATUS.PAID,
        paidAt: new Date(),
        paymentMethod: method,
        paidAmount: invoice.total,
      },
      include: INVOICE_PAID_INCLUDE,
    });

    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        type: INVOICE_EVENT.PAID_MANUAL,
        payload: {},
      },
    });

    return updated;
  });
}

type InvoiceClient = Prisma.TransactionClient | typeof prisma;

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  additionalData: Record<string, unknown> = {},
  client: InvoiceClient = prisma
): Promise<Invoice> {
  return client.invoice.update({
    where: { id },
    data: {
      status,
      ...additionalData,
    },
  });
}

export async function logInvoiceEvent(
  invoiceId: string,
  type: InvoiceEventType,
  payload: Prisma.InputJsonValue = {},
  client: InvoiceClient = prisma
): Promise<InvoiceEvent> {
  return client.invoiceEvent.create({
    data: {
      invoiceId,
      type,
      payload,
    },
  });
}
