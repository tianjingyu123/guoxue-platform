-- Layer 2: 多源知识聚合 — CircleKnowledge 扩展字段
ALTER TABLE "CircleKnowledge" ADD COLUMN IF NOT EXISTS "scope" VARCHAR DEFAULT 'circle';
ALTER TABLE "CircleKnowledge" ADD COLUMN IF NOT EXISTS "qualityScore" DOUBLE PRECISION;
ALTER TABLE "CircleKnowledge" ADD COLUMN IF NOT EXISTS "chunkIndex" INTEGER;
ALTER TABLE "CircleKnowledge" ADD COLUMN IF NOT EXISTS "parentChunkId" VARCHAR;

CREATE INDEX IF NOT EXISTS "idx_CircleKnowledge_scope_status" ON "CircleKnowledge"("scope", "status");
CREATE INDEX IF NOT EXISTS "idx_CircleKnowledge_qualityScore" ON "CircleKnowledge"("qualityScore");

-- 将现有典籍知识的 scope 标记为 global
UPDATE "CircleKnowledge" SET "scope" = 'global' WHERE "sourceType" = 'classic' AND "scope" = 'circle';

-- Layer 3: 知识图谱
CREATE TABLE IF NOT EXISTS "KnowledgeEntity" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "type" VARCHAR NOT NULL,
  "aliases" VARCHAR,
  "summary" TEXT,
  "createdAt" TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_KnowledgeEntity_name_type" ON "KnowledgeEntity"("name", "type");
CREATE INDEX IF NOT EXISTS "idx_KnowledgeEntity_type" ON "KnowledgeEntity"("type");

CREATE TABLE IF NOT EXISTS "KnowledgeEdge" (
  "id" VARCHAR PRIMARY KEY,
  "fromId" VARCHAR NOT NULL REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE,
  "toId" VARCHAR NOT NULL REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE,
  "relation" VARCHAR NOT NULL,
  "weight" DOUBLE PRECISION DEFAULT 1.0,
  "evidence" TEXT,
  "knowledgeId" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_KnowledgeEdge_fromId" ON "KnowledgeEdge"("fromId");
CREATE INDEX IF NOT EXISTS "idx_KnowledgeEdge_toId" ON "KnowledgeEdge"("toId");
CREATE INDEX IF NOT EXISTS "idx_KnowledgeEdge_knowledgeId" ON "KnowledgeEdge"("knowledgeId");

-- Layer 4: 用户知识画像
CREATE TABLE IF NOT EXISTS "UserKnowledgeProfile" (
  "id" VARCHAR PRIMARY KEY,
  "userId" VARCHAR NOT NULL UNIQUE,
  "topInterests" VARCHAR,
  "topEntities" VARCHAR,
  "difficultyLevel" DOUBLE PRECISION DEFAULT 0.5,
  "totalQueries" INTEGER DEFAULT 0,
  "lastActiveAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_UserKnowledgeProfile_userId" ON "UserKnowledgeProfile"("userId");

CREATE TABLE IF NOT EXISTS "UserKnowledgeInteraction" (
  "id" VARCHAR PRIMARY KEY,
  "userId" VARCHAR NOT NULL,
  "knowledgeId" VARCHAR NOT NULL,
  "action" VARCHAR NOT NULL,
  "queryText" TEXT,
  "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_UserKnowledgeInteraction_userId" ON "UserKnowledgeInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_UserKnowledgeInteraction_knowledgeId" ON "UserKnowledgeInteraction"("knowledgeId");
