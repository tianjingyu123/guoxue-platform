-- 本版新过期删除事实，与删除及人数变更同事务保存，不回填历史记录。
CREATE TABLE "CircleMembershipExpiryNotice" (
  "memberId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "expiredAt" TIMESTAMP(3) NOT NULL,
  "removedAt" TIMESTAMP(3) NOT NULL,
  "cacheClearedAt" TIMESTAMP(3),
  CONSTRAINT "CircleMembershipExpiryNotice_pkey" PRIMARY KEY ("memberId"),
  CONSTRAINT "CircleMembershipExpiryNotice_recipientId_fkey" FOREIGN KEY ("recipientId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CircleMembershipExpiryNotice_circleId_fkey" FOREIGN KEY ("circleId")
    REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CircleMembershipExpiryNotice_removedAt_memberId_idx"
  ON "CircleMembershipExpiryNotice"("removedAt", "memberId");
CREATE INDEX "CircleMembershipExpiryNotice_cache_pending_idx"
  ON "CircleMembershipExpiryNotice"("cacheClearedAt", "removedAt", "memberId");
