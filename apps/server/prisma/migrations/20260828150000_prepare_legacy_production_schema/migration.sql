-- 生产旧库长期缺失当前模型中的历史对象。
-- 本迁移由生产备份克隆与 Prisma 模型差异生成，仅保留新增对象、字段、索引、外键及已验证的数值类型扩容。
-- 明确排除 DROP TABLE、DROP COLUMN、DROP INDEX 和 DROP DEFAULT；事务确保失败时整体回滚。

BEGIN;

-- AlterTable
ALTER TABLE "AiAnalysisRecord" ADD COLUMN     "school" TEXT,
ALTER COLUMN "cost" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "AiCapability" ALTER COLUMN "costPerCall" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "layout" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "autonomyLevel" TEXT;

-- AlterTable
ALTER TABLE "BotConfig" ADD COLUMN     "freeUses" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "pricePer10Coin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "runtime" TEXT NOT NULL DEFAULT 'coze',
ADD COLUMN     "systemPrompt" TEXT;

-- AlterTable
ALTER TABLE "Circle" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "needApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendedEbookIds" JSONB;

-- AlterTable
ALTER TABLE "CircleMember" ADD COLUMN     "peekPriceCoin" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ClassicBook" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassicChapter" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassicReadingNote" ADD COLUMN     "originalText" TEXT,
ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'QUIZ',
ADD COLUMN     "judgePanel" JSONB,
ADD COLUMN     "prizes" JSONB,
ADD COLUMN     "shareCommitmentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stagesConfig" JSONB,
ADD COLUMN     "voteWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.2;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContentAuditRecord" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseOrigin" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "memberFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledOffAt" TIMESTAMP(3),
ADD COLUMN     "scheduledOnAt" TIMESTAMP(3),
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';

-- AlterTable
ALTER TABLE "GroupBuyParticipant" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "InstituteMember" ADD COLUMN     "feeExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteRemark" TEXT,
ADD COLUMN     "invitedBy" TEXT,
ADD COLUMN     "seatType" TEXT NOT NULL DEFAULT 'LECTURE';

-- AlterTable
ALTER TABLE "LiveRoom" ADD COLUMN     "auditReason" TEXT,
ADD COLUMN     "auditStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "orientation" TEXT NOT NULL DEFAULT 'portrait',
ADD COLUMN     "quality" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "replayChapters" JSONB,
ADD COLUMN     "replayCharge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replayVisibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "complianceDeclarationAt" TIMESTAMP(3),
ADD COLUMN     "creditGrade" TEXT NOT NULL DEFAULT 'B',
ADD COLUMN     "creditScore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "legalRepresentative" TEXT,
ADD COLUMN     "licenseLongTerm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseValidFrom" TIMESTAMP(3),
ADD COLUMN     "licenseValidUntil" TIMESTAMP(3),
ADD COLUMN     "merchantType" TEXT NOT NULL DEFAULT 'ENTERPRISE',
ADD COLUMN     "privacyConsentAt" TIMESTAMP(3),
ADD COLUMN     "qualificationFiles" JSONB,
ADD COLUMN     "qualificationNextReviewAt" TIMESTAMP(3),
ADD COLUMN     "qualificationRejectReason" TEXT,
ADD COLUMN     "qualificationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "qualificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "qualificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "registeredAddress" TEXT,
ADD COLUMN     "riskFlags" JSONB,
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "unifiedSocialCreditCode" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "category" TEXT,
ADD COLUMN     "circleId" TEXT;

-- AlterTable
ALTER TABLE "OfflineCourse" ADD COLUMN     "circleId" TEXT;

-- AlterTable
ALTER TABLE "OfflineCourseRegistration" ADD COLUMN     "verifyCode" TEXT;

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "channelType" TEXT NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "mgmtRate" DECIMAL(5,4);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "giftCardMeta" JSONB,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "selfDiscount" DECIMAL(10,2),
ADD COLUMN     "shippingInfo" JSONB,
ADD COLUMN     "sourceContentId" TEXT,
ADD COLUMN     "sourceContentType" TEXT,
ADD COLUMN     "tempRefSubjectType" TEXT;

-- AlterTable
ALTER TABLE "PaipanRecord" ADD COLUMN     "groupName" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "commissionRate" DECIMAL(5,4),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "sceneTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "pinnedUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StationOffline" ADD COLUMN     "brandStory" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featuredTeacherIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "intro" TEXT,
ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "StationTeacher" ADD COLUMN     "sourceUserId" TEXT;

-- AlterTable
ALTER TABLE "StationTeacherBooking" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creatorSettings" JSONB,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "notifySettings" JSONB,
ADD COLUMN     "phoneEnc" TEXT,
ADD COLUMN     "phoneHash" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "auditReason" TEXT,
ADD COLUMN     "auditStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "payoutRef" TEXT;

-- AlterTable
ALTER TABLE "WithdrawalApplication" ADD COLUMN     "accountInfoEnc" TEXT,
ADD COLUMN     "actualAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "packageInfo" TEXT,
ADD COLUMN     "payoutRef" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN     "transferBillNo" TEXT,
ADD COLUMN     "transferFailReason" TEXT,
ADD COLUMN     "transferState" TEXT;

