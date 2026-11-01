-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_RECEIVED';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "virtualAccountNumber" TEXT,
ADD COLUMN     "virtualAccountBankName" TEXT,
ADD COLUMN     "virtualAccountRef" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "receivedById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_virtualAccountNumber_key" ON "invoices"("virtualAccountNumber");
