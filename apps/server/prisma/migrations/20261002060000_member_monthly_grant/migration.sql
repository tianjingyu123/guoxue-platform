-- 新增月度权益提交凭据。仅赠券不依赖积分流水；历史记录不回填、不变更。
CREATE TABLE IF NOT EXISTS "MemberMonthlyGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "couponId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberMonthlyGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberMonthlyGrant_userId_source_key"
  ON "MemberMonthlyGrant"("userId", "source");
CREATE INDEX IF NOT EXISTS "MemberMonthlyGrant_userId_createdAt_idx"
  ON "MemberMonthlyGrant"("userId", "createdAt");
