import { PaymentMethod, Prisma } from "@prisma/client";

import {
  INVOICE_EVENT,
  INVOICE_STATUS,
  type InvoiceStatusValue,
} from "@app/shared/config/invoice-status";

import { prisma } from "@app/server/db";

const PG_CHECK_VIOLATION = "23514";
const INVOICE_PAID_AMOUNT_CHECK = "Invoice_paidAmount_lte_total_check";
const PRISMA_RECORD_NOT_FOUND = "P2025";

export class PaymentExceedsBalanceError extends Error {
  constructor() {
    super("Payment would cause paid amount to exceed invoice total");
    this.name = "PaymentExceedsBalanceError";
  }
}

function isPaidAmountCheckViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError) &&
    !(error instanceof Error)
  ) {
    return false;
  }

  const meta =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? ((error.meta ?? {}) as { code?: string; constraint?: string })
      : {};

  if (meta.constraint === INVOICE_PAID_AMOUNT_CHECK || meta.code === PG_CHECK_VIOLATION) {
    return true;
  }

  const message = error instanceof Error ? error.message : "";

  return (
    message.includes(INVOICE_PAID_AMOUNT_CHECK) ||
    (message.includes(PG_CHECK_VIOLATION) && message.includes("paidAmount"))
  );
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_RECORD_NOT_FOUND
  );
}

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  note?: string;
  paidAt?: Date;
}

export async function recordPayment(id: string, userId: string, data: RecordPaymentInput) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!invoice) {
    return null;
  }

  if (invoice.status === INVOICE_STATUS.DRAFT) {
    return null;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const incremented = await tx.invoice.update({
        where: { id },
        data: { paidAmount: { increment: data.amount } },
        select: { paidAmount: true, total: true },
      });

      const isFullyPaid = incremented.paidAmount >= incremented.total;

      const payment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: data.amount,
          method: data.method,
          note: data.note,
          paidAt: data.paidAt || new Date(),
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: isFullyPaid ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID,
          paidAt: isFullyPaid ? new Date() : null,
          paymentMethod: isFullyPaid ? data.method : null,
        },
        include: {
          client: true,
          items: true,
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
      });

      await tx.invoiceEvent.create({
        data: {
          invoiceId: id,
          type: INVOICE_EVENT.PAYMENT_RECORDED,
          payload: {
            amount: data.amount,
            method: data.method,
            note: data.note,
            paymentId: payment.id,
          },
        },
      });

      return updatedInvoice;
    });
  } catch (error) {
    if (isPaidAmountCheckViolation(error)) {
      throw new PaymentExceedsBalanceError();
    }

    throw error;
  }
}

export async function getPayments(invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
  });

  if (!invoice) {
    return null;
  }

  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: "desc" },
  });
}

export async function deletePayment(invoiceId: string, paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, invoice: { id: invoiceId, userId } },
    include: {
      invoice: true,
    },
  });

  if (!payment) {
    return null;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: { id: paymentId },
      });

      const decremented = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { paidAmount: { decrement: payment.amount } },
        select: { paidAmount: true, viewedAt: true },
      });

      let newStatus: InvoiceStatusValue;

      if (decremented.paidAmount > 0) {
        newStatus = INVOICE_STATUS.PARTIALLY_PAID;
      } else if (decremented.viewedAt) {
        newStatus = INVOICE_STATUS.VIEWED;
      } else {
        newStatus = INVOICE_STATUS.SENT;
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newStatus,
          paidAt: null,
          paymentMethod: null,
        },
        include: {
          client: true,
          items: true,
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
      });

      await tx.invoiceEvent.create({
        data: {
          invoiceId: payment.invoiceId,
          type: INVOICE_EVENT.PAYMENT_DELETED,
          payload: {
            paymentId,
            amount: payment.amount,
            method: payment.method,
            actorUserId: userId,
            previousStatus: payment.invoice.status,
            newStatus,
          },
        },
      });

      return updatedInvoice;
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}
