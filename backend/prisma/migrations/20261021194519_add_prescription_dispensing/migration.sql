-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "dispensedAt" TIMESTAMP(3),
ADD COLUMN     "dispensedById" TEXT;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
