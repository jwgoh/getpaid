import {
  EMAIL_OUTBOX_KIND,
  EMAIL_OUTBOX_RELATED_TYPE,
  FOLLOWUP_RETRY,
  computeBackoffMs,
} from "../src/shared/config/email-outbox";

import { prisma } from "../src/server/db";
import { buildReminderEmailPayload } from "../src/server/email";
import {
  buildEmailBranding,
  mapInvoiceItem,
  mapInvoiceItemGroups,
} from "../src/server/email/invoice-email-dto";
import {
  buildOutboxIdempotencyKey,
  createEmailOutbox,
  dispatchOutbox,
} from "../src/server/email/outbox";
import {
  getPendingFollowUpJobs,
  markFollowUpJobFailed,
  markFollowUpJobSent,
  recordFollowUpAttempt,
} from "../src/server/followups";
import { logInvoiceEvent } from "../src/server/invoices";

type PendingJob = Awaited<ReturnType<typeof getPendingFollowUpJobs>>[number];

async function processJob(job: PendingJob): Promise<void> {
  const { invoice } = job;

  if (invoice.status === "PAID" || invoice.paidAt) {
    console.log(`Skipping job ${job.id}: invoice ${invoice.id} is already paid`);
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: "CANCELED" },
    });

    return;
  }

  const senderProfile = invoice.user.senderProfile;
  const senderName =
    senderProfile?.companyName || senderProfile?.displayName || invoice.user.email;
  const senderEmail = senderProfile?.emailFrom || invoice.user.email;
  const isOverdue = invoice.dueDate < new Date();
  const branding = buildEmailBranding(senderProfile);

  const payload = buildReminderEmailPayload({
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    senderName,
    senderEmail,
    publicId: invoice.publicId,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    message: invoice.message,
    isOverdue,
    branding,
    paymentReference: invoice.paymentReference || null,
    items: invoice.items.map(mapInvoiceItem),
    itemGroups: mapInvoiceItemGroups(invoice.itemGroups),
  });

  console.log(`Processing job ${job.id} for invoice ${invoice.publicId}...`);

  const outboxRowId = await prisma.$transaction(async (tx) => {
    const placeholderKey = `pending-${job.id}-${Date.now()}`;
    const row = await createEmailOutbox(tx, {
      userId: invoice.userId,
      kind: EMAIL_OUTBOX_KIND.REMINDER,
      relatedType: EMAIL_OUTBOX_RELATED_TYPE.FOLLOW_UP_JOB,
      relatedId: job.id,
      payload,
      idempotencyKey: placeholderKey,
    });

    const stableKey = buildOutboxIdempotencyKey(EMAIL_OUTBOX_KIND.REMINDER, job.id, row.id);

    await tx.emailOutbox.update({
      where: { id: row.id },
      data: { idempotencyKey: stableKey },
    });

    return row.id;
  });

  await recordFollowUpAttempt(job.id);

  const dispatched = await dispatchOutbox(outboxRowId);

  if (dispatched?.status === "SENT") {
    await markFollowUpJobSent(job.id);
    await logInvoiceEvent(invoice.id, "REMINDER_SENT", {
      jobId: job.id,
      isOverdue,
      messageId: dispatched.messageId,
    });
    console.log(`Successfully sent reminder for invoice ${invoice.publicId}`);

    return;
  }

  const errorMessage = dispatched?.lastError ?? "Unknown send failure";
  const updatedAttempts = job.attempts + 1;
  const isExhausted = updatedAttempts >= FOLLOWUP_RETRY.MAX_ATTEMPTS;
  const nextAttemptAt = isExhausted
    ? null
    : new Date(Date.now() + computeBackoffMs(updatedAttempts, FOLLOWUP_RETRY.BASE_BACKOFF_MS));

  await markFollowUpJobFailed(job.id, errorMessage, nextAttemptAt);
  console.error(
    `Failed to send reminder for job ${job.id} (attempt ${updatedAttempts}/${FOLLOWUP_RETRY.MAX_ATTEMPTS}): ${errorMessage}`
  );
}

async function main() {
  console.log("Starting follow-up job runner...");
  console.log(`Current time: ${new Date().toISOString()}`);

  const pendingJobs = await getPendingFollowUpJobs();
  console.log(`Found ${pendingJobs.length} pending follow-up job(s)`);

  for (const job of pendingJobs) {
    try {
      await processJob(job);
    } catch (error) {
      console.error(`Unexpected error processing job ${job.id}:`, error);
    }
  }

  console.log("Follow-up job runner completed.");
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
