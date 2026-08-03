import { TIME } from "@app/shared/config/config";
import { DUNNING_POLICY } from "@app/shared/config/dunning";
import { EMAIL_OUTBOX_KIND, EMAIL_OUTBOX_RELATED_TYPE } from "@app/shared/config/email-outbox";
import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { asInvoiceId, asUserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { createStableOutbox } from "@app/server/email/outbox";
import { logInvoiceEvent } from "@app/server/invoices/lifecycle";

import {
  buildReminderPayload,
  INVOICE_FOR_REMINDER_INCLUDE,
  type InvoiceForReminder,
} from "./dunning-email";

export interface RunDunningResult {
  scanned: number;
  transitioned: number;
  remindersQueued: number;
}

// Highest reminder stage (1-based) whose offset has elapsed, or 0 if none is
// newly due (i.e. we've already sent it).
export function dueReminderStage(dueAt: Date, now: Date, lastStage: number): number {
  const daysOverdue = Math.floor((now.getTime() - dueAt.getTime()) / TIME.DAY);

  let stage = 0;
  for (let i = 0; i < DUNNING_POLICY.reminderOffsetDays.length; i++) {
    if (daysOverdue >= DUNNING_POLICY.reminderOffsetDays[i]) {
      stage = i + 1;
    }
  }

  if (stage <= lastStage) {
    return 0;
  }

  return stage;
}

interface ProcessResult {
  transitioned: boolean;
  remindersQueued: number;
}

async function processInvoiceDunning(
  invoice: InvoiceForReminder,
  now: Date
): Promise<ProcessResult> {
  return prisma.$transaction(async (tx) => {
    const invoiceId = asInvoiceId(invoice.id);
    let transitioned = false;

    if (invoice.status !== INVOICE_STATUS.OVERDUE) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: INVOICE_STATUS.OVERDUE },
      });
      await logInvoiceEvent(
        invoiceId,
        INVOICE_EVENT.STATUS_CHANGED,
        { from: invoice.status, to: INVOICE_STATUS.OVERDUE },
        tx
      );
      transitioned = true;
    }

    const stage = dueReminderStage(invoice.dueDate, now, invoice.lastReminderStage);

    if (stage === 0 || stage > DUNNING_POLICY.maxReminders + 1) {
      return { transitioned, remindersQueued: 0 };
    }

    const payload = buildReminderPayload(invoice, stage);

    await createStableOutbox(tx, {
      userId: asUserId(invoice.userId),
      kind: EMAIL_OUTBOX_KIND.REMINDER,
      relatedType: EMAIL_OUTBOX_RELATED_TYPE.INVOICE,
      relatedId: invoice.id,
      payload,
    });

    await logInvoiceEvent(invoiceId, INVOICE_EVENT.REMINDER_SENT, { stage }, tx);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { lastReminderStage: stage, lastReminderAt: now },
    });

    return { transitioned, remindersQueued: 1 };
  });
}

export async function runDunning(now: Date = new Date()): Promise<RunDunningResult> {
  const candidates = await prisma.invoice.findMany({
    where: {
      status: INVOICE_STATUS.SENT,
      dueDate: { lte: now },
    },
    include: INVOICE_FOR_REMINDER_INCLUDE,
  });

  const result: RunDunningResult = {
    scanned: candidates.length,
    transitioned: 0,
    remindersQueued: 0,
  };

  for (const invoice of candidates) {
    const outcome = await processInvoiceDunning(invoice, now);

    if (outcome.transitioned) {
      result.transitioned += 1;
    }

    result.remindersQueued += outcome.remindersQueued;
  }

  return result;
}
