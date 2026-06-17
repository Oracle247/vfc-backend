-- 1. Enums
CREATE TYPE "IncomeCategory" AS ENUM ('TITHE', 'OFFERING', 'SPECIAL_DONATION');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- 2. SessionIncome table
CREATE TABLE "SessionIncome" (
  "id" TEXT NOT NULL,
  "sessionServiceId" TEXT NOT NULL,
  "category" "IncomeCategory" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "recordedById" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SessionIncome_pkey" PRIMARY KEY ("id")
);

-- Unique (sessionServiceId, category, method) so the upsert path can replace
-- by composite key without juggling individual ids.
CREATE UNIQUE INDEX "SessionIncome_sessionServiceId_category_method_key"
  ON "SessionIncome"("sessionServiceId", "category", "method");
CREATE INDEX "SessionIncome_sessionServiceId_idx"
  ON "SessionIncome"("sessionServiceId");

ALTER TABLE "SessionIncome"
  ADD CONSTRAINT "SessionIncome_sessionServiceId_fkey"
  FOREIGN KEY ("sessionServiceId") REFERENCES "SessionService"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionIncome"
  ADD CONSTRAINT "SessionIncome_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