-- AlterTable
ALTER TABLE "merchant_settlements" ALTER COLUMN "totalRevenue" SET DEFAULT 0,
ALTER COLUMN "totalRevenue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "commission" SET DEFAULT 0,
ALTER COLUMN "commission" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "settlementAmount" SET DEFAULT 0,
ALTER COLUMN "settlementAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "CircleRule" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "templateKey" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleRuleAck" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleIds" JSONB NOT NULL,
    "rulesSnapshot" JSONB NOT NULL,
    "ackAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleRuleAck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleViolation" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ruleId" TEXT,
    "ruleText" TEXT,
    "reason" TEXT,
    "evidence" TEXT,
    "contentType" TEXT,
    "contentId" TEXT,
    "operatorId" TEXT NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleAppeal" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "reviewerId" TEXT,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleGovernanceConfig" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "requireRuleAck" BOOLEAN NOT NULL DEFAULT true,
    "warningThreshold" INTEGER NOT NULL DEFAULT 3,
    "warningResetDays" INTEGER NOT NULL DEFAULT 90,
    "muteDays" INTEGER NOT NULL DEFAULT 7,
    "removeBanRejoin" BOOLEAN NOT NULL DEFAULT true,
    "newMemberReviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newMemberReviewDays" INTEGER NOT NULL DEFAULT 7,
    "sensitiveWordsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sensitiveWords" JSONB,
    "postIntervalSeconds" INTEGER NOT NULL DEFAULT 0,
    "reportAutoHideEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportAutoHideThreshold" INTEGER NOT NULL DEFAULT 3,
    "rolePermissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleGovernanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherCertification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "title" TEXT,
    "intro" TEXT,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedTitle" TEXT,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQualityPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "priceCoin" INTEGER NOT NULL,
    "priceYuan" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveQualityPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQuotaAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hdMinutes" INTEGER NOT NULL DEFAULT 0,
    "uhdMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveQuotaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQuotaRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "costCoin" INTEGER NOT NULL DEFAULT 0,
    "packageId" TEXT,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveQuotaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveReview" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reply" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveTeamMember" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "liveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoupleChart" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "partnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_INVITE',
    "initiatorRecordId" TEXT NOT NULL,
    "partnerRecordId" TEXT,
    "inviteToken" TEXT NOT NULL,
    "analysisId" TEXT,
    "initiatorDeleted" BOOLEAN NOT NULL DEFAULT false,
    "partnerDeleted" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoupleChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaipanGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paipanType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaipanGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrityCase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "primaryCat" TEXT NOT NULL,
    "secondaryCat" TEXT NOT NULL,
    "bazi" TEXT[],
    "letter" TEXT NOT NULL,
    "zodiac" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrityCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationPinnedContent" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationPinnedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTask" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" "TeamTaskType" NOT NULL,
    "targetValue" INTEGER,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "TeamTaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTaskProgress" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stationMasterId" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineCourseReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineCourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationEvent" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cover" TEXT,
    "intro" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxAttendees" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationEventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "qrCode" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationEventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteBoardGroup" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "leaderId" TEXT NOT NULL,
    "memberLimit" INTEGER NOT NULL DEFAULT 12,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteBoardGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteSharePoint" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointType" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "refId" TEXT,
    "remark" TEXT,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteSharePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contact" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "replacement" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensitiveWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceScanRecord" (
    "id" TEXT NOT NULL,
    "scanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "suggestion" TEXT,
    "snippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceScanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT '热卜国学',
    "siteNameShort" TEXT NOT NULL DEFAULT '热卜',
    "siteNameEn" TEXT NOT NULL DEFAULT 'REBU',
    "slogan" TEXT NOT NULL DEFAULT '探寻东方智慧',
    "sloganAlt" TEXT NOT NULL DEFAULT '观天地 · 明心性',
    "tagline" TEXT NOT NULL DEFAULT '国学知识平台',
    "copyright" TEXT NOT NULL DEFAULT '热卜国学 · 让国学回归生活',
    "qrGuide" TEXT NOT NULL DEFAULT '长按识别 · 开启国学之旅',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#c41e3a',
    "domain" TEXT NOT NULL DEFAULT 'api.rebugx.cn',
    "h5Url" TEXT NOT NULL DEFAULT 'https://api.rebugx.cn/h5/',
    "servicePhone" TEXT NOT NULL DEFAULT '',
    "serviceEmail" TEXT NOT NULL DEFAULT '',
    "serviceWechat" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "platformName" TEXT NOT NULL DEFAULT '热卜国学',
    "websiteUrl" TEXT NOT NULL DEFAULT '',
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "path" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelDaily" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "funnel" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "FunnelDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentinelAlert" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SentinelAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicBookList" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "curator" TEXT,
    "coverColor" TEXT NOT NULL DEFAULT 'brown',
    "tags" JSONB,
    "bookIds" JSONB NOT NULL DEFAULT '[]',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicBookList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassicFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicCompanionSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "summary" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicCompanionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicCompanionMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chapterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassicCompanionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCreatorWithdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "account" VARCHAR(255) NOT NULL,
    "accountEnc" VARCHAR(512),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "VideoCreatorWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantQualificationReview" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "riskFlags" JSONB,
    "reason" TEXT,
    "reviewerId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantQualificationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantMember" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantMetric" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "shipOnTimeRate" DECIMAL(5,4),
    "avgShipHours" DECIMAL(8,2),
    "refundRate" DECIMAL(5,4),
    "returnRate" DECIMAL(5,4),
    "avgRating" DECIMAL(3,2),
    "complaintCount" INTEGER NOT NULL DEFAULT 0,
    "qcPassRate" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantCreditLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "oldScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantCreditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPunishment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "operatorId" TEXT NOT NULL,
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantPunishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsProduct" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "icon" TEXT,
    "color" TEXT,
    "description" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsExchangeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsExchangeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleEvent" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "circle" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'activity',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionStage" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'QUIZ',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "advanceRule" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionTalent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bestRank" INTEGER,
    "totalCompetitions" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "talentScore" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'TRAINEE',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionTalent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WanNianLiDay" (
    "solarDate" DATE NOT NULL,
    "lunarYear" INTEGER NOT NULL,
    "lunarMonth" INTEGER NOT NULL,
    "lunarDay" INTEGER NOT NULL,
    "isLeap" BOOLEAN NOT NULL DEFAULT false,
    "nianGan" TEXT NOT NULL,
    "nianZhi" TEXT NOT NULL,
    "yueGan" TEXT NOT NULL,
    "yueZhi" TEXT NOT NULL,
    "riGan" TEXT NOT NULL,
    "riZhi" TEXT NOT NULL,
    "lunarYearGZ" TEXT NOT NULL,
    "lunarMonthGZ" TEXT NOT NULL,
    "lunarDayGZ" TEXT NOT NULL,
    "jieQi" TEXT,
    "erShiBaXiu" TEXT NOT NULL,
    "shengXiao" TEXT NOT NULL,
    "weekDay" INTEGER NOT NULL,

    CONSTRAINT "WanNianLiDay_pkey" PRIMARY KEY ("solarDate")
);

