import {
  Invoice,
  InvoiceEvent,
  InvoiceEventType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { PAYMENT_METHOD } from "@app/shared/config/payment-method";
import { asInvoiceId, type InvoiceId, type PublicId, type UserId } from "@app/shared/types/ids";

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
        await logInvoiceEvent(asInvoiceId(invoice.id), INVOICE_EVENT.VIEWED, {}, tx);
      }
    });
  }

  return prisma.invoice.findUnique({ where: { publicId } });
}

export async function markInvoicePaid(
  id: InvoiceId,
  userId: UserId,
  method: PaymentMethod = PAYMENT_METHOD.MANUAL
): Promise<InvoicePaidEntity | null> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id, userId, paidAt: null, paidAmount: 0 },
    });

    if (!invoice) {
      return null;
    }

    const paidAt = new Date();

    const claim = await tx.invoice.updateMany({
      where: { id, paidAt: null, paidAmount: 0 },
      data: {
        status: INVOICE_STATUS.PAID,
        paidAt,
        paymentMethod: method,
        paidAmount: invoice.total,
      },
    });

    if (claim.count !== 1) {
      return null;
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.total,
        method: PAYMENT_METHOD.MANUAL,
        paidAt,
      },
    });

    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        type: INVOICE_EVENT.PAYMENT_RECORDED,
        payload: {
          amount: invoice.total,
          method: PAYMENT_METHOD.MANUAL,
          paymentId: payment.id,
        },
      },
    });

    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        type: INVOICE_EVENT.PAID_MANUAL,
        payload: {},
      },
    });

    return tx.invoice.findUniqueOrThrow({
      where: { id },
      include: INVOICE_PAID_INCLUDE,
    });
  });
}

type InvoiceClient = Prisma.TransactionClient | typeof prisma;

export async function updateInvoiceStatus(
  id: InvoiceId,
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
  invoiceId: InvoiceId,
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
