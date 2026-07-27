ALTER TABLE "Merchant"
  ADD COLUMN IF NOT EXISTS "merchantType" TEXT NOT NULL DEFAULT 'ENTERPRISE',
  ADD COLUMN IF NOT EXISTS "unifiedSocialCreditCode" TEXT,
  ADD COLUMN IF NOT EXISTS "registeredAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "legalRepresentative" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseValidFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "licenseValidUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "licenseLongTerm" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "qualificationFiles" JSONB,
  ADD COLUMN IF NOT EXISTS "qualificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "qualificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qualificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qualificationNextReviewAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qualificationRejectReason" TEXT,
  ADD COLUMN IF NOT EXISTS "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "riskFlags" JSONB,
  ADD COLUMN IF NOT EXISTS "privacyConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "complianceDeclarationAt" TIMESTAMP(3);

-- 存量已开通商户不直接停业，但纳入六个月复核周期；新申请仍必须走完整人工审核。
UPDATE "Merchant"
SET
  "qualificationStatus" = 'APPROVED',
  "qualificationReviewedAt" = COALESCE("reviewedAt", NOW()),
  "qualificationNextReviewAt" = NOW() + INTERVAL '6 months',
  "riskLevel" = CASE WHEN "creditScore" >= 70 THEN 'LOW' ELSE 'MEDIUM' END
WHERE "status" = 'ACTIVE'
  AND "qualificationStatus" = 'DRAFT';

CREATE TABLE IF NOT EXISTS "MerchantQualificationReview" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
  "riskFlags" JSONB,
  "reason" TEXT,
  "reviewerId" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantQualificationReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MerchantQualificationReview_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Merchant_qualificationStatus_qualificationNextReviewAt_idx"
  ON "Merchant"("qualificationStatus", "qualificationNextReviewAt");
CREATE INDEX IF NOT EXISTS "Merchant_riskLevel_idx" ON "Merchant"("riskLevel");
CREATE INDEX IF NOT EXISTS "MerchantQualificationReview_merchantId_createdAt_idx"
  ON "MerchantQualificationReview"("merchantId", "createdAt");
CREATE INDEX IF NOT EXISTS "MerchantQualificationReview_status_createdAt_idx"
  ON "MerchantQualificationReview"("status", "createdAt");
