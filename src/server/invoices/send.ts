import type { Prisma, SenderProfile } from "@prisma/client";
import { customAlphabet } from "nanoid";

import { INVOICE } from "@app/shared/config/config";
import { EMAIL_OUTBOX_KIND, EMAIL_OUTBOX_RELATED_TYPE } from "@app/shared/config/email-outbox";
import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";

import { prisma } from "@app/server/db";
import {
  buildInvoiceEmailPayload,
  type EmailBranding,
  type InvoiceEmailData,
  type ResendEmailPayload,
} from "@app/server/email";
import {
  buildEmailBranding,
  mapInvoiceItem,
  mapInvoiceItemGroups,
} from "@app/server/email/invoice-email-dto";
import {
  buildOutboxIdempotencyKey,
  createEmailOutbox,
  dispatchOutbox,
} from "@app/server/email/outbox";
import { getFollowUpRule, parseDelaysDays, scheduleFollowUps } from "@app/server/followups";
import { logInvoiceEvent, updateInvoiceStatus } from "@app/server/invoices";
import { ITEM_GROUPS_INCLUDE } from "@app/server/invoices/item-groups";

const generateReference = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  INVOICE.PAYMENT_REFERENCE_LENGTH
);

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceAlreadySentError extends Error {
  constructor() {
    super("Invoice has already been sent");
    this.name = "InvoiceAlreadySentError";
  }
}

function resolveSenderInfo(profile: SenderProfile | null, userEmail: string) {
  return {
    name: profile?.companyName || profile?.displayName || userEmail,
    email: profile?.emailFrom || userEmail,
    prefix: profile?.invoicePrefix || INVOICE.PAYMENT_REFERENCE_PREFIX,
  };
}

const INVOICE_FOR_SEND_INCLUDE = {
  client: true,
  items: { where: { groupId: null }, orderBy: { sortOrder: "asc" as const } },
  itemGroups: ITEM_GROUPS_INCLUDE,
  user: { include: { senderProfile: true } },
};

type InvoiceForSend = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_FOR_SEND_INCLUDE }>;

async function loadInvoiceForSend(invoiceId: string, userId: string): Promise<InvoiceForSend> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: INVOICE_FOR_SEND_INCLUDE,
  });

  if (!invoice) {
    throw new InvoiceNotFoundError();
  }

  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new InvoiceAlreadySentError();
  }

  return invoice;
}

interface BuildEmailContext {
  senderName: string;
  senderEmail: string;
  paymentReference: string;
  branding: EmailBranding;
}

function buildSendContext(invoice: InvoiceForSend): BuildEmailContext {
  const sender = resolveSenderInfo(invoice.user.senderProfile, invoice.user.email);

  return {
    senderName: sender.name,
    senderEmail: sender.email,
    paymentReference: `${sender.prefix}-${generateReference()}`,
    branding: buildEmailBranding(invoice.user.senderProfile),
  };
}

function buildInvoiceEmailData(invoice: InvoiceForSend, ctx: BuildEmailContext): InvoiceEmailData {
  return {
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    senderName: ctx.senderName,
    senderEmail: ctx.senderEmail,
    publicId: invoice.publicId,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    message: invoice.message,
    branding: ctx.branding,
    paymentReference: ctx.paymentReference,
    items: invoice.items.map(mapInvoiceItem),
    itemGroups: mapInvoiceItemGroups(invoice.itemGroups),
  };
}

interface CommitSendInvoiceInput {
  invoice: InvoiceForSend;
  userId: string;
  paymentReference: string;
  sentAt: Date;
  payload: ResendEmailPayload;
}

async function commitSendInvoice(input: CommitSendInvoiceInput): Promise<string> {
  const { invoice, userId, paymentReference, sentAt, payload } = input;
  const followUpRule = await getFollowUpRule(userId);

  return prisma.$transaction(async (tx) => {
    await updateInvoiceStatus(invoice.id, INVOICE_STATUS.SENT, { sentAt, paymentReference }, tx);

    await logInvoiceEvent(
      invoice.id,
      INVOICE_EVENT.SENT,
      { clientEmail: invoice.client.email },
      tx
    );

    if (followUpRule?.enabled) {
      await scheduleFollowUps(
        invoice.id,
        sentAt,
        invoice.dueDate,
        {
          mode: followUpRule.mode,
          delaysDays: parseDelaysDays(followUpRule.delaysDays),
        },
        tx
      );
    }

    const placeholderKey = `pending-${invoice.id}-${sentAt.getTime()}`;
    const row = await createEmailOutbox(tx, {
      userId,
      kind: EMAIL_OUTBOX_KIND.INVOICE,
      relatedType: EMAIL_OUTBOX_RELATED_TYPE.INVOICE,
      relatedId: invoice.id,
      payload,
      idempotencyKey: placeholderKey,
    });

    const stableKey = buildOutboxIdempotencyKey(EMAIL_OUTBOX_KIND.INVOICE, invoice.id, row.id);

    await tx.emailOutbox.update({
      where: { id: row.id },
      data: { idempotencyKey: stableKey },
    });

    return row.id;
  });
}

export async function sendInvoice(invoiceId: string, userId: string) {
  const invoice = await loadInvoiceForSend(invoiceId, userId);
  const ctx = buildSendContext(invoice);
  const sentAt = new Date();
  const emailData = buildInvoiceEmailData(invoice, ctx);
  const payload = buildInvoiceEmailPayload(emailData);

  const outboxId = await commitSendInvoice({
    invoice,
    userId,
    paymentReference: ctx.paymentReference,
    sentAt,
    payload,
  });

  await dispatchOutbox(outboxId);

  return prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      client: true,
      items: { where: { groupId: null }, orderBy: { sortOrder: "asc" } },
      itemGroups: ITEM_GROUPS_INCLUDE,
    },
  });
}