-- CreateTable
CREATE TABLE "PoetryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "intro" TEXT,
    "subCategories" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoetryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoetryCollection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "authorAvatar" TEXT,
    "dynasty" TEXT,
    "excerpt" TEXT,
    "category" TEXT,
    "cover" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoetryCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poetry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorId" TEXT,
    "dynasty" TEXT NOT NULL,
    "form" TEXT,
    "content" TEXT NOT NULL,
    "pinyin" JSONB,
    "translation" TEXT,
    "appreciation" TEXT,
    "aiAppreciation" TEXT,
    "notes" JSONB,
    "authorIntro" TEXT,
    "authorYears" TEXT,
    "authorTitle" TEXT,
    "tags" JSONB,
    "categoryId" TEXT,
    "collectionId" TEXT,
    "cover" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "collectCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isToday" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleRefundRequest" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "paidAmount" DECIMAL(10,2) NOT NULL,
    "dailyCost" DECIMAL(10,2) NOT NULL,
    "usedDays" INTEGER NOT NULL,
    "refundBase" DECIMAL(10,2) NOT NULL,
    "feeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "actualRefund" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "refundType" TEXT NOT NULL DEFAULT 'normal',
    "ownerStatus" TEXT NOT NULL DEFAULT 'pending',
    "ownerReviewedAt" TIMESTAMP(3),
    "ownerRejectReason" TEXT,
    "adminStatus" TEXT NOT NULL DEFAULT 'pending',
    "adminReviewedAt" TIMESTAMP(3),
    "adminRejectReason" TEXT,
    "refundStatus" TEXT NOT NULL DEFAULT 'pending',
    "refundedAt" TIMESTAMP(3),
    "ownerRecalled" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stationRecalled" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleRefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecall" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "offsetCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRecall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBalanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "refId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleCheckin" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkinDate" TEXT NOT NULL,
    "expGained" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMemberGrowth" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkinExp" INTEGER NOT NULL DEFAULT 0,
    "checkinStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCheckin" TEXT,
    "totalCheckins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleMemberGrowth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleBadgeRecord" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "gainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleBadgeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleJoinRequest" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultCall" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pricePerMinute" INTEGER NOT NULL,
    "prepaidCoin" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "rtcRoomId" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "settledCoin" INTEGER NOT NULL DEFAULT 0,
    "refundedCoin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "ratingTags" TEXT,
    "ratingComment" TEXT,
    "ratedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "disputeStatus" TEXT,
    "disputeResolveNote" TEXT,
    "disputeResolvedAt" TIMESTAMP(3),
    "disputeReviewerId" TEXT,

    CONSTRAINT "ConsultCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImPolicyConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "allowStrangerDM" BOOLEAN NOT NULL DEFAULT false,
    "followerDMQuota" INTEGER NOT NULL DEFAULT 1,
    "allowImage" BOOLEAN NOT NULL DEFAULT true,
    "allowVoice" BOOLEAN NOT NULL DEFAULT true,
    "allowFile" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImPolicyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImC2CCounter" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImC2CCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_approval" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "amount" DECIMAL(12,2),
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "fund_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementRule" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "splits" JSONB NOT NULL,
    "bufferDays" INTEGER NOT NULL DEFAULT 7,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalThreshold" DECIMAL(10,2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "beneficiaryType" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelClick" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorRule" (
    "id" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "suggestion" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGrowth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalExp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCheckinDate" TIMESTAMP(3),
    "mentorshipPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGrowth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "discipleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mentorshipPoints" INTEGER NOT NULL DEFAULT 0,
    "disciplePledge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graduatedAt" TIMESTAMP(3),

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBotQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "freeUsed" INTEGER NOT NULL DEFAULT 0,
    "paidRemaining" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBotQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentQualityScore" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "originality" INTEGER NOT NULL,
    "utility" INTEGER NOT NULL,
    "appeal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "reason" TEXT,
    "model" TEXT,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentQualityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTitle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorInsight" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "actedAt" TIMESTAMP(3),
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedReadingGroup" (
    "id" TEXT NOT NULL,
    "classicBookId" TEXT NOT NULL,
    "bookTitle" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "targetChapters" INTEGER NOT NULL,
    "minMembers" INTEGER NOT NULL DEFAULT 3,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "durationDays" INTEGER NOT NULL DEFAULT 7,
    "startAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECRUITING',
    "inviteToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedReadingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedReadingMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedChapters" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "SharedReadingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarTermParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "participatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarTermParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardDaily" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MarketingContentKind" NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "passedAudit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientBook" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneEnc" TEXT,
    "birthEnc" TEXT,
    "birthPlace" TEXT,
    "gender" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUserId" TEXT,
    "lastServeAt" TIMESTAMP(3),
    "serveCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientServeLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "summary" TEXT NOT NULL,
    "servedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientServeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReminder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiDraft" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "page" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayeeAccount" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settlementMode" TEXT NOT NULL DEFAULT 'PLATFORM_COLLECT',
    "platformRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "subjectName" TEXT,
    "licenseNo" TEXT,
    "licenseImage" TEXT,
    "legalName" TEXT,
    "legalIdCard" TEXT,
    "legalIdFront" TEXT,
    "legalIdBack" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "huifuId" TEXT,
    "wxSubMchId" TEXT,
    "alipayPid" TEXT,
    "payeeOpenid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "channel" TEXT NOT NULL DEFAULT 'HUIFU',
    "channelApplyId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayeeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZidianEntry" (
    "char" TEXT NOT NULL,
    "traditional" TEXT NOT NULL DEFAULT '',
    "pinyin" TEXT NOT NULL DEFAULT '',
    "pinyinPlain" TEXT NOT NULL DEFAULT '',
    "explanation" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZidianEntry_pkey" PRIMARY KEY ("char")
);

