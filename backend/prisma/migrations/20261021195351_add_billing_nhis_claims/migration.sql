-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('SELF_PAY', 'NHIS', 'STATE_SCHEME', 'PRIVATE_HMO');

-- CreateEnum
CREATE TYPE "TariffCategory" AS ENUM ('CONSULTATION', 'LAB', 'PROCEDURE', 'MEDICATION', 'ADMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'CAPITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "payers" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PayerType" NOT NULL,
    "contactInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_coverages" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "enrolleeId" TEXT,
    "planName" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_items" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "payerId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" "TariffCategory" NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_lines" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "tariffItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "payerId" TEXT NOT NULL,
    "coverageId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "claimId" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "adjudicatedAt" TIMESTAMP(3),
    "approvedAmount" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payers_facilityId_name_key" ON "payers"("facilityId", "name");

-- CreateIndex
CREATE INDEX "patient_coverages_patientId_idx" ON "patient_coverages"("patientId");

-- CreateIndex
CREATE INDEX "invoices_facilityId_status_idx" ON "invoices"("facilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_facilityId_invoiceNumber_key" ON "invoices"("facilityId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "claims_facilityId_claimNumber_key" ON "claims"("facilityId", "claimNumber");

-- AddForeignKey
ALTER TABLE "payers" ADD CONSTRAINT "payers_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_items" ADD CONSTRAINT "tariff_items_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_items" ADD CONSTRAINT "tariff_items_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "payers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_tariffItemId_fkey" FOREIGN KEY ("tariffItemId") REFERENCES "tariff_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_coverageId_fkey" FOREIGN KEY ("coverageId") REFERENCES "patient_coverages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
