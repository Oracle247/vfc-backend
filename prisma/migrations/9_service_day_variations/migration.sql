-- CreateTable
CREATE TABLE "ServiceDayVariation" (
    "id" TEXT NOT NULL,
    "serviceDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDayVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDayVariationService" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "serviceTime" TEXT NOT NULL,
    "preServiceTime" TEXT,
    "closesAt" TEXT,

    CONSTRAINT "ServiceDayVariationService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceDayVariation_serviceDayId_idx" ON "ServiceDayVariation"("serviceDayId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDayVariation_serviceDayId_name_key" ON "ServiceDayVariation"("serviceDayId", "name");

-- CreateIndex
CREATE INDEX "ServiceDayVariationService_variationId_idx" ON "ServiceDayVariationService"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDayVariationService_variationId_order_key" ON "ServiceDayVariationService"("variationId", "order");

-- AddForeignKey
ALTER TABLE "ServiceDayVariation" ADD CONSTRAINT "ServiceDayVariation_serviceDayId_fkey" FOREIGN KEY ("serviceDayId") REFERENCES "ServiceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDayVariationService" ADD CONSTRAINT "ServiceDayVariationService_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ServiceDayVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
