import { PaymentMethod, Prisma } from "@prisma/client";

import {
  INVOICE_EVENT,
  INVOICE_STATUS,
  type InvoiceStatusValue,
} from "@app/shared/config/invoice-status";
import { asPaymentId, type InvoiceId, type PaymentId, type UserId } from "@app/shared/types/ids";

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

export interface PaymentLogContext {
  idempotencyKey?: string;
}

interface PaymentLogPayload {
  event: string;
  invoiceId: InvoiceId;
  userId: UserId;
  amount?: number;
  paymentId?: PaymentId;
  idempotencyKey?: string;
  reason?: string;
}

function logPaymentEvent(level: "warn" | "error", payload: PaymentLogPayload): void {
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

async function writePaymentInTx(
  tx: Prisma.TransactionClient,
  id: InvoiceId,
  data: RecordPaymentInput
) {
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

  return { updatedInvoice, paymentId: payment.id };
}

export async function recordPayment(
  id: InvoiceId,
  userId: UserId,
  data: RecordPaymentInput,
  context: PaymentLogContext = {}
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!invoice) {
    logPaymentEvent("warn", {
      event: "payment.rejected.invoice_not_found",
      invoiceId: id,
      userId,
      amount: data.amount,
      idempotencyKey: context.idempotencyKey,
      reason: "invoice not found or not owned by caller",
    });

    return null;
  }

  if (invoice.status === INVOICE_STATUS.DRAFT) {
    logPaymentEvent("warn", {
      event: "payment.rejected.draft",
      invoiceId: id,
      userId,
      amount: data.amount,
      idempotencyKey: context.idempotencyKey,
      reason: "invoice is in DRAFT status",
    });

    return null;
  }

  try {
    const result = await prisma.$transaction((tx) => writePaymentInTx(tx, id, data));

    logPaymentEvent("warn", {
      event: "payment.recorded",
      invoiceId: id,
      userId,
      amount: data.amount,
      paymentId: asPaymentId(result.paymentId),
      idempotencyKey: context.idempotencyKey,
    });

    return result.updatedInvoice;
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      logPaymentEvent("error", {
        event: "payment.race.invoice_deleted",
        invoiceId: id,
        userId,
        amount: data.amount,
        idempotencyKey: context.idempotencyKey,
        reason: "invoice deleted concurrently during payment write",
      });

      return null;
    }

    if (isPaidAmountCheckViolation(error)) {
      logPaymentEvent("warn", {
        event: "payment.rejected.over_balance",
        invoiceId: id,
        userId,
        amount: data.amount,
        idempotencyKey: context.idempotencyKey,
        reason: "payment would exceed invoice total",
      });

      throw new PaymentExceedsBalanceError();
    }

    throw error;
  }
}

export async function getPayments(invoiceId: InvoiceId, userId: UserId) {
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

export async function deletePayment(
  invoiceId: InvoiceId,
  paymentId: PaymentId,
  userId: UserId,
  context: PaymentLogContext = {}
) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, invoice: { id: invoiceId, userId } },
    include: {
      invoice: true,
    },
  });

  if (!payment) {
    logPaymentEvent("warn", {
      event: "payment.delete.rejected.not_found",
      invoiceId,
      userId,
      paymentId,
      idempotencyKey: context.idempotencyKey,
      reason: "payment not found or not owned by caller",
    });

    return null;
  }

  try {
    const updatedInvoice = await prisma.$transaction(async (tx) => {
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

      const invoiceAfter = await tx.invoice.update({
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

      return invoiceAfter;
    });

    logPaymentEvent("warn", {
      event: "payment.deleted",
      invoiceId,
      userId,
      amount: payment.amount,
      paymentId,
      idempotencyKey: context.idempotencyKey,
    });

    return updatedInvoice;
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      logPaymentEvent("error", {
        event: "payment.delete.race.payment_deleted",
        invoiceId,
        userId,
        amount: payment.amount,
        paymentId,
        idempotencyKey: context.idempotencyKey,
        reason: "payment or invoice deleted concurrently during delete",
      });

      return null;
    }

    throw error;
  }
}
