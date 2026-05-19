-- ─────────────────────────────────────────────────
-- 赛事系统 — 通用竞赛平台
-- ─────────────────────────────────────────────────

-- 枚举类型
CREATE TYPE "public"."CompetitionType" AS ENUM (
  'BAZI_PREDICT', 'LIUYAO', 'QIMEN_DUNJIA', 'MEIHUA_YISHU',
  'ZIWEI_DOUSHU', 'FENGSHUI', 'NAME_ANALYSIS',
  'POETRY', 'COUPLET', 'CALLIGRAPHY', 'PAINTING', 'MUSIC',
  'GO_CHESS', 'TEA_CEREMONY', 'INCENSE', 'MARTIAL_ARTS',
  'TCM_DIAGNOSIS', 'CLASSIC_RECITE', 'GEWU_PERCEIVE', 'UNKNOWN_PREDICT'
);

CREATE TYPE "public"."CompetitionStatus" AS ENUM (
  'DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'
);

CREATE TYPE "public"."CompetitionLevel" AS ENUM ('S', 'A', 'B');

CREATE TYPE "public"."RoundType" AS ENUM (
  'REGISTRATION', 'PRELIMINARY', 'SEMIFINAL', 'FINAL'
);

CREATE TYPE "public"."RoundStatus" AS ENUM (
  'PENDING', 'IN_PROGRESS', 'FINISHED'
);

CREATE TYPE "public"."QuestionType" AS ENUM (
  'SINGLE_CHOICE', 'MULTI_CHOICE', 'FILL_IN', 'SCALE', 'CASE_ANALYSIS', 'ESSAY'
);

CREATE TYPE "public"."ScoringModel" AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE "public"."RegistrationStatus" AS ENUM (
  'REGISTERED', 'QUALIFIED', 'DISQUALIFIED', 'WITHDRAWN'
);

CREATE TYPE "public"."PromotionStatus" AS ENUM (
  'ELIMINATED', 'PROMOTED', 'CHAMPION', 'RUNNER_UP', 'THIRD_PLACE'
);

-- 赛事配置表
CREATE TABLE "public"."Competition" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "public"."CompetitionType" NOT NULL,
  "level" "public"."CompetitionLevel" NOT NULL DEFAULT 'B',
  "status" "public"."CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "coverImage" TEXT,
  "rules" TEXT,
  "scoringModel" "public"."ScoringModel" NOT NULL DEFAULT 'A',
  "maxParticipants" INTEGER NOT NULL DEFAULT 0,
  "entryFee" INTEGER NOT NULL DEFAULT 0,
  "isInviteOnly" BOOLEAN NOT NULL DEFAULT false,
  "requireIdentity" BOOLEAN NOT NULL DEFAULT false,
  "minLevel" INTEGER NOT NULL DEFAULT 0,
  "organizerId" TEXT,
  "organizerType" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "totalPrize" INTEGER NOT NULL DEFAULT 0,
  "invitationShare" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),

  CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- 赛程/轮次表
CREATE TABLE "public"."CompetitionRound" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "type" "public"."RoundType" NOT NULL,
  "status" "public"."RoundStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "passCount" INTEGER NOT NULL DEFAULT 0,
  "passPercent" INTEGER NOT NULL DEFAULT 0,
  "scoringConfig" JSONB,
  "liveConfig" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionRound_pkey" PRIMARY KEY ("id")
);

-- 报名表
CREATE TABLE "public"."CompetitionRegistration" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "public"."RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  "inviterId" TEXT,
  "inviteCode" TEXT,
  "paidFee" INTEGER NOT NULL DEFAULT 0,
  "extraData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

-- 题库表
CREATE TABLE "public"."CompetitionQuestion" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "roundId" TEXT,
  "type" "public"."QuestionType" NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 10,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "stem" TEXT NOT NULL,
  "options" JSONB,
  "answer" JSONB NOT NULL,
  "analysis" TEXT,
  "source" TEXT,
  "tags" TEXT[] DEFAULT '{}',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionQuestion_pkey" PRIMARY KEY ("id")
);

-- 答题记录表
CREATE TABLE "public"."CompetitionAnswer" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answer" JSONB NOT NULL,
  "isCorrect" BOOLEAN,
  "score" INTEGER,
  "graderId" TEXT,
  "comment" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gradedAt" TIMESTAMP(3),

  CONSTRAINT "CompetitionAnswer_pkey" PRIMARY KEY ("id")
);

-- 评分表
CREATE TABLE "public"."CompetitionScore" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "roundId" TEXT,
  "totalScore" INTEGER NOT NULL DEFAULT 0,
  "autoScore" INTEGER NOT NULL DEFAULT 0,
  "judgeScore" INTEGER NOT NULL DEFAULT 0,
  "bonusScore" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionScore_pkey" PRIMARY KEY ("id")
);

-- 排名表
CREATE TABLE "public"."CompetitionRanking" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roundId" TEXT,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "status" "public"."PromotionStatus" NOT NULL,
  "prize" INTEGER NOT NULL DEFAULT 0,
  "prizeInfo" JSONB,
  "certificateUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionRanking_pkey" PRIMARY KEY ("id")
);

-- 邀请分润表
CREATE TABLE "public"."CompetitionInvitation" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "inviteeStatus" "public"."RegistrationStatus",
  "rewardType" TEXT,
  "rewardAmount" INTEGER NOT NULL DEFAULT 0,
  "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionInvitation_pkey" PRIMARY KEY ("id")
);

