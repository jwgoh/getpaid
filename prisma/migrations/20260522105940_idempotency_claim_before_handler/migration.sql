-- AlterTable
ALTER TABLE "IdempotencyKey" ALTER COLUMN "responseStatus" DROP NOT NULL;
ALTER TABLE "IdempotencyKey" ALTER COLUMN "responseBody" DROP NOT NULL;
