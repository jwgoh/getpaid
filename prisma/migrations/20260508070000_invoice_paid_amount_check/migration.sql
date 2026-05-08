-- AlterEnum
ALTER TYPE "InvoiceEventType" ADD VALUE 'PAYMENT_DELETED';

-- AddCheckConstraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paidAmount_lte_total_check" CHECK ("paidAmount" <= "total");