-- CreateTable
CREATE TABLE "HanziStroke" (
    "char" TEXT NOT NULL,
    "strokes" JSONB NOT NULL,
    "medians" JSONB NOT NULL,
    "radStrokes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HanziStroke_pkey" PRIMARY KEY ("char")
);

-- CreateTable
CREATE TABLE "PractitionerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proExpireAt" TIMESTAMP(3),
    "proFirstAt" TIMESTAMP(3),
    "brandName" TEXT,
    "title" TEXT,
    "avatarText" TEXT,
    "logoUrl" TEXT,
    "sealText" TEXT,
    "slogan" TEXT,
    "contact" TEXT,
    "disclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerReport" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "toolKey" TEXT,
    "type" TEXT NOT NULL,
    "typeLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientBirth" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "style" TEXT NOT NULL DEFAULT 'classic',
    "paipan" JSONB,
    "chapters" JSONB,
    "shareToken" TEXT,
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerCase" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reportId" TEXT,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'bazi',
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerAppointment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "service" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT '到店',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "fee" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerLedger" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientName" TEXT,
    "service" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payMethod" TEXT NOT NULL DEFAULT '现金',
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaziCase" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "yearPillar" TEXT NOT NULL,
    "monthPillar" TEXT NOT NULL,
    "dayPillar" TEXT NOT NULL,
    "hourPillar" TEXT NOT NULL,
    "birthYear" INTEGER,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "birthHour" INTEGER,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "realName" TEXT,
    "era" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "life" JSONB NOT NULL DEFAULT '{}',
    "events" JSONB NOT NULL DEFAULT '[]',
    "commentary" TEXT,
    "commentarySrc" TEXT,
    "contributorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "desensitized" BOOLEAN NOT NULL DEFAULT true,
    "quality" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaziCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaziCaseAttempt" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guess" JSONB NOT NULL DEFAULT '{}',
    "revealedAt" TIMESTAMP(3),
    "selfScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaziCaseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CircleRule_circleId_sortOrder_idx" ON "CircleRule"("circleId", "sortOrder");

-- CreateIndex
CREATE INDEX "CircleRuleAck_userId_idx" ON "CircleRuleAck"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleRuleAck_circleId_userId_key" ON "CircleRuleAck"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleViolation_circleId_userId_type_status_idx" ON "CircleViolation"("circleId", "userId", "type", "status");

-- CreateIndex
CREATE INDEX "CircleViolation_circleId_createdAt_idx" ON "CircleViolation"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleViolation_userId_createdAt_idx" ON "CircleViolation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleViolation_type_status_expiresAt_idx" ON "CircleViolation"("type", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleAppeal_violationId_key" ON "CircleAppeal"("violationId");

-- CreateIndex
CREATE INDEX "CircleAppeal_status_deadlineAt_idx" ON "CircleAppeal"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "CircleAppeal_circleId_createdAt_idx" ON "CircleAppeal"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleAppeal_userId_idx" ON "CircleAppeal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleGovernanceConfig_circleId_key" ON "CircleGovernanceConfig"("circleId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCertification_userId_key" ON "TeacherCertification"("userId");

-- CreateIndex
CREATE INDEX "TeacherCertification_status_idx" ON "TeacherCertification"("status");

-- CreateIndex
CREATE INDEX "LiveQualityPackage_status_quality_idx" ON "LiveQualityPackage"("status", "quality");

-- CreateIndex
CREATE UNIQUE INDEX "LiveQuotaAccount_userId_key" ON "LiveQuotaAccount"("userId");

-- CreateIndex
CREATE INDEX "LiveQuotaAccount_userId_idx" ON "LiveQuotaAccount"("userId");

