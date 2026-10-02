-- 仅本版实际治理处理同事务保存事实，不回填历史，不操作资金。
CREATE TABLE "CircleGovernanceNotice" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleGovernanceNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CircleGovernanceNotice_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CircleGovernanceNotice_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CircleGovernanceNotice_eventKey_key" ON "CircleGovernanceNotice"("eventKey");
CREATE INDEX "CircleGovernanceNotice_occurredAt_id_idx" ON "CircleGovernanceNotice"("occurredAt", "id");
