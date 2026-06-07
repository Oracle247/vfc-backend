-- 1. Create SessionService
CREATE TABLE "SessionService" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "serviceTime" TIMESTAMP(3) NOT NULL,
  "preServiceTime" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),

  CONSTRAINT "SessionService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionService_sessionId_order_key" ON "SessionService"("sessionId", "order");
CREATE INDEX "SessionService_sessionId_idx" ON "SessionService"("sessionId");

ALTER TABLE "SessionService"
  ADD CONSTRAINT "SessionService_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill: every existing session becomes a single-service session (order = 1).
--    Uses md5(random) for a text id; cuid is only a Prisma-side default.
INSERT INTO "SessionService" ("id", "sessionId", "order", "serviceTime", "preServiceTime")
SELECT
  md5(random()::text || clock_timestamp()::text) AS "id",
  "id" AS "sessionId",
  1 AS "order",
  "serviceTime",
  "preServiceTime"
FROM "AttendanceSession";

-- 3. Drop the now-redundant columns on AttendanceSession
ALTER TABLE "AttendanceSession" DROP COLUMN "serviceTime";
ALTER TABLE "AttendanceSession" DROP COLUMN "preServiceTime";

-- 4. Add serviceOrder to Attendance (existing rows default to service 1)
ALTER TABLE "Attendance" ADD COLUMN "serviceOrder" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "Attendance_sessionId_serviceOrder_idx" ON "Attendance"("sessionId", "serviceOrder");
