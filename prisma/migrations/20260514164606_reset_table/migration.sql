/*
  Warnings:

  - The values [ISSUED] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `initiatedById` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Made the column `createdById` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'WORKER', 'ADMIN');

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('CREATED', 'APPROVED', 'PARTIALLY_PAID', 'PAID');
ALTER TABLE "vfcdb"."Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "vfcdb"."InvoiceStatus_old";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_createdById_fkey";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "initiatedById",
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'CREATED',
ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptUrl" TEXT,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
