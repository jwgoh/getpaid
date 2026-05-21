/*
  Warnings:

  - You are about to drop the `FollowUpJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FollowUpRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecurringInvoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecurringInvoiceItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecurringInvoiceItemGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FollowUpJob" DROP CONSTRAINT "FollowUpJob_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "FollowUpRule" DROP CONSTRAINT "FollowUpRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoiceItem" DROP CONSTRAINT "RecurringInvoiceItem_groupId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoiceItem" DROP CONSTRAINT "RecurringInvoiceItem_recurringInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoiceItemGroup" DROP CONSTRAINT "RecurringInvoiceItemGroup_recurringInvoiceId_fkey";

-- DropTable
DROP TABLE "FollowUpJob";

-- DropTable
DROP TABLE "FollowUpRule";

-- DropTable
DROP TABLE "RecurringInvoiceItem";

-- DropTable
DROP TABLE "RecurringInvoiceItemGroup";

-- DropTable
DROP TABLE "RecurringInvoice";

-- DropEnum
DROP TYPE "FollowUpJobStatus";

-- DropEnum
DROP TYPE "FollowUpMode";

-- DropEnum
DROP TYPE "RecurringFrequency";

-- DropEnum
DROP TYPE "RecurringStatus";
