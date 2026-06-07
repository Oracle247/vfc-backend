-- AlterTable: add serviceTime (nullable first so existing rows can be backfilled), preServiceTime
ALTER TABLE "AttendanceSession" ADD COLUMN "serviceTime" TIMESTAMP(3);
ALTER TABLE "AttendanceSession" ADD COLUMN "preServiceTime" TIMESTAMP(3);

-- Backfill serviceTime from existing startedAt
UPDATE "AttendanceSession" SET "serviceTime" = "startedAt" WHERE "serviceTime" IS NULL;

-- Enforce NOT NULL on serviceTime
ALTER TABLE "AttendanceSession" ALTER COLUMN "serviceTime" SET NOT NULL;

-- CreateTable: ChurchSettings (singleton enforced via fixed default id)
CREATE TABLE "ChurchSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row so reads always succeed
INSERT INTO "ChurchSettings" ("id", "name", "updatedAt")
VALUES ('singleton', 'My Church', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
