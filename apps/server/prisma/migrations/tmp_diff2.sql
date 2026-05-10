-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "validityDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "frozenAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "reply" TEXT;

-- AlterTable
ALTER TABLE "RecommendRule" ADD COLUMN     "position" INTEGER;

-- CreateTable
CREATE TABLE "FreightTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED',
    "defaultFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conditionFree" JSONB,
    "regions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreightTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FullReductionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" DECIMAL(10,2) NOT NULL,
    "reduction" DECIMAL(10,2) NOT NULL,
    "giftProductId" TEXT,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FullReductionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FullReductionRule_status_startTime_endTime_idx" ON "FullReductionRule"("status", "startTime", "endTime");

