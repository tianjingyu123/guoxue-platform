-- 圈外知识星图独立快照：不迁移任何旧知识，默认 DRAFT 且公开查询 fail-closed。
CREATE TABLE "CircleKnowledgeShowcaseNode" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "sourceKnowledgeId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "summary" VARCHAR(160) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "rightsNote" TEXT,
    "rightsApprovedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CircleKnowledgeShowcaseNode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CircleKnowledgeShowcaseNode_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT "CircleKnowledgeShowcaseNode_publish_check" CHECK (
      "status" <> 'PUBLISHED' OR (
        "rightsApprovedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL
        AND "reviewedBy" IS NOT NULL AND nullif(btrim("rightsNote"), '') IS NOT NULL
        AND "revokedAt" IS NULL
      )
    )
);

CREATE TABLE "CircleKnowledgeShowcaseEdge" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" VARCHAR(80) NOT NULL,
    "evidenceNote" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CircleKnowledgeShowcaseEdge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CircleKnowledgeShowcaseEdge_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT "CircleKnowledgeShowcaseEdge_publish_check" CHECK (
      "status" <> 'PUBLISHED' OR (
        "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL
        AND nullif(btrim("evidenceNote"), '') IS NOT NULL AND "revokedAt" IS NULL
      )
    )
);

CREATE INDEX "CircleKnowledgeShowcaseNode_circleId_status_displayOrder_idx"
  ON "CircleKnowledgeShowcaseNode"("circleId", "status", "displayOrder");
CREATE INDEX "CircleKnowledgeShowcaseNode_sourceKnowledgeId_idx"
  ON "CircleKnowledgeShowcaseNode"("sourceKnowledgeId");
CREATE INDEX "CircleKnowledgeShowcaseEdge_circleId_status_displayOrder_idx"
  ON "CircleKnowledgeShowcaseEdge"("circleId", "status", "displayOrder");
CREATE INDEX "CircleKnowledgeShowcaseEdge_fromId_idx"
  ON "CircleKnowledgeShowcaseEdge"("fromId");
CREATE INDEX "CircleKnowledgeShowcaseEdge_toId_idx"
  ON "CircleKnowledgeShowcaseEdge"("toId");

ALTER TABLE "CircleKnowledgeShowcaseNode" ADD CONSTRAINT "CircleKnowledgeShowcaseNode_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleKnowledgeShowcaseNode" ADD CONSTRAINT "CircleKnowledgeShowcaseNode_sourceKnowledgeId_fkey"
  FOREIGN KEY ("sourceKnowledgeId") REFERENCES "CircleKnowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleKnowledgeShowcaseEdge" ADD CONSTRAINT "CircleKnowledgeShowcaseEdge_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleKnowledgeShowcaseEdge" ADD CONSTRAINT "CircleKnowledgeShowcaseEdge_fromId_fkey"
  FOREIGN KEY ("fromId") REFERENCES "CircleKnowledgeShowcaseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleKnowledgeShowcaseEdge" ADD CONSTRAINT "CircleKnowledgeShowcaseEdge_toId_fkey"
  FOREIGN KEY ("toId") REFERENCES "CircleKnowledgeShowcaseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
