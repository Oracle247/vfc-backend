-- 1. Weekday enum
CREATE TYPE "Weekday" AS ENUM (
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
);

-- 2. ServiceDay + ServiceDayService
CREATE TABLE "ServiceDay" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "weekday" "Weekday" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceDayService" (
  "id" TEXT NOT NULL,
  "serviceDayId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "serviceTime" TEXT NOT NULL,
  "preServiceTime" TEXT,
  "closesAt" TEXT,

  CONSTRAINT "ServiceDayService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceDayService_serviceDayId_order_key"
  ON "ServiceDayService"("serviceDayId", "order");
CREATE INDEX "ServiceDayService_serviceDayId_idx"
  ON "ServiceDayService"("serviceDayId");

ALTER TABLE "ServiceDayService"
  ADD CONSTRAINT "ServiceDayService_serviceDayId_fkey"
  FOREIGN KEY ("serviceDayId") REFERENCES "ServiceDay"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. SpecialProgram + SpecialProgramService
CREATE TABLE "SpecialProgram" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SpecialProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecialProgramService" (
  "id" TEXT NOT NULL,
  "specialProgramId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "serviceTime" TEXT NOT NULL,
  "preServiceTime" TEXT,
  "closesAt" TEXT,

  CONSTRAINT "SpecialProgramService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpecialProgramService_specialProgramId_order_key"
  ON "SpecialProgramService"("specialProgramId", "order");
CREATE INDEX "SpecialProgramService_specialProgramId_idx"
  ON "SpecialProgramService"("specialProgramId");

ALTER TABLE "SpecialProgramService"
  ADD CONSTRAINT "SpecialProgramService_specialProgramId_fkey"
  FOREIGN KEY ("specialProgramId") REFERENCES "SpecialProgram"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. AttendanceSession: nullable links to either ServiceDay or SpecialProgram
ALTER TABLE "AttendanceSession" ADD COLUMN "serviceDayId" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN "specialProgramId" TEXT;

CREATE INDEX "AttendanceSession_serviceDayId_idx"
  ON "AttendanceSession"("serviceDayId");
CREATE INDEX "AttendanceSession_specialProgramId_idx"
  ON "AttendanceSession"("specialProgramId");

ALTER TABLE "AttendanceSession"
  ADD CONSTRAINT "AttendanceSession_serviceDayId_fkey"
  FOREIGN KEY ("serviceDayId") REFERENCES "ServiceDay"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttendanceSession"
  ADD CONSTRAINT "AttendanceSession_specialProgramId_fkey"
  FOREIGN KEY ("specialProgramId") REFERENCES "SpecialProgram"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Legacy ServiceDay + backfill: every existing session gets parented to it
--    so the list grouping has somewhere to put them. Admins can re-assign or
--    delete the Legacy day later.
INSERT INTO "ServiceDay" ("id", "name", "weekday", "createdAt", "updatedAt")
VALUES (
  'legacy_service_day',
  'Legacy',
  'SUNDAY',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "AttendanceSession"
SET "serviceDayId" = 'legacy_service_day'
WHERE "serviceDayId" IS NULL AND "specialProgramId" IS NULL;
