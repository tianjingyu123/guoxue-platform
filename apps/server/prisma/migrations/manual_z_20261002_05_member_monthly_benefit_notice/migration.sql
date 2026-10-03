-- 只记录新发放事实，不回填旧积分或旧券；通知独立补发，不改变资金政策。
CREATE TABLE "MemberMonthlyBenefitNotice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "couponRecordId" TEXT,
  "couponId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberMonthlyBenefitNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberMonthlyBenefitNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MemberMonthlyBenefitNotice_id_fkey" FOREIGN KEY ("id") REFERENCES "PointsRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MemberMonthlyBenefitNotice_userId_source_key" ON "MemberMonthlyBenefitNotice"("userId", "source");
CREATE UNIQUE INDEX "MemberMonthlyBenefitNotice_couponRecordId_key" ON "MemberMonthlyBenefitNotice"("couponRecordId");
CREATE INDEX "MemberMonthlyBenefitNotice_createdAt_id_idx" ON "MemberMonthlyBenefitNotice"("createdAt", "id");
