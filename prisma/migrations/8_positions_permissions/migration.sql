-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionPermission" (
    "positionId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "PositionPermission_pkey" PRIMARY KEY ("positionId","permissionId")
);

-- CreateTable
CREATE TABLE "DepartmentPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "PositionPermission_permissionId_idx" ON "PositionPermission"("permissionId");

-- CreateIndex
CREATE INDEX "DepartmentPosition_departmentId_idx" ON "DepartmentPosition"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentPosition_userId_idx" ON "DepartmentPosition"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentPosition_userId_departmentId_positionId_key" ON "DepartmentPosition"("userId", "departmentId", "positionId");

-- AddForeignKey
ALTER TABLE "PositionPermission" ADD CONSTRAINT "PositionPermission_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionPermission" ADD CONSTRAINT "PositionPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPosition" ADD CONSTRAINT "DepartmentPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPosition" ADD CONSTRAINT "DepartmentPosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPosition" ADD CONSTRAINT "DepartmentPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
