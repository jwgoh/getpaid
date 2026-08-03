-- Dunning reminder bookkeeping on Invoice + an index for the aging scan.
ALTER TABLE "Invoice" ADD COLUMN "lastReminderStage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "lastReminderAt" TIMESTAMP(3);

CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
