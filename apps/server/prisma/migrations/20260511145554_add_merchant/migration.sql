-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING_REVIEW', 'REVIEW_FAILED', 'DEPOSIT_PENDING', 'AGREEMENT_PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- AlterTable: add merchantId to Order
ALTER TABLE "Order" ADD COLUMN "merchantId" TEXT;

-- CreateIndex
CREATE INDEX "Order_merchantId_status_idx" ON "Order"("merchantId", "status");

-- CreateTable: Merchant
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopLogo" TEXT,
    "shopIntro" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "idCardNumber" TEXT NOT NULL,
    "idCardFront" TEXT,
    "idCardBack" TEXT,
    "businessLicense" TEXT,
    "brandAuth" TEXT,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MerchantStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "depositAmount" DECIMAL(10,2),
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "rejectReason" TEXT,
    "commissionRate" DECIMAL(5,4),
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_userId_key" ON "Merchant"("userId");

-- CreateIndex
CREATE INDEX "Merchant_status_idx" ON "Merchant"("status");

-- CreateIndex
CREATE INDEX "Merchant_status_createdAt_idx" ON "Merchant"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Merchant_shopName_idx" ON "Merchant"("shopName");

-- CreateTable: MerchantViolation
CREATE TABLE "MerchantViolation" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "ViolationSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "penalty" DECIMAL(10,2),
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB,
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "appeal" TEXT,
    "appealAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantViolation_merchantId_idx" ON "MerchantViolation"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantViolation_status_idx" ON "MerchantViolation"("status");

-- CreateTable: MerchantDepositRecord
CREATE TABLE "MerchantDepositRecord" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payMethod" TEXT,
    "payTransactionId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantDepositRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantDepositRecord_merchantId_idx" ON "MerchantDepositRecord"("merchantId");

-- CreateTable: MerchantAgreement
CREATE TABLE "MerchantAgreement" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '商家入驻协议',
    "content" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantAgreement_merchantId_idx" ON "MerchantAgreement"("merchantId");

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantViolation" ADD CONSTRAINT "MerchantViolation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDepositRecord" ADD CONSTRAINT "MerchantDepositRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAgreement" ADD CONSTRAINT "MerchantAgreement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