-- 邀请码表
CREATE TABLE "public"."CompetitionInviteCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "shareCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "regCount" INTEGER NOT NULL DEFAULT 0,
  "totalReward" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetitionInviteCode_pkey" PRIMARY KEY ("id")
);

-- 赛事分享文章表
CREATE TABLE "public"."CompetitionArticle" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isPremium" BOOLEAN NOT NULL DEFAULT false,
  "unlockPrice" INTEGER NOT NULL DEFAULT 0,
  "unlockCount" INTEGER NOT NULL DEFAULT 0,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "qualityRating" DOUBLE PRECISION,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),

  CONSTRAINT "CompetitionArticle_pkey" PRIMARY KEY ("id")
);

-- 特约老师表
CREATE TABLE "public"."SpecialTeacher" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "competitionWins" INTEGER NOT NULL DEFAULT 0,
  "featuredArticles" INTEGER NOT NULL DEFAULT 0,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "level" TEXT NOT NULL DEFAULT 'candidate',
  "certificates" TEXT[] DEFAULT '{}',
  "invitedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SpecialTeacher_pkey" PRIMARY KEY ("id")
);

-- ── 索引 ──

CREATE INDEX "Competition_type_idx" ON "public"."Competition"("type");
CREATE INDEX "Competition_status_idx" ON "public"."Competition"("status");
CREATE INDEX "Competition_level_idx" ON "public"."Competition"("level");
CREATE INDEX "Competition_organizerId_idx" ON "public"."Competition"("organizerId");
CREATE INDEX "Competition_createdAt_idx" ON "public"."Competition"("createdAt");

CREATE INDEX "CompetitionRound_competitionId_sortOrder_idx" ON "public"."CompetitionRound"("competitionId", "sortOrder");

CREATE UNIQUE INDEX "CompetitionRegistration_competitionId_userId_key" ON "public"."CompetitionRegistration"("competitionId", "userId");
CREATE INDEX "CompetitionRegistration_competitionId_status_idx" ON "public"."CompetitionRegistration"("competitionId", "status");
CREATE INDEX "CompetitionRegistration_inviterId_idx" ON "public"."CompetitionRegistration"("inviterId");

CREATE INDEX "CompetitionQuestion_competitionId_idx" ON "public"."CompetitionQuestion"("competitionId");
CREATE INDEX "CompetitionQuestion_roundId_idx" ON "public"."CompetitionQuestion"("roundId");
CREATE INDEX "CompetitionQuestion_type_idx" ON "public"."CompetitionQuestion"("type");
CREATE INDEX "CompetitionQuestion_difficulty_idx" ON "public"."CompetitionQuestion"("difficulty");

CREATE UNIQUE INDEX "CompetitionAnswer_registrationId_questionId_key" ON "public"."CompetitionAnswer"("registrationId", "questionId");
CREATE INDEX "CompetitionAnswer_roundId_registrationId_idx" ON "public"."CompetitionAnswer"("roundId", "registrationId");

CREATE UNIQUE INDEX "CompetitionScore_registrationId_roundId_key" ON "public"."CompetitionScore"("registrationId", "roundId");
CREATE INDEX "CompetitionScore_registrationId_idx" ON "public"."CompetitionScore"("registrationId");

CREATE UNIQUE INDEX "CompetitionRanking_competitionId_userId_roundId_key" ON "public"."CompetitionRanking"("competitionId", "userId", "roundId");
CREATE INDEX "CompetitionRanking_competitionId_rank_idx" ON "public"."CompetitionRanking"("competitionId", "rank");
CREATE INDEX "CompetitionRanking_userId_idx" ON "public"."CompetitionRanking"("userId");

CREATE UNIQUE INDEX "CompetitionInvitation_competitionId_inviteeId_key" ON "public"."CompetitionInvitation"("competitionId", "inviteeId");
CREATE INDEX "CompetitionInvitation_competitionId_inviterId_idx" ON "public"."CompetitionInvitation"("competitionId", "inviterId");
CREATE UNIQUE INDEX "CompetitionInvitation_inviteCode_key" ON "public"."CompetitionInvitation"("inviteCode");

CREATE UNIQUE INDEX "CompetitionInviteCode_userId_key" ON "public"."CompetitionInviteCode"("userId");
CREATE UNIQUE INDEX "CompetitionInviteCode_code_key" ON "public"."CompetitionInviteCode"("code");

CREATE INDEX "CompetitionArticle_competitionId_idx" ON "public"."CompetitionArticle"("competitionId");
CREATE INDEX "CompetitionArticle_isFeatured_idx" ON "public"."CompetitionArticle"("isFeatured");
CREATE INDEX "CompetitionArticle_qualityRating_idx" ON "public"."CompetitionArticle"("qualityRating");

CREATE UNIQUE INDEX "SpecialTeacher_userId_key" ON "public"."SpecialTeacher"("userId");
CREATE INDEX "SpecialTeacher_level_idx" ON "public"."SpecialTeacher"("level");
CREATE INDEX "SpecialTeacher_totalScore_idx" ON "public"."SpecialTeacher"("totalScore");

-- ── 外键约束 ──

ALTER TABLE "public"."CompetitionRound" ADD CONSTRAINT "CompetitionRound_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."CompetitionRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "public"."CompetitionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."CompetitionRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."CompetitionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionScore" ADD CONSTRAINT "CompetitionScore_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "public"."CompetitionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionRanking" ADD CONSTRAINT "CompetitionRanking_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionRanking" ADD CONSTRAINT "CompetitionRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitionArticle" ADD CONSTRAINT "CompetitionArticle_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "public"."Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CompetitionArticle" ADD CONSTRAINT "CompetitionArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SpecialTeacher" ADD CONSTRAINT "SpecialTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