-- CreateIndex
CREATE INDEX "LiveQuotaRecord_userId_createdAt_idx" ON "LiveQuotaRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveQuotaRecord_userId_type_idx" ON "LiveQuotaRecord"("userId", "type");

-- CreateIndex
CREATE INDEX "LiveReview_roomId_idx" ON "LiveReview"("roomId");

-- CreateIndex
CREATE INDEX "LiveReview_userId_idx" ON "LiveReview"("userId");

-- CreateIndex
CREATE INDEX "LiveTeamMember_ownerId_idx" ON "LiveTeamMember"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveTeamMember_ownerId_userId_key" ON "LiveTeamMember"("ownerId", "userId");

-- CreateIndex
CREATE INDEX "CoupleChart_initiatorId_idx" ON "CoupleChart"("initiatorId");

-- CreateIndex
CREATE INDEX "CoupleChart_partnerId_idx" ON "CoupleChart"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleChart_inviteToken_key" ON "CoupleChart"("inviteToken");

-- CreateIndex
CREATE INDEX "PaipanGroup_userId_paipanType_idx" ON "PaipanGroup"("userId", "paipanType");

-- CreateIndex
CREATE UNIQUE INDEX "PaipanGroup_userId_paipanType_name_key" ON "PaipanGroup"("userId", "paipanType", "name");

-- CreateIndex
CREATE INDEX "CelebrityCase_primaryCat_secondaryCat_idx" ON "CelebrityCase"("primaryCat", "secondaryCat");

-- CreateIndex
CREATE INDEX "CelebrityCase_letter_idx" ON "CelebrityCase"("letter");

-- CreateIndex
CREATE INDEX "CelebrityCase_sortOrder_idx" ON "CelebrityCase"("sortOrder");

-- CreateIndex
CREATE INDEX "StationPinnedContent_stationId_board_idx" ON "StationPinnedContent"("stationId", "board");

