-- CreateTable
CREATE TABLE "ServiceDayDepartmentLateTime" (
    "id" TEXT NOT NULL,
    "serviceDayId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "lateTime" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDayDepartmentLateTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceDayDepartmentLateTime_serviceDayId_idx" ON "ServiceDayDepartmentLateTime"("serviceDayId");

-- CreateIndex
CREATE INDEX "ServiceDayDepartmentLateTime_departmentId_idx" ON "ServiceDayDepartmentLateTime"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDayDepartmentLateTime_serviceDayId_departmentId_key" ON "ServiceDayDepartmentLateTime"("serviceDayId", "departmentId");

-- AddForeignKey
ALTER TABLE "ServiceDayDepartmentLateTime" ADD CONSTRAINT "ServiceDayDepartmentLateTime_serviceDayId_fkey" FOREIGN KEY ("serviceDayId") REFERENCES "ServiceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDayDepartmentLateTime" ADD CONSTRAINT "ServiceDayDepartmentLateTime_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDayDepartmentLateTime" ADD CONSTRAINT "ServiceDayDepartmentLateTime_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
