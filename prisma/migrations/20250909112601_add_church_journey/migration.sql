/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChurchStatus" AS ENUM ('FIRST_TIMER', 'VISITOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('NON_WORKER', 'WORKER');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('REGULAR', 'EXECUTIVE');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "churchStatus" "ChurchStatus" NOT NULL DEFAULT 'VISITOR',
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "membershipType" "MembershipType",
ADD COLUMN     "workerType" "WorkerType";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "VisitType";

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserDepartments_B_index" ON "_UserDepartments"("B");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserDepartments" ADD CONSTRAINT "_UserDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserDepartments" ADD CONSTRAINT "_UserDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