-- CreateIndex
CREATE INDEX "StationPinnedContent_board_contentType_contentId_idx" ON "StationPinnedContent"("board", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "StationPinnedContent_stationId_board_slotIndex_key" ON "StationPinnedContent"("stationId", "board", "slotIndex");

-- CreateIndex
CREATE INDEX "TeamTask_operatorId_status_idx" ON "TeamTask"("operatorId", "status");

-- CreateIndex
CREATE INDEX "TeamTask_status_deadline_idx" ON "TeamTask"("status", "deadline");

-- CreateIndex
CREATE INDEX "TeamTaskProgress_stationMasterId_idx" ON "TeamTaskProgress"("stationMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamTaskProgress_taskId_stationMasterId_key" ON "TeamTaskProgress"("taskId", "stationMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCourseReview_registrationId_key" ON "OfflineCourseReview"("registrationId");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_courseId_createdAt_idx" ON "OfflineCourseReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_stationId_idx" ON "OfflineCourseReview"("stationId");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_userId_idx" ON "OfflineCourseReview"("userId");

-- CreateIndex
CREATE INDEX "StationEvent_stationId_startTime_idx" ON "StationEvent"("stationId", "startTime");

-- CreateIndex
CREATE INDEX "StationEvent_status_startTime_idx" ON "StationEvent"("status", "startTime");

-- CreateIndex
CREATE INDEX "StationEventRegistration_userId_idx" ON "StationEventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StationEventRegistration_eventId_userId_key" ON "StationEventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteBoardGroup_circleId_key" ON "InstituteBoardGroup"("circleId");

-- CreateIndex
CREATE INDEX "InstituteBoardGroup_instituteId_status_idx" ON "InstituteBoardGroup"("instituteId", "status");

-- CreateIndex
CREATE INDEX "InstituteBoardGroup_leaderId_idx" ON "InstituteBoardGroup"("leaderId");

-- CreateIndex
CREATE INDEX "InstituteSharePoint_memberId_createdAt_idx" ON "InstituteSharePoint"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "InstituteSharePoint_userId_idx" ON "InstituteSharePoint"("userId");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_type_createdAt_idx" ON "Feedback"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SensitiveWord_word_key" ON "SensitiveWord"("word");

-- CreateIndex
CREATE INDEX "SensitiveWord_category_enabled_idx" ON "SensitiveWord"("category", "enabled");

-- CreateIndex
CREATE INDEX "ComplianceScanRecord_status_level_scanAt_idx" ON "ComplianceScanRecord"("status", "level", "scanAt");

-- CreateIndex
CREATE INDEX "ComplianceScanRecord_targetType_targetId_idx" ON "ComplianceScanRecord"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceScanRecord_targetType_targetId_field_word_key" ON "ComplianceScanRecord"("targetType", "targetId", "field", "word");

-- CreateIndex
CREATE INDEX "TrackEvent_action_createdAt_idx" ON "TrackEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "TrackEvent_userId_createdAt_idx" ON "TrackEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserTag_tag_idx" ON "UserTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "UserTag_userId_tag_key" ON "UserTag"("userId", "tag");

-- CreateIndex
CREATE INDEX "FunnelDaily_funnel_date_idx" ON "FunnelDaily"("funnel", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelDaily_date_funnel_step_key" ON "FunnelDaily"("date", "funnel", "step");

-- CreateIndex
CREATE INDEX "SentinelAlert_rule_resolvedAt_idx" ON "SentinelAlert"("rule", "resolvedAt");

-- CreateIndex
CREATE INDEX "SentinelAlert_firedAt_idx" ON "SentinelAlert"("firedAt");

-- CreateIndex
CREATE INDEX "ClassicBookList_status_sortOrder_idx" ON "ClassicBookList"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "ClassicFavorite_userId_idx" ON "ClassicFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicFavorite_userId_bookId_key" ON "ClassicFavorite"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicCompanionSession_userId_bookId_key" ON "ClassicCompanionSession"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ClassicCompanionMessage_sessionId_createdAt_idx" ON "ClassicCompanionMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCreatorWithdrawal_userId_createdAt_idx" ON "VideoCreatorWithdrawal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCreatorWithdrawal_status_createdAt_idx" ON "VideoCreatorWithdrawal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EbookFavorite_userId_idx" ON "EbookFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EbookFavorite_userId_ebookId_key" ON "EbookFavorite"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "MerchantQualificationReview_merchantId_createdAt_idx" ON "MerchantQualificationReview"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantQualificationReview_status_createdAt_idx" ON "MerchantQualificationReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantMember_userId_status_idx" ON "MerchantMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantMember_merchantId_userId_key" ON "MerchantMember"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "MerchantMetric_date_idx" ON "MerchantMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantMetric_merchantId_date_key" ON "MerchantMetric"("merchantId", "date");

-- CreateIndex
CREATE INDEX "MerchantCreditLog_merchantId_idx" ON "MerchantCreditLog"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantPunishment_merchantId_idx" ON "MerchantPunishment"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantPunishment_merchantId_status_idx" ON "MerchantPunishment"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PointsProduct_status_sortOrder_idx" ON "PointsProduct"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "PointsExchangeRecord_userId_createdAt_idx" ON "PointsExchangeRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleEvent_circleId_date_idx" ON "CircleEvent"("circleId", "date");

-- CreateIndex
CREATE INDEX "CompetitionStage_competitionId_status_idx" ON "CompetitionStage"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionStage_status_startAt_idx" ON "CompetitionStage"("status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionStage_competitionId_seq_key" ON "CompetitionStage"("competitionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTalent_userId_key" ON "CompetitionTalent"("userId");

-- CreateIndex
CREATE INDEX "CompetitionTalent_talentScore_idx" ON "CompetitionTalent"("talentScore");

-- CreateIndex
CREATE INDEX "WanNianLiDay_lunarYear_lunarMonth_idx" ON "WanNianLiDay"("lunarYear", "lunarMonth");

-- CreateIndex
CREATE INDEX "WanNianLiDay_nianGan_nianZhi_idx" ON "WanNianLiDay"("nianGan", "nianZhi");

-- CreateIndex
CREATE INDEX "WanNianLiDay_riGan_riZhi_idx" ON "WanNianLiDay"("riGan", "riZhi");

-- CreateIndex
CREATE INDEX "WanNianLiDay_jieQi_idx" ON "WanNianLiDay"("jieQi");

-- CreateIndex
CREATE UNIQUE INDEX "PoetryCategory_name_key" ON "PoetryCategory"("name");

-- CreateIndex
CREATE INDEX "PoetryCategory_sortOrder_idx" ON "PoetryCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "PoetryCollection_status_idx" ON "PoetryCollection"("status");

-- CreateIndex
CREATE INDEX "PoetryCollection_sortOrder_idx" ON "PoetryCollection"("sortOrder");

-- CreateIndex
CREATE INDEX "Poetry_status_idx" ON "Poetry"("status");

-- CreateIndex
CREATE INDEX "Poetry_dynasty_idx" ON "Poetry"("dynasty");

-- CreateIndex
CREATE INDEX "Poetry_author_idx" ON "Poetry"("author");

-- CreateIndex
CREATE INDEX "Poetry_categoryId_idx" ON "Poetry"("categoryId");

-- CreateIndex
CREATE INDEX "Poetry_collectionId_idx" ON "Poetry"("collectionId");

-- CreateIndex
CREATE INDEX "Poetry_status_isRecommended_idx" ON "Poetry"("status", "isRecommended");

-- CreateIndex
CREATE INDEX "Poetry_status_likes_idx" ON "Poetry"("status", "likes");

-- CreateIndex
CREATE INDEX "CircleRefundRequest_circleId_refundStatus_idx" ON "CircleRefundRequest"("circleId", "refundStatus");

-- CreateIndex
CREATE INDEX "CircleRefundRequest_userId_idx" ON "CircleRefundRequest"("userId");

-- CreateIndex
CREATE INDEX "CommissionRecall_userId_status_idx" ON "CommissionRecall"("userId", "status");

-- CreateIndex
CREATE INDEX "CommissionRecall_refundId_idx" ON "CommissionRecall"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserBalanceTransaction_userId_createdAt_idx" ON "UserBalanceTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleCheckin_circleId_userId_idx" ON "CircleCheckin"("circleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleCheckin_circleId_userId_checkinDate_key" ON "CircleCheckin"("circleId", "userId", "checkinDate");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMemberGrowth_circleId_userId_key" ON "CircleMemberGrowth"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleBadgeRecord_circleId_userId_idx" ON "CircleBadgeRecord"("circleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleBadgeRecord_circleId_userId_badgeCode_key" ON "CircleBadgeRecord"("circleId", "userId", "badgeCode");

-- CreateIndex
CREATE INDEX "CircleJoinRequest_circleId_status_idx" ON "CircleJoinRequest"("circleId", "status");

-- CreateIndex
CREATE INDEX "CircleJoinRequest_userId_idx" ON "CircleJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "ConsultCall_callerId_idx" ON "ConsultCall"("callerId");

-- CreateIndex
CREATE INDEX "ConsultCall_expertId_status_idx" ON "ConsultCall"("expertId", "status");

-- CreateIndex
CREATE INDEX "ConsultCall_expertId_rating_idx" ON "ConsultCall"("expertId", "rating");

-- CreateIndex
CREATE INDEX "ConsultCall_disputeStatus_idx" ON "ConsultCall"("disputeStatus");

-- CreateIndex
CREATE INDEX "ImC2CCounter_toUserId_idx" ON "ImC2CCounter"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ImC2CCounter_fromUserId_toUserId_key" ON "ImC2CCounter"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "fund_approval_status_createdAt_idx" ON "fund_approval"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRule_scene_key" ON "SettlementRule"("scene");

-- CreateIndex
CREATE INDEX "LedgerEntry_refType_refId_idx" ON "LedgerEntry"("refType", "refId");

-- CreateIndex
CREATE INDEX "LedgerEntry_beneficiaryType_beneficiaryId_status_idx" ON "LedgerEntry"("beneficiaryType", "beneficiaryId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_status_availableAt_idx" ON "LedgerEntry"("status", "availableAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_scene_createdAt_idx" ON "LedgerEntry"("scene", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelClick_userId_targetType_targetId_clickedAt_idx" ON "ChannelClick"("userId", "targetType", "targetId", "clickedAt");

-- CreateIndex
CREATE INDEX "ChannelClick_expiresAt_idx" ON "ChannelClick"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorRule_ruleKey_key" ON "AdvisorRule"("ruleKey");

-- CreateIndex
CREATE INDEX "AdvisorRule_roleType_enabled_idx" ON "AdvisorRule"("roleType", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "UserGrowth_userId_key" ON "UserGrowth"("userId");

-- CreateIndex
CREATE INDEX "Mentorship_mentorId_idx" ON "Mentorship"("mentorId");

-- CreateIndex
CREATE INDEX "Mentorship_discipleId_idx" ON "Mentorship"("discipleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBotQuota_userId_botConfigId_key" ON "UserBotQuota"("userId", "botConfigId");

-- CreateIndex
CREATE INDEX "ContentQualityScore_targetType_total_idx" ON "ContentQualityScore"("targetType", "total");

-- CreateIndex
CREATE UNIQUE INDEX "ContentQualityScore_targetType_targetId_key" ON "ContentQualityScore"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_earnedAt_idx" ON "UserAchievement"("userId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_code_key" ON "UserAchievement"("userId", "code");

-- CreateIndex
CREATE INDEX "UserTitle_userId_equipped_idx" ON "UserTitle"("userId", "equipped");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_userId_code_key" ON "UserTitle"("userId", "code");

-- CreateIndex
CREATE INDEX "AdvisorInsight_roleType_subjectId_status_idx" ON "AdvisorInsight"("roleType", "subjectId", "status");

-- CreateIndex
CREATE INDEX "AdvisorInsight_ruleKey_subjectId_createdAt_idx" ON "AdvisorInsight"("ruleKey", "subjectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharedReadingGroup_inviteToken_key" ON "SharedReadingGroup"("inviteToken");

-- CreateIndex
CREATE INDEX "SharedReadingGroup_status_idx" ON "SharedReadingGroup"("status");

-- CreateIndex
CREATE INDEX "SharedReadingGroup_initiatorId_idx" ON "SharedReadingGroup"("initiatorId");

-- CreateIndex
CREATE INDEX "SharedReadingMember_groupId_idx" ON "SharedReadingMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedReadingMember_groupId_userId_key" ON "SharedReadingMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "SolarTermParticipation_userId_idx" ON "SolarTermParticipation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SolarTermParticipation_userId_termName_year_key" ON "SolarTermParticipation"("userId", "termName", "year");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardDaily_date_key" ON "DashboardDaily"("date");

-- CreateIndex
CREATE INDEX "MarketingContent_userId_createdAt_idx" ON "MarketingContent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientBook_ownerId_createdAt_idx" ON "ClientBook"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientBook_ownerId_lastServeAt_idx" ON "ClientBook"("ownerId", "lastServeAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientBook_ownerId_sourceUserId_key" ON "ClientBook"("ownerId", "sourceUserId");

-- CreateIndex
CREATE INDEX "ClientServeLog_clientId_servedAt_idx" ON "ClientServeLog"("clientId", "servedAt");

-- CreateIndex
CREATE INDEX "ClientServeLog_ownerId_servedAt_idx" ON "ClientServeLog"("ownerId", "servedAt");

-- CreateIndex
CREATE INDEX "ClientReminder_ownerId_status_dueAt_idx" ON "ClientReminder"("ownerId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ClientReminder_clientId_kind_dueAt_idx" ON "ClientReminder"("clientId", "kind", "dueAt");

-- CreateIndex
CREATE INDEX "AdminFeedback_status_createdAt_idx" ON "AdminFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminFeedback_category_status_idx" ON "AdminFeedback"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayeeAccount_huifuId_key" ON "PayeeAccount"("huifuId");

-- CreateIndex
CREATE INDEX "PayeeAccount_status_idx" ON "PayeeAccount"("status");

-- CreateIndex
CREATE INDEX "PayeeAccount_userId_idx" ON "PayeeAccount"("userId");

-- CreateIndex
CREATE INDEX "PayeeAccount_settlementMode_status_idx" ON "PayeeAccount"("settlementMode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayeeAccount_subjectType_subjectId_key" ON "PayeeAccount"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "ZidianEntry_pinyin_idx" ON "ZidianEntry"("pinyin");

-- CreateIndex
CREATE INDEX "ZidianEntry_pinyinPlain_idx" ON "ZidianEntry"("pinyinPlain");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerReport_shareToken_key" ON "PractitionerReport"("shareToken");

-- CreateIndex
CREATE INDEX "PractitionerReport_ownerId_updatedAt_idx" ON "PractitionerReport"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "PractitionerCase_ownerId_occurredAt_idx" ON "PractitionerCase"("ownerId", "occurredAt");

-- CreateIndex
CREATE INDEX "PractitionerAppointment_ownerId_startAt_idx" ON "PractitionerAppointment"("ownerId", "startAt");

-- CreateIndex
CREATE INDEX "PractitionerLedger_ownerId_occurredAt_idx" ON "PractitionerLedger"("ownerId", "occurredAt");

-- CreateIndex
CREATE INDEX "BaziCase_dayPillar_status_idx" ON "BaziCase"("dayPillar", "status");

-- CreateIndex
CREATE INDEX "BaziCase_status_source_idx" ON "BaziCase"("status", "source");

-- CreateIndex
CREATE INDEX "BaziCase_status_isPremium_idx" ON "BaziCase"("status", "isPremium");

-- CreateIndex
CREATE INDEX "BaziCase_contributorId_idx" ON "BaziCase"("contributorId");

-- CreateIndex
CREATE INDEX "BaziCaseAttempt_userId_idx" ON "BaziCaseAttempt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BaziCaseAttempt_caseId_userId_key" ON "BaziCaseAttempt"("caseId", "userId");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_paipanRecordId_school_idx" ON "AiAnalysisRecord"("paipanRecordId", "school");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysisRecord_userId_paipanRecordId_analyzeType_school_key" ON "AiAnalysisRecord"("userId", "paipanRecordId", "analyzeType", "school");

-- CreateIndex
CREATE INDEX "Article_auditStatus_viewCount_idx" ON "Article"("auditStatus", "viewCount");

-- CreateIndex
CREATE INDEX "Circle_status_memberCount_idx" ON "Circle"("status", "memberCount");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_chapterId_position_idx" ON "ClassicReadingNote"("userId", "chapterId", "position");

-- CreateIndex
CREATE INDEX "Course_courseOrigin_idx" ON "Course"("courseOrigin");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteContentPurchase_contentId_userId_key" ON "InstituteContentPurchase"("contentId", "userId");

-- CreateIndex
CREATE INDEX "InstituteMember_userId_idx" ON "InstituteMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteMember_instituteId_userId_key" ON "InstituteMember"("instituteId", "userId");

-- CreateIndex
CREATE INDEX "LiveRoom_status_viewCount_idx" ON "LiveRoom"("status", "viewCount");

-- CreateIndex
CREATE INDEX "Merchant_qualificationStatus_qualificationNextReviewAt_idx" ON "Merchant"("qualificationStatus", "qualificationNextReviewAt");

-- CreateIndex
CREATE INDEX "Merchant_riskLevel_idx" ON "Merchant"("riskLevel");

-- CreateIndex
CREATE INDEX "Notification_userId_category_createdAt_idx" ON "Notification"("userId", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCourseRegistration_courseId_verifyCode_key" ON "OfflineCourseRegistration"("courseId", "verifyCode");

-- CreateIndex
CREATE INDEX "StationTeacher_sourceUserId_idx" ON "StationTeacher"("sourceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_payoutRef_key" ON "Withdrawal"("payoutRef");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalApplication_payoutRef_key" ON "WithdrawalApplication"("payoutRef");

-- AddForeignKey
ALTER TABLE "TeacherCertification" ADD CONSTRAINT "TeacherCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleChart" ADD CONSTRAINT "CoupleChart_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleChart" ADD CONSTRAINT "CoupleChart_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationPinnedContent" ADD CONSTRAINT "StationPinnedContent_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_stationMasterId_fkey" FOREIGN KEY ("stationMasterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineCourseReview" ADD CONSTRAINT "OfflineCourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "OfflineCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationEvent" ADD CONSTRAINT "StationEvent_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationEventRegistration" ADD CONSTRAINT "StationEventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "StationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteBoardGroup" ADD CONSTRAINT "InstituteBoardGroup_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteBoardGroup" ADD CONSTRAINT "InstituteBoardGroup_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteSharePoint" ADD CONSTRAINT "InstituteSharePoint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "InstituteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantQualificationReview" ADD CONSTRAINT "MerchantQualificationReview_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantMember" ADD CONSTRAINT "MerchantMember_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsExchangeRecord" ADD CONSTRAINT "PointsExchangeRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PointsProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEvent" ADD CONSTRAINT "CircleEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionStage" ADD CONSTRAINT "CompetitionStage_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTalent" ADD CONSTRAINT "CompetitionTalent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poetry" ADD CONSTRAINT "Poetry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PoetryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poetry" ADD CONSTRAINT "Poetry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PoetryCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientServeLog" ADD CONSTRAINT "ClientServeLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReminder" ADD CONSTRAINT "ClientReminder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeAccount" ADD CONSTRAINT "PayeeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaziCaseAttempt" ADD CONSTRAINT "BaziCaseAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BaziCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "EntitlementBalance_userId_entitlementKey_resourceType_resourceI" RENAME TO "EntitlementBalance_userId_entitlementKey_resourceType_resou_key";

COMMIT;
