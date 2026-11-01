-- AlterTable
ALTER TABLE "vital_signs" ADD COLUMN     "clientGeneratedId" TEXT;

-- AlterTable
ALTER TABLE "diagnoses" ADD COLUMN     "clientGeneratedId" TEXT;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "clientGeneratedId" TEXT;

-- AlterTable
ALTER TABLE "lab_orders" ADD COLUMN     "clientGeneratedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vital_signs_clientGeneratedId_key" ON "vital_signs"("clientGeneratedId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_clientGeneratedId_key" ON "diagnoses"("clientGeneratedId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_clientGeneratedId_key" ON "prescriptions"("clientGeneratedId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_clientGeneratedId_key" ON "lab_orders"("clientGeneratedId");
