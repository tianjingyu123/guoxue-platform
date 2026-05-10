-- ── 推荐系统枚举 ──
CREATE TYPE "BehaviorType" AS ENUM ('VIEW', 'LIKE', 'COLLECT', 'COMMENT', 'PURCHASE', 'LEARN', 'SEARCH', 'SHARE', 'FOLLOW');

-- ── 给 Course / Product / Video 添加 tags 字段 ──
ALTER TABLE "Course" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Video" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── 用户行为聚合表 ──
CREATE TABLE "UserBehavior" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "behavior" "BehaviorType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scene" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehavior_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserBehavior_userId_behavior_createdAt_idx" ON "UserBehavior"("userId", "behavior", "createdAt");
CREATE INDEX "idx_user_target" ON "UserBehavior"("userId", "targetType", "targetId");
CREATE INDEX "UserBehavior_targetType_targetId_idx" ON "UserBehavior"("targetType", "targetId");
CREATE INDEX "UserBehavior_userId_createdAt_idx" ON "UserBehavior"("userId", "createdAt");

-- ── 用户兴趣标签表 ──
CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL DEFAULT 'BEHAVIOR',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInterest_userId_tag_key" ON "UserInterest"("userId", "tag");
CREATE INDEX "UserInterest_userId_score_idx" ON "UserInterest"("userId", "score");
CREATE INDEX "UserInterest_tag_score_idx" ON "UserInterest"("tag", "score");

-- ── 运营干预规则表 ──
CREATE TABLE "RecommendRule" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleValue" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditionJson" JSONB,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecommendRule_scene_targetType_targetId_idx" ON "RecommendRule"("scene", "targetType", "targetId");
CREATE INDEX "RecommendRule_scene_ruleType_idx" ON "RecommendRule"("scene", "ruleType");
CREATE INDEX "RecommendRule_ruleType_priority_idx" ON "RecommendRule"("ruleType", "priority");

-- ── 推荐日志表 ──
CREATE TABLE "RecommendLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "scene" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,
    "recommendId" TEXT,
    "isClick" BOOLEAN NOT NULL DEFAULT false,
    "staySeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecommendLog_userId_createdAt_idx" ON "RecommendLog"("userId", "createdAt");
CREATE INDEX "RecommendLog_scene_createdAt_idx" ON "RecommendLog"("scene", "createdAt");
CREATE INDEX "RecommendLog_recommendId_idx" ON "RecommendLog"("recommendId");
CREATE INDEX "RecommendLog_strategy_idx" ON "RecommendLog"("strategy");
