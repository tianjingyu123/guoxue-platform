-- 缓存失效与实际成员变更同事务记录。保留删除后的键待办，不设成员外键，不操作资金。
CREATE TABLE "CircleMembershipCacheInvalidation" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "clearedAt" TIMESTAMP(3),
  CONSTRAINT "CircleMembershipCacheInvalidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CircleMembershipCacheInvalidation_pending_idx" ON "CircleMembershipCacheInvalidation"("clearedAt", "createdAt", "id");
