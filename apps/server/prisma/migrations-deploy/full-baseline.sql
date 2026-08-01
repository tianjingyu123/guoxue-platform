-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'BANNED');

-- CreateEnum
CREATE TYPE "MemberLevel" AS ENUM ('NONE', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "IdentityLevel" AS ENUM ('NONE', 'L1', 'L2');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'OPERATION_ADMIN', 'CONTENT_AUDITOR', 'FINANCE_ADMIN', 'CUSTOMER_SERVICE', 'GOODS_AUDITOR', 'CIRCLE_OWNER', 'LECTURER', 'STATION_MASTER', 'OPERATOR', 'STATION_OFFLINE_OWNER', 'INSTITUTE_MEMBER', 'INSTITUTE_ADMIN');

-- CreateEnum
CREATE TYPE "ReferrerType" AS ENUM ('STATION_MASTER', 'OPERATOR', 'USER');

-- CreateEnum
CREATE TYPE "CircleType" AS ENUM ('FREE', 'PAID', 'YEARLY');

-- CreateEnum
CREATE TYPE "CircleStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING');

-- CreateEnum
CREATE TYPE "CircleMemberRole" AS ENUM ('OWNER', 'PARTNER', 'ADMIN', 'GUEST', 'VOLUNTEER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CirclePublishScope" AS ENUM ('SHORT_VIDEO', 'LIVE', 'COURSE');

-- CreateEnum
CREATE TYPE "CirclePublishGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FROZEN', 'REVOKED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'LINK', 'AUDIO');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('VIDEO', 'AUDIO', 'TEXT', 'EBOOK', 'COMBO');

-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('FREE_GIFT', 'PAID_COMBO', 'MEMBER_BENEFIT');

-- CreateEnum
CREATE TYPE "BundleTarget" AS ENUM ('STATION', 'OPERATOR', 'MEMBER', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('PLATFORM', 'CIRCLE_OWNER', 'STATION_OFFLINE', 'CERTIFIED_MERCHANT');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE_IN', 'SALE_OUT', 'ORDER_CANCEL_RETURN', 'REFUND_RETURN', 'ADJUST_IN', 'ADJUST_OUT', 'STOCKTAKE_GAIN', 'STOCKTAKE_LOSS');

-- CreateEnum
CREATE TYPE "InventoryReferenceType" AS ENUM ('PURCHASE_ORDER', 'PURCHASE_RECEIPT', 'ORDER', 'ADJUSTMENT', 'STOCKTAKE', 'RETURN');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MEMBER', 'COURSE', 'PRODUCT', 'CIRCLE_JOIN', 'CIRCLE_RENEW', 'STATION_MASTER', 'OPERATOR', 'BOT_SERVICE', 'PAIPAN', 'LIVESTREAM', 'BUNDLE', 'PRACTITIONER_PRO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FULL_REDUCE', 'DISCOUNT', 'NO_THRESHOLD');

-- CreateEnum
CREATE TYPE "LiveHostType" AS ENUM ('CIRCLE_OWNER', 'STATION_MASTER');

-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('WAITING', 'LIVING', 'ENDED', 'REPLAY');

-- CreateEnum
CREATE TYPE "OperatorLevel" AS ENUM ('SILVER', 'GOLD', 'DIAMOND', 'BLACK_GOLD');

-- CreateEnum
CREATE TYPE "TeamTaskType" AS ENUM ('PROMOTE', 'RECRUIT', 'SALES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TeamTaskStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "InstituteRole" AS ENUM ('INITIATOR', 'TYPE_A', 'TYPE_B', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY_GENERAL');

-- CreateEnum
CREATE TYPE "CoinTransType" AS ENUM ('RECHARGE', 'SPEND', 'REFUND', 'GRANT', 'INCOME');

-- CreateEnum
CREATE TYPE "CoinScene" AS ENUM ('RECHARGE', 'CIRCLE_JOIN', 'PAID_QUESTION', 'PEEK_ANSWER', 'AUDIO_CALL', 'LIVE_GIFT', 'LIVE_QUALITY_PACKAGE', 'BOT_CALL', 'REFUND', 'PLATFORM_GRANT', 'BOUNTY', 'BOUNTY_UNFREEZE', 'POST_REWARD', 'CONSULT_CALL_PREPAY', 'LIVE_GIFT_INCOME', 'EARNING_CONVERT', 'CASE_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "EarningScene" AS ENUM ('QUESTION', 'PEEK', 'PEEK_ASKER', 'AUDIO_CALL', 'LIVE_GIFT');

-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('VIEW', 'LIKE', 'COLLECT', 'COMMENT', 'PURCHASE', 'LEARN', 'SEARCH', 'SHARE', 'FOLLOW');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('ORDER_PAID', 'ORDER_REFUNDED', 'USER_REGISTERED', 'CONTENT_PUBLISHED', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_PAID', 'COURSE_ENROLLED', 'LIVE_STARTED', 'LIVE_ENDED');

-- CreateEnum
CREATE TYPE "EbookStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING_REVIEW', 'REVIEW_FAILED', 'DEPOSIT_PENDING', 'AGREEMENT_PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CODE_DEVELOP', 'BUG_FIX', 'DATA_ANALYSIS', 'USER_FEEDBACK', 'CONTENT_REVIEW', 'FINANCE_CHECK', 'SYSTEM_HEALTH', 'SCHEDULED_TASK');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('BAZI_PREDICT', 'LIUYAO', 'QIMEN_DUNJIA', 'MEIHUA_YISHU', 'ZIWEI_DOUSHU', 'FENGSHUI', 'NAME_ANALYSIS', 'POETRY', 'COUPLET', 'CALLIGRAPHY', 'PAINTING', 'MUSIC', 'GO_CHESS', 'TEA_CEREMONY', 'INCENSE', 'MARTIAL_ARTS', 'TCM_DIAGNOSIS', 'CLASSIC_RECITE', 'GEWU_PERCEIVE', 'UNKNOWN_PREDICT');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitionLevel" AS ENUM ('S', 'A', 'B');

-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('CASH', 'PHYSICAL', 'VIRTUAL', 'MIXED');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('REGISTRATION', 'PRELIMINARY', 'SEMIFINAL', 'FINAL');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE', 'FILL_IN', 'SCALE', 'CASE_ANALYSIS', 'ESSAY');

-- CreateEnum
CREATE TYPE "ScoringModel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'QUALIFIED', 'DISQUALIFIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ELIMINATED', 'PROMOTED', 'CHAMPION', 'RUNNER_UP', 'THIRD_PLACE');

-- CreateEnum
CREATE TYPE "MarketingContentKind" AS ENUM ('SHORT_VIDEO', 'MOMENTS', 'XIAOHONGSHU');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "phoneHash" TEXT,
    "phoneEnc" TEXT,
    "email" TEXT,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "gender" INTEGER,
    "birthday" TIMESTAMP(3),
    "memberLevel" "MemberLevel" NOT NULL DEFAULT 'NONE',
    "memberExpire" TIMESTAMP(3),
    "memberAutoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentPasswordHash" TEXT,
    "interestCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerifiedAt" TIMESTAMP(3),
    "identityLevel" "IdentityLevel" NOT NULL DEFAULT 'NONE',
    "attributionSource" TEXT NOT NULL DEFAULT 'PLATFORM',
    "attributionStationId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT DEFAULT 'Asia/Shanghai',
    "preferredCurrency" TEXT DEFAULT 'CNY',
    "notifySettings" JSONB,
    "creatorSettings" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleteRequestedAt" TIMESTAMP(3),
    "deleteScheduledAt" TIMESTAMP(3),
    "teenModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "teenModeSettings" JSONB,
    "competitionInviteCodeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "openId" TEXT,
    "unionId" TEXT,
    "credential" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyMigrationBatch" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "cutoffAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "sourceManifest" JSONB NOT NULL,
    "resultReport" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyMigrationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyMigrationMap" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceChecksum" TEXT,
    "metadata" JSONB,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyMigrationMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleType" "RoleType" NOT NULL,
    "bindId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleType" "RoleType" NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberType" "MemberLevel" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sourcePage" TEXT,
    "referrerId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP(3),

    CONSTRAINT "MemberPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralRelation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referrerType" "ReferrerType" NOT NULL,
    "sourceChannel" TEXT,
    "relationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "cover" TEXT,
    "tags" TEXT[],
    "type" "CircleType" NOT NULL DEFAULT 'FREE',
    "needApproval" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "originalPrice" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "status" "CircleStatus" NOT NULL DEFAULT 'PENDING',
    "stationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recommendedEbookIds" JSONB,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirclePublishGrant" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "scopes" "CirclePublishScope"[],
    "status" "CirclePublishGrantStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'REGULAR',
    "externalPlatform" TEXT,
    "externalProfileUrl" TEXT,
    "externalFollowerCount" INTEGER,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibilitySnapshot" JSONB NOT NULL,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CirclePublishGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CircleMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP(3),
    "questionPriceCoin" INTEGER NOT NULL DEFAULT 0,
    "peekPriceCoin" INTEGER NOT NULL DEFAULT 0,
    "questionTimeoutHours" INTEGER NOT NULL DEFAULT 72,
    "callPricePerMinuteCoin" INTEGER NOT NULL DEFAULT 0,
    "callAvailableHours" JSONB,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleAnnouncement" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleAnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleAnnouncementRead_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "CircleInviteCode" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleInvitation" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "inviteCodeId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'TEXT',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "fileUrl" TEXT,
    "linkUrl" TEXT,
    "audioUrl" TEXT,
    "audioDuration" INTEGER,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "isEssence" BOOLEAN NOT NULL DEFAULT false,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "isPushHome" BOOLEAN NOT NULL DEFAULT false,
    "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "auditReason" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ARTICLE',
    "author" TEXT,
    "dynasty" TEXT,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "cover" TEXT,
    "tags" TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "auditReason" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "stationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "content" TEXT NOT NULL,
    "contentEn" TEXT,
    "cover" TEXT,
    "excerpt" TEXT,
    "excerptEn" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'AUTO',
    "tags" TEXT[],
    "isPushHome" BOOLEAN NOT NULL DEFAULT false,
    "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
    "scheduledAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "collectCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "stationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleRecommend" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "recommendType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT,
    "cover" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleRecommend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAuditRecord" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "circleId" TEXT,
    "submitterId" TEXT NOT NULL,
    "auditMode" TEXT NOT NULL DEFAULT 'PRE_PUBLISH',
    "machineStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "machineResult" TEXT,
    "machineAuditAt" TIMESTAMP(3),
    "machineAuditBy" TEXT,
    "humanAuditorId" TEXT,
    "humanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "humanResult" TEXT,
    "humanAuditAt" TIMESTAMP(3),
    "aiReauditEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiReauditStatus" TEXT,
    "aiReauditResult" TEXT,
    "aiReauditAt" TIMESTAMP(3),
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAt" TIMESTAMP(3),
    "recommendedBy" TEXT,
    "finalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "finishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "cover" TEXT,
    "intro" TEXT,
    "introEn" TEXT,
    "type" "CourseType" NOT NULL DEFAULT 'VIDEO',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "originalPrice" DECIMAL(10,2),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
    "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "memberFree" BOOLEAN NOT NULL DEFAULT false,
    "courseOrigin" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "scheduledOnAt" TIMESTAMP(3),
    "scheduledOffAt" TIMESTAMP(3),
    "stationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseChapter" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "duration" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "freeTrial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseWork" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseQa" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseQa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cover" TEXT,
    "intro" TEXT,
    "type" "BundleType" NOT NULL DEFAULT 'FREE_GIFT',
    "target" "BundleTarget" NOT NULL DEFAULT 'PUBLIC',
    "originalPrice" DECIMAL(10,2),
    "sellPrice" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'COURSE',
    "itemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationBundleAccess" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "stationId" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationBundleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "categoryId" TEXT,
    "intro" TEXT,
    "introEn" TEXT,
    "detail" TEXT NOT NULL,
    "detailEn" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sceneTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,4),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "isPlatform" BOOLEAN NOT NULL DEFAULT true,
    "supplierType" "SupplierType" NOT NULL DEFAULT 'PLATFORM',
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSku" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "skuCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "beforeStock" INTEGER NOT NULL,
    "afterStock" INTEGER NOT NULL,
    "referenceType" "InventoryReferenceType" NOT NULL,
    "referenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "operatorId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlertSetting" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "stockKey" TEXT NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAlertSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "expectedAt" TIMESTAMP(3),
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "productTitle" TEXT NOT NULL,
    "skuLabel" TEXT,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "warehouseName" TEXT,
    "operatorId" TEXT NOT NULL,
    "remark" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "productTitle" TEXT NOT NULL,
    "skuLabel" TEXT,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,
    "payAmount" DECIMAL(10,2),
    "originalAmount" DECIMAL(10,2),
    "couponId" TEXT,
    "promotionType" TEXT,
    "promotionId" TEXT,
    "merchantId" TEXT,
    "addressId" TEXT,
    "shippingInfo" JSONB,
    "groupId" TEXT,
    "selfDiscount" DECIMAL(10,2),
    "giftCardMeta" JSONB,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "referrerId" TEXT,
    "tempReferrerId" TEXT,
    "tempRefSubjectType" TEXT,
    "sourceContentType" TEXT,
    "sourceContentId" TEXT,
    "payMethod" TEXT,
    "payTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "frozenAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "name" TEXT,
    "value" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2),
    "discountRate" DECIMAL(5,4),
    "minAmount" DECIMAL(10,2),
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "scopeId" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT -1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "validStart" TIMESTAMP(3) NOT NULL,
    "validEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCoupon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reply" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OrderLogistics" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "company" TEXT,
    "logisticsNo" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "address" TEXT,
    "zipCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trackingData" JSONB,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLogistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveRoom" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT,
    "cover" TEXT,
    "hostType" "LiveHostType" NOT NULL DEFAULT 'CIRCLE_OWNER',
    "hostUserId" TEXT NOT NULL,
    "coHostIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pushUrl" TEXT,
    "pullUrl" TEXT,
    "trtcRoomId" TEXT,
    "imGroupId" TEXT,
    "status" "LiveStatus" NOT NULL DEFAULT 'WAITING',
    "quality" TEXT NOT NULL DEFAULT 'basic',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "chargeType" TEXT NOT NULL DEFAULT 'FREE',
    "chargePrice" DECIMAL(10,2),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "replayUrl" TEXT,
    "courseId" TEXT,
    "auditStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "auditReason" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
    "replayVisibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
    "replayCharge" BOOLEAN NOT NULL DEFAULT false,
    "replayChapters" JSONB,
    "stationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveWatchProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "clientSessionId" TEXT NOT NULL,
    "clientSequence" INTEGER NOT NULL DEFAULT 0,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveWatchProgress_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "LiveProduct" (
    "id" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiveProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMic" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OCCUPIED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSlide" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMutedUser" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "mutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LiveMutedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveFlashSale" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "flashPrice" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveFlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveAuditLog" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "auditResult" TEXT NOT NULL DEFAULT 'PENDING',
    "label" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "duration" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "collectCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "auditReason" TEXT,
    "auditStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY',
    "stationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProduct" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "avatar" TEXT,
    "intro" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" INTEGER NOT NULL DEFAULT 5,
    "price" DECIMAL(10,2),
    "monthlyPrice" DECIMAL(10,2),
    "freeUses" INTEGER NOT NULL DEFAULT 3,
    "pricePer10Coin" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "voiceEnabled" BOOLEAN DEFAULT false,
    "runtime" TEXT NOT NULL DEFAULT 'coze',
    "systemPrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleBot" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotKnowledgeBase" (
    "id" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotChatLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "conversationId" TEXT,
    "chatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaipanRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientName" TEXT,
    "clientBirth" TEXT NOT NULL,
    "paipanType" TEXT NOT NULL,
    "inputParams" JSONB NOT NULL,
    "groupName" TEXT,
    "resultData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaipanRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "BaziKnowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "contentHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaziKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZiweiKnowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "contentHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZiweiKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysisRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paipanRecordId" TEXT,
    "toolId" TEXT,
    "analyzeType" TEXT NOT NULL,
    "school" TEXT,
    "analysisContent" TEXT NOT NULL,
    "modelName" TEXT NOT NULL DEFAULT 'deepseek-v4-pro',
    "tokenUsage" JSONB,
    "isCached" BOOLEAN NOT NULL DEFAULT false,
    "scene" TEXT,
    "modelUsed" TEXT,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "fallbackModel" TEXT,
    "latency" INTEGER,
    "cost" DECIMAL(10,4),
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "userAccepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysisRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCacheEntry" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "queryVectorJson" TEXT,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokenUsage" JSONB,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "payload" JSONB NOT NULL,
    "context" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "processedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCapability" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scene" TEXT[],
    "modality" TEXT[],
    "capabilityType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "costPerCall" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "avgLatency" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastHealthCheck" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDecision" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "capabilityId" TEXT,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "inputSummary" TEXT NOT NULL,
    "contextKeys" TEXT[],
    "reasoning" JSONB,
    "output" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "humanAction" TEXT,
    "humanReviewer" TEXT,
    "humanNote" TEXT,
    "humanReviewedAt" TIMESTAMP(3),
    "outcomeMetric" TEXT,
    "outcomeExpected" DOUBLE PRECISION,
    "outcomeActual" DOUBLE PRECISION,
    "outcomeMeasuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCollaboration" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "impactScope" JSONB NOT NULL,
    "alternatives" JSONB NOT NULL DEFAULT '[]',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "executionPlan" JSONB NOT NULL,
    "rollbackPlan" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "decisionId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "feedbackRating" INTEGER,
    "feedbackComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCollaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "stationId" TEXT,
    "durationMs" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "sourceScene" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolShare" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolRecordId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "title" TEXT,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolPayRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolRecordId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolPayRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationToolConfig" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "customName" TEXT,
    "customSubtitle" TEXT,
    "methods" JSONB,
    "feeConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationToolConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityScoreRecord" (
    "id" TEXT NOT NULL,
    "contentSnippet" TEXT NOT NULL,
    "scene" TEXT,
    "context" TEXT,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "readability" DOUBLE PRECISION NOT NULL,
    "professionalism" DOUBLE PRECISION NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "QualityScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo" TEXT,
    "themeColor" TEXT DEFAULT '#8B4513',
    "intro" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "totalEarning" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "miniAppId" TEXT,
    "mpAppId" TEXT,
    "miniPages" JSONB,
    "templateId" TEXT DEFAULT 'default',
    "templateConfig" JSONB,
    "paipanLink" TEXT,
    "paipanUserId" TEXT,
    "expireAt" TIMESTAMP(3),
    "pinnedUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operatorId" TEXT,
    "tenantType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "schemaName" TEXT,
    "dbConnString" TEXT,
    "featureFlags" JSONB,
    "apiDailyQuota" INTEGER NOT NULL DEFAULT 0,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "paymentConfig" JSONB,
    "autoSuspendOnExpiry" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationPick" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationPick_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "OperatorLevel" NOT NULL,
    "containQuota" INTEGER NOT NULL DEFAULT 0,
    "usedQuota" INTEGER NOT NULL DEFAULT 0,
    "parentOperatorId" TEXT,
    "totalEarning" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "channelType" TEXT NOT NULL DEFAULT 'ONLINE',
    "mgmtRate" DECIMAL(5,4),
    "miniAppId" TEXT,
    "mpAppId" TEXT,
    "miniPages" JSONB,
    "brandName" TEXT,
    "brandLogo" TEXT,
    "brandThemeColor" TEXT DEFAULT '#8B4513',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationEarning" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "earned" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorEarning" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "earned" DECIMAL(10,2) NOT NULL,
    "sourceStationId" TEXT,
    "sourceOperatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorEarning_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "StationOffline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cover" TEXT,
    "type" TEXT,
    "intro" TEXT,
    "businessHours" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerUserId" TEXT NOT NULL,
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "operatorId" TEXT,
    "brandStory" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuredTeacherIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationOffline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineCourse" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT,
    "intro" TEXT,
    "teacherId" TEXT,
    "courseId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OFFLINE',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxStudents" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "auditReason" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAt" TIMESTAMP(3),
    "circleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineCourse_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OfflineCourseRegistration" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "qrCode" TEXT,
    "verifyCode" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineCourseRegistration_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "StationProduct" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationOrder" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "stationIncome" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationTeacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "stationId" TEXT NOT NULL,
    "sourceUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationTeacherBooking" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationTeacherBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationSettlement" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalIncome" DECIMAL(12,2) NOT NULL,
    "stationShare" DECIMAL(12,2) NOT NULL,
    "platformShare" DECIMAL(12,2) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT,
    "logo" TEXT,
    "circleId" TEXT,
    "adminUserId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "legalEntity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteCourse" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT,
    "intro" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "teacherShare" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "maxStudents" INTEGER NOT NULL DEFAULT 20,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteCourseRegistration" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteCourseRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteMember" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "InstituteRole" NOT NULL,
    "seatType" TEXT NOT NULL DEFAULT 'LECTURE',
    "deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "depositRefunded" BOOLEAN NOT NULL DEFAULT false,
    "expireAt" TIMESTAMP(3),
    "joinYear" INTEGER NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksRequired" INTEGER NOT NULL DEFAULT 3,
    "lecturerLevel" TEXT NOT NULL DEFAULT 'NONE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "feeExempt" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT,
    "inviteRemark" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteMember_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "InstituteTask" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteTaskTemplate" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "periodUnit" TEXT NOT NULL DEFAULT 'YEAR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lecturerId" TEXT,
    "description" TEXT,
    "location" TEXT,
    "scheduleAt" TIMESTAMP(3) NOT NULL,
    "maxAttendees" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instituteId" TEXT,

    CONSTRAINT "InstituteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteRevenue" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteDividend" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteDividend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationTeacherRequest" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "teacherId" TEXT,
    "courseTitle" TEXT,
    "courseIntro" TEXT,
    "proposedFee" DECIMAL(10,2),
    "proposeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiator" TEXT NOT NULL DEFAULT 'STATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationTeacherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "periodDays" INTEGER NOT NULL DEFAULT 365,
    "prevExpireAt" TIMESTAMP(3) NOT NULL,
    "newExpireAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "scene" TEXT NOT NULL DEFAULT 'LOGIN',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "executor" TEXT,
    "autonomyLevel" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "rollbackData" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ConfigSystem" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigSystem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "category" TEXT,
    "circleId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchWeight" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL DEFAULT 'all',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "author" TEXT,
    "dynasty" TEXT,
    "category" TEXT NOT NULL DEFAULT '子',
    "cover" TEXT,
    "intro" TEXT,
    "introEn" TEXT,
    "source" TEXT,
    "versionGroupId" TEXT,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "content" TEXT NOT NULL,
    "contentEn" TEXT,
    "translation" TEXT,
    "translationEn" TEXT,
    "annotation" TEXT,
    "tags" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassicChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicCommentary" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "dynasty" TEXT,
    "school" TEXT,
    "type" TEXT NOT NULL DEFAULT '注释',
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "contentHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicCommentary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicImage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "label" TEXT,
    "iiifUrl" TEXT,
    "manifestUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassicImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicOcrText" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "w" INTEGER NOT NULL,
    "h" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "charIndex" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "ClassicOcrText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicAnnotation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "type" TEXT NOT NULL DEFAULT '注疏',
    "startPos" INTEGER NOT NULL,
    "endPos" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "dynasty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassicAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassicReadingNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER,
    "originalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicReadingNote_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "CommissionConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "rateA" DECIMAL(10,4) NOT NULL,
    "rateB" DECIMAL(10,4) NOT NULL,
    "rateC" DECIMAL(10,4),
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "alipayAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "payoutRef" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'DIRECT',
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualCoinAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "frozen" INTEGER NOT NULL DEFAULT 0,
    "totalRecharged" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualCoinAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualCoinFrozen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "scene" TEXT NOT NULL,
    "refId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FROZEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VirtualCoinFrozen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualCoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CoinTransType" NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "scene" "CoinScene" NOT NULL,
    "refId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualCoinTransaction_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "VirtualCoinRecharge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountRmb" DECIMAL(10,2) NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "payMethod" TEXT NOT NULL DEFAULT 'WECHAT',
    "orderNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualCoinRecharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaidQuestion" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "answererId" TEXT NOT NULL,
    "questionTitle" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answer" TEXT,
    "answerAudioUrl" TEXT,
    "priceCoin" INTEGER NOT NULL,
    "peekPriceCoin" INTEGER NOT NULL DEFAULT 0,
    "peekCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "timeoutHours" INTEGER NOT NULL DEFAULT 72,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stationId" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaidQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioCallRecord" (
    "id" TEXT NOT NULL,
    "stationId" TEXT,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "circleId" TEXT,
    "pricePerMinuteCoin" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalCoin" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "roomId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioCallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioCallBilling" (
    "id" TEXT NOT NULL,
    "callRecordId" TEXT NOT NULL,
    "billingMinute" INTEGER NOT NULL,
    "coinDeducted" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioCallBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "priceCoin" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'BASIC',
    "effectUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCoin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scene" "EarningScene" NOT NULL,
    "refId" TEXT NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "amountRmb" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "RecommendRule" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleValue" DOUBLE PRECISION,
    "position" INTEGER,
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "percentage" INTEGER NOT NULL DEFAULT 100,
    "targetUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ebook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "author" TEXT,
    "cover" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "categoryId" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "originalPrice" DECIMAL(10,2),
    "fileUrl" TEXT,
    "fileType" TEXT NOT NULL DEFAULT 'PDF',
    "fileSize" INTEGER,
    "totalChapters" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "hasWatermark" BOOLEAN NOT NULL DEFAULT true,
    "memberFree" BOOLEAN NOT NULL DEFAULT false,
    "status" "EbookStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "categoryLevel1" TEXT,
    "categoryLevel2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookChapter" (
    "id" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "content" TEXT,
    "contentEn" TEXT,
    "pageStart" INTEGER NOT NULL DEFAULT 0,
    "pageEnd" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "freeTrial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "page" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "content" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbookNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP(3),

    CONSTRAINT "EbookPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookReview" (
    "id" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reply" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookReadingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookReadingSession_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "warmupMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopePageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleItem" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "flashPrice" DECIMAL(10,2) NOT NULL,
    "limitCount" INTEGER NOT NULL DEFAULT 1,
    "stock" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBuy" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "groupPrice" DECIMAL(10,2) NOT NULL,
    "minMembers" INTEGER NOT NULL DEFAULT 2,
    "expireMinutes" INTEGER NOT NULL DEFAULT 1440,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopePageId" TEXT,
    "autoComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBuy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBuyParticipant" (
    "id" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBuyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "faceValue" DECIMAL(10,2) NOT NULL,
    "threshold" DECIMAL(10,2),
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "claimedCount" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "validDays" INTEGER NOT NULL DEFAULT 7,
    "applicableScope" JSONB,
    "aiPrecision" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopePageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRecord" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNUSED',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "CouponRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountActivity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "productIds" TEXT[],
    "courseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "circleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopePageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPage" (
    "id" TEXT NOT NULL,
    "stationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "entryConfig" JSONB,
    "entryVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPageComponent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "audience" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "pageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "pv" INTEGER NOT NULL DEFAULT 0,
    "uv" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'WARN',
    "title" TEXT NOT NULL,
    "detail" JSONB,
    "targetType" TEXT,
    "targetId" TEXT,
    "stationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudDetection" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "stationId" TEXT,
    "type" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBehaviorLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehaviorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppealRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppealRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceFingerprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "matchAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffCount" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxNo" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceUrl" TEXT,
    "expressNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "detail" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payMethod" TEXT NOT NULL,
    "accountInfo" JSONB NOT NULL,
    "accountInfoEnc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "level" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "payoutRef" TEXT,
    "transferBillNo" TEXT,
    "transferState" TEXT,
    "packageInfo" TEXT,
    "transferFailReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuifuConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuifuConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuifuSplitRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "huifuOrderId" TEXT,
    "outTradeNo" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "splitStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "receivers" JSONB,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "errorMsg" TEXT,
    "splitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuifuSplitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuifuSettlement" (
    "id" TEXT NOT NULL,
    "settleDate" TIMESTAMP(3) NOT NULL,
    "settleBatchId" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(12,2) NOT NULL,
    "detail" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuifuSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "apiKey" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "quotaTotal" INTEGER NOT NULL DEFAULT 10000,
    "quotaUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaResetCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "expireAt" TIMESTAMP(3),
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApiCall" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiType" TEXT NOT NULL,
    "endpoint" TEXT,
    "tokensUsed" INTEGER,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "ip" TEXT,
    "responseTime" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUsageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeAmount" INTEGER NOT NULL,
    "quotaBefore" INTEGER NOT NULL,
    "quotaAfter" INTEGER NOT NULL,
    "amountRmb" DECIMAL(10,2),
    "remark" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniAppConfig" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MAIN',
    "domain" TEXT,
    "h5Domain" TEXT,
    "pathMappings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "lastActiveAt" TIMESTAMP(3),
    "daysSinceActive" INTEGER NOT NULL DEFAULT 0,
    "churnFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurnPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionData" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "errorLog" TEXT,
    "executedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ChurnAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "scoreThreshold" DOUBLE PRECISION,
    "daysThreshold" INTEGER,
    "actionType" TEXT NOT NULL,
    "actionConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurnRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FortuneSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fortuneType" TEXT NOT NULL,
    "pushChannel" TEXT NOT NULL,
    "pushTime" TEXT NOT NULL DEFAULT '08:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FortuneSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FortuneRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fortuneType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fortuneContent" JSONB NOT NULL,
    "luckyDirection" TEXT,
    "luckyColor" TEXT,
    "luckyNumber" INTEGER,
    "advice" TEXT,
    "aiCost" DECIMAL(10,4),
    "sentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FortuneRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "basePrice" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "strategy" TEXT NOT NULL,
    "strategyConfig" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingDemand" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "viewCount24h" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount24h" INTEGER NOT NULL DEFAULT 0,
    "cartCount24h" INTEGER NOT NULL DEFAULT 0,
    "demandLevel" TEXT NOT NULL DEFAULT 'LOW',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountyQuestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bountyCoin" INTEGER NOT NULL,
    "bountyRmb" DECIMAL(10,2),
    "category" TEXT NOT NULL DEFAULT 'BAZI',
    "stationId" TEXT,
    "circleId" TEXT,
    "askerId" TEXT NOT NULL,
    "answererId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "answer" TEXT,
    "answerImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerAudioUrl" TEXT,
    "lockExpireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "BountyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountyReview" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BountyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContentConfig" (
    "id" TEXT NOT NULL,
    "pageRoute" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteNotice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigVersion" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "changedBy" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberConfig" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "coinBonus" INTEGER NOT NULL DEFAULT 0,
    "monthlyPoints" INTEGER NOT NULL DEFAULT 0,
    "monthlyCouponId" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "benefits" JSONB,
    "maxBorrowDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FIXED',
    "defaultFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conditionFree" JSONB,
    "regions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreightTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FullReductionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" DECIMAL(10,2) NOT NULL,
    "reduction" DECIMAL(10,2) NOT NULL,
    "giftProductId" TEXT,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopePageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FullReductionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopLogo" TEXT,
    "shopIntro" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "idCardNumber" TEXT NOT NULL,
    "idCardFront" TEXT,
    "idCardBack" TEXT,
    "businessLicense" TEXT,
    "brandAuth" TEXT,
    "merchantType" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "unifiedSocialCreditCode" TEXT,
    "registeredAddress" TEXT,
    "legalRepresentative" TEXT,
    "licenseValidFrom" TIMESTAMP(3),
    "licenseValidUntil" TIMESTAMP(3),
    "licenseLongTerm" BOOLEAN NOT NULL DEFAULT false,
    "qualificationFiles" JSONB,
    "qualificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "qualificationSubmittedAt" TIMESTAMP(3),
    "qualificationReviewedAt" TIMESTAMP(3),
    "qualificationNextReviewAt" TIMESTAMP(3),
    "qualificationRejectReason" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "riskFlags" JSONB,
    "privacyConsentAt" TIMESTAMP(3),
    "complianceDeclarationAt" TIMESTAMP(3),
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MerchantStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "depositAmount" DECIMAL(10,2),
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "rejectReason" TEXT,
    "commissionRate" DECIMAL(5,4),
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remark" TEXT,
    "creditScore" INTEGER NOT NULL DEFAULT 60,
    "creditGrade" TEXT NOT NULL DEFAULT 'B',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantSupplier" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "settlementTerms" TEXT,
    "leadTimeDays" INTEGER,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "totalPurchaseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastPurchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantSupplier_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MerchantViolation" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "ViolationSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "penalty" DECIMAL(10,2),
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB,
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "appeal" TEXT,
    "appealAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantDepositRecord" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payMethod" TEXT,
    "payTransactionId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantDepositRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_settlements" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "settlementAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantAgreement" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '商家入驻协议',
    "content" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantAgreement_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "CircleKnowledge" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "vectorJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "addedBy" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'circle',
    "qualityScore" DOUBLE PRECISION,
    "chunkIndex" INTEGER,
    "parentChunkId" TEXT,

    CONSTRAINT "CircleKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleKnowledgeManual" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleKnowledgeManual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleKnowledgeCandidate" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION,
    "similarToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleKnowledgeCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleKnowledgeDedupDecision" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "CircleKnowledgeDedupDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aliases" JSONB,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidence" TEXT,
    "knowledgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKnowledgeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topInterests" JSONB,
    "topEntities" JSONB,
    "difficultyLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKnowledgeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKnowledgeInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "queryText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserKnowledgeInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "executorType" TEXT,
    "executorId" TEXT,
    "snapshot" JSONB,
    "result" JSONB,
    "errorLog" TEXT,
    "rollbackData" JSONB,
    "rollbackUrl" TEXT,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTransferLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT,
    "toType" TEXT NOT NULL,
    "toId" TEXT,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsTask" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "executor" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "reviewReason" TEXT,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationPermission" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "AutomationRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRoleAssignee" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRoleAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'ARTICLE',
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "instituteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteContentPurchase" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteContentPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryReferralConfig" (
    "id" TEXT NOT NULL,
    "stationId" TEXT,
    "operatorId" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryReferralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionMaterial" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "GrowthValue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" TEXT,
    "changelog" TEXT,
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "downloadUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfterSale" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2),
    "logistics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AfterSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMemberGroup" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMemberGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMemberGroupRelation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMemberGroupRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagPromptTemplate" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BigScreenToken" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3) NOT NULL,
    "ipWhitelist" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BigScreenToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMinuteData" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "onlineCount" INTEGER NOT NULL DEFAULT 0,
    "gmw" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "giftAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMinuteData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeeRecord" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceAmount" DECIMAL(10,2) NOT NULL,
    "platformRate" DECIMAL(5,4) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "circleId" TEXT,
    "circleShare" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleRevenueRecord" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "ownerShare" DECIMAL(10,2) NOT NULL,
    "splitRate" DECIMAL(5,4) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleRevenueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleRevenueSplit" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "scene" TEXT NOT NULL DEFAULT 'ALL',
    "splitRate" DECIMAL(5,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleRevenueSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleGuestEarning" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "splitRate" DECIMAL(5,4) NOT NULL,
    "earned" DECIMAL(10,2) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleGuestEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleExpertBooking" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "expertUserId" TEXT NOT NULL,
    "bookerUserId" TEXT NOT NULL,
    "slotDate" TEXT NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "topic" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleExpertBooking_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PlatformKnowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "circleId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "embeddingJson" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "type" "CompetitionType" NOT NULL,
    "level" "CompetitionLevel" NOT NULL DEFAULT 'B',
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "descriptionEn" TEXT,
    "coverImage" TEXT,
    "rules" TEXT,
    "rulesEn" TEXT,
    "scoringModel" "ScoringModel" NOT NULL DEFAULT 'A',
    "maxParticipants" INTEGER NOT NULL DEFAULT 0,
    "entryFee" INTEGER NOT NULL DEFAULT 0,
    "isInviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "requireIdentity" BOOLEAN NOT NULL DEFAULT false,
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "organizerId" TEXT,
    "organizerType" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalPrize" INTEGER NOT NULL DEFAULT 0,
    "prizeType" "PrizeType" NOT NULL DEFAULT 'CASH',
    "prizeConfig" JSONB,
    "invitationShare" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT 'QUIZ',
    "stagesConfig" JSONB,
    "judgePanel" JSONB,
    "voteWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "prizes" JSONB,
    "shareCommitmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "CompetitionRound" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "type" "RoundType" NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
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

-- CreateTable
CREATE TABLE "CompetitionRegistration" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "inviterId" TEXT,
    "inviteCode" TEXT,
    "paidFee" INTEGER NOT NULL DEFAULT 0,
    "extraData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionQuestion" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "roundId" TEXT,
    "type" "QuestionType" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 10,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "stem" TEXT NOT NULL,
    "options" JSONB,
    "answer" JSONB NOT NULL DEFAULT '{}',
    "analysis" TEXT,
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionAnswer" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL DEFAULT '{}',
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "graderId" TEXT,
    "comment" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "CompetitionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionScore" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "CompetitionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRanking" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "prize" INTEGER NOT NULL DEFAULT 0,
    "prizeInfo" JSONB,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionInvitation" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "inviteeStatus" "RegistrationStatus",
    "rewardType" TEXT,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionInviteCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "regCount" INTEGER NOT NULL DEFAULT 0,
    "totalReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionArticle" (
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
CREATE TABLE "SpecialTeacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competitionWins" INTEGER NOT NULL DEFAULT 0,
    "featuredArticles" INTEGER NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'candidate',
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invitedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowseHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 1,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_memberLevel_idx" ON "User"("memberLevel");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE INDEX "User_attributionSource_attributionStationId_idx" ON "User"("attributionSource", "attributionStationId");

-- CreateIndex
CREATE INDEX "User_attributionStationId_idx" ON "User"("attributionStationId");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_openId_key" ON "Auth"("openId");

-- CreateIndex
CREATE INDEX "Auth_userId_provider_idx" ON "Auth"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyMigrationBatch_batchKey_key" ON "LegacyMigrationBatch"("batchKey");

-- CreateIndex
CREATE INDEX "LegacyMigrationBatch_sourceSystem_status_idx" ON "LegacyMigrationBatch"("sourceSystem", "status");

-- CreateIndex
CREATE INDEX "LegacyMigrationBatch_createdAt_idx" ON "LegacyMigrationBatch"("createdAt");

-- CreateIndex
CREATE INDEX "LegacyMigrationMap_batchId_entityType_idx" ON "LegacyMigrationMap"("batchId", "entityType");

-- CreateIndex
CREATE INDEX "LegacyMigrationMap_sourceSystem_entityType_targetId_idx" ON "LegacyMigrationMap"("sourceSystem", "entityType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyMigrationMap_sourceSystem_entityType_legacyId_key" ON "LegacyMigrationMap"("sourceSystem", "entityType", "legacyId");

-- CreateIndex
CREATE INDEX "UserRole_roleType_idx" ON "UserRole"("roleType");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleType_bindId_key" ON "UserRole"("userId", "roleType", "bindId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_roleType_idx" ON "RolePermission"("roleType");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleType_permissionId_key" ON "RolePermission"("roleType", "permissionId");

-- CreateIndex
CREATE INDEX "MemberPurchase_userId_idx" ON "MemberPurchase"("userId");

-- CreateIndex
CREATE INDEX "ReferralRelation_referrerId_idx" ON "ReferralRelation"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralRelation_userId_relationStatus_idx" ON "ReferralRelation"("userId", "relationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralRelation_userId_referrerId_key" ON "ReferralRelation"("userId", "referrerId");

-- CreateIndex
CREATE INDEX "Follow_followedUserId_idx" ON "Follow"("followedUserId");

-- CreateIndex
CREATE INDEX "Follow_userId_createdAt_idx" ON "Follow"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Follow_followedUserId_createdAt_idx" ON "Follow"("followedUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_followedUserId_key" ON "Follow"("userId", "followedUserId");

-- CreateIndex
CREATE INDEX "Blacklist_userId_idx" ON "Blacklist"("userId");

-- CreateIndex
CREATE INDEX "Blacklist_blockedUserId_idx" ON "Blacklist"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_userId_blockedUserId_key" ON "Blacklist"("userId", "blockedUserId");

-- CreateIndex
CREATE INDEX "LoginDevice_userId_isCurrent_idx" ON "LoginDevice"("userId", "isCurrent");

-- CreateIndex
CREATE INDEX "LoginDevice_userId_lastLogin_idx" ON "LoginDevice"("userId", "lastLogin");

-- CreateIndex
CREATE INDEX "Circle_ownerId_idx" ON "Circle"("ownerId");

-- CreateIndex
CREATE INDEX "Circle_status_idx" ON "Circle"("status");

-- CreateIndex
CREATE INDEX "Circle_status_memberCount_idx" ON "Circle"("status", "memberCount");

-- CreateIndex
CREATE INDEX "Circle_stationId_idx" ON "Circle"("stationId");

-- CreateIndex
CREATE INDEX "CirclePublishGrant_circleId_status_createdAt_idx" ON "CirclePublishGrant"("circleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CirclePublishGrant_applicantId_createdAt_idx" ON "CirclePublishGrant"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "CirclePublishGrant_status_createdAt_idx" ON "CirclePublishGrant"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");

-- CreateIndex
CREATE INDEX "CircleMember_userId_joinedAt_idx" ON "CircleMember"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleAnnouncement_circleId_isTop_createdAt_idx" ON "CircleAnnouncement"("circleId", "isTop", "createdAt");

-- CreateIndex
CREATE INDEX "CircleAnnouncement_userId_idx" ON "CircleAnnouncement"("userId");

-- CreateIndex
CREATE INDEX "CircleAnnouncementRead_announcementId_idx" ON "CircleAnnouncementRead"("announcementId");

-- CreateIndex
CREATE INDEX "CircleAnnouncementRead_userId_idx" ON "CircleAnnouncementRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleAnnouncementRead_announcementId_userId_key" ON "CircleAnnouncementRead"("announcementId", "userId");

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
CREATE UNIQUE INDEX "CircleInviteCode_code_key" ON "CircleInviteCode"("code");

-- CreateIndex
CREATE INDEX "CircleInviteCode_circleId_userId_idx" ON "CircleInviteCode"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleInviteCode_code_idx" ON "CircleInviteCode"("code");

-- CreateIndex
CREATE INDEX "CircleInvitation_circleId_inviterId_idx" ON "CircleInvitation"("circleId", "inviterId");

-- CreateIndex
CREATE INDEX "CircleInvitation_inviteCodeId_idx" ON "CircleInvitation"("inviteCodeId");

-- CreateIndex
CREATE INDEX "CircleInvitation_inviteeId_idx" ON "CircleInvitation"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleInvitation_circleId_inviteeId_key" ON "CircleInvitation"("circleId", "inviteeId");

-- CreateIndex
CREATE INDEX "Post_circleId_createdAt_idx" ON "Post"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_circleId_status_createdAt_idx" ON "Post"("circleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_circleId_isPushHome_auditStatus_createdAt_idx" ON "Post"("circleId", "isPushHome", "auditStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_isRecommended_auditStatus_createdAt_idx" ON "Post"("isRecommended", "auditStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Content_type_createdAt_idx" ON "Content"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Content_status_idx" ON "Content"("status");

-- CreateIndex
CREATE INDEX "Content_status_viewCount_idx" ON "Content"("status", "viewCount");

-- CreateIndex
CREATE INDEX "Content_status_likeCount_viewCount_idx" ON "Content"("status", "likeCount", "viewCount");

-- CreateIndex
CREATE INDEX "Content_stationId_idx" ON "Content"("stationId");

-- CreateIndex
CREATE INDEX "Content_categoryLevel1_status_idx" ON "Content"("categoryLevel1", "status");

-- CreateIndex
CREATE INDEX "Content_categoryLevel2_status_idx" ON "Content"("categoryLevel2", "status");

-- CreateIndex
CREATE INDEX "Article_circleId_createdAt_idx" ON "Article"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "Article_isPushHome_auditStatus_idx" ON "Article"("isPushHome", "auditStatus");

-- CreateIndex
CREATE INDEX "Article_userId_createdAt_idx" ON "Article"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Article_stationId_idx" ON "Article"("stationId");

-- CreateIndex
CREATE INDEX "Article_auditStatus_createdAt_idx" ON "Article"("auditStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Article_auditStatus_viewCount_idx" ON "Article"("auditStatus", "viewCount");

-- CreateIndex
CREATE INDEX "Article_circleId_auditStatus_createdAt_idx" ON "Article"("circleId", "auditStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleRecommend_articleId_idx" ON "ArticleRecommend"("articleId");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_contentType_contentId_idx" ON "ContentAuditRecord"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_submitterId_idx" ON "ContentAuditRecord"("submitterId");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_humanAuditorId_idx" ON "ContentAuditRecord"("humanAuditorId");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_finalStatus_idx" ON "ContentAuditRecord"("finalStatus");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_isRecommended_finalStatus_createdAt_idx" ON "ContentAuditRecord"("isRecommended", "finalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ContentAuditRecord_circleId_createdAt_idx" ON "ContentAuditRecord"("circleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAuditRecord_contentType_contentId_createdAt_key" ON "ContentAuditRecord"("contentType", "contentId", "createdAt");

-- CreateIndex
CREATE INDEX "Course_circleId_idx" ON "Course"("circleId");

-- CreateIndex
CREATE INDEX "Course_auditStatus_idx" ON "Course"("auditStatus");

-- CreateIndex
CREATE INDEX "Course_auditStatus_studentCount_idx" ON "Course"("auditStatus", "studentCount");

-- CreateIndex
CREATE INDEX "Course_userId_createdAt_idx" ON "Course"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Course_stationId_idx" ON "Course"("stationId");

-- CreateIndex
CREATE INDEX "Course_type_auditStatus_idx" ON "Course"("type", "auditStatus");

-- CreateIndex
CREATE INDEX "Course_circleId_auditStatus_createdAt_idx" ON "Course"("circleId", "auditStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Course_courseOrigin_idx" ON "Course"("courseOrigin");

-- CreateIndex
CREATE INDEX "CourseChapter_courseId_sortOrder_idx" ON "CourseChapter"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseProgress_userId_courseId_idx" ON "CourseProgress"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userId_chapterId_key" ON "CourseProgress"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "CourseWork_chapterId_userId_idx" ON "CourseWork"("chapterId", "userId");

-- CreateIndex
CREATE INDEX "CourseWork_courseId_idx" ON "CourseWork"("courseId");

-- CreateIndex
CREATE INDEX "CourseQa_courseId_status_idx" ON "CourseQa"("courseId", "status");

-- CreateIndex
CREATE INDEX "CourseQa_chapterId_idx" ON "CourseQa"("chapterId");

-- CreateIndex
CREATE INDEX "CourseQa_userId_idx" ON "CourseQa"("userId");

-- CreateIndex
CREATE INDEX "CourseBundle_type_target_idx" ON "CourseBundle"("type", "target");

-- CreateIndex
CREATE INDEX "CourseBundle_status_idx" ON "CourseBundle"("status");

-- CreateIndex
CREATE INDEX "CourseBundle_target_type_status_idx" ON "CourseBundle"("target", "type", "status");

-- CreateIndex
CREATE INDEX "CourseBundleItem_bundleId_sortOrder_idx" ON "CourseBundleItem"("bundleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBundleItem_bundleId_itemType_itemId_key" ON "CourseBundleItem"("bundleId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "StationBundleAccess_stationId_idx" ON "StationBundleAccess"("stationId");

-- CreateIndex
CREATE INDEX "StationBundleAccess_operatorId_idx" ON "StationBundleAccess"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "StationBundleAccess_bundleId_stationId_key" ON "StationBundleAccess"("bundleId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationBundleAccess_bundleId_operatorId_key" ON "StationBundleAccess"("bundleId", "operatorId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_status_salesCount_idx" ON "Product"("status", "salesCount");

-- CreateIndex
CREATE INDEX "Product_stationId_idx" ON "Product"("stationId");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_circleId_idx" ON "Product"("circleId");

-- CreateIndex
CREATE INDEX "Product_supplierType_status_idx" ON "Product"("supplierType", "status");

-- CreateIndex
CREATE INDEX "ProductSku_productId_idx" ON "ProductSku"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key" ON "InventoryMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryMovement_merchantId_createdAt_idx" ON "InventoryMovement"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_merchantId_productId_skuId_createdAt_idx" ON "InventoryMovement"("merchantId", "productId", "skuId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "InventoryAlertSetting_merchantId_enabled_idx" ON "InventoryAlertSetting"("merchantId", "enabled");

-- CreateIndex
CREATE INDEX "InventoryAlertSetting_productId_skuId_idx" ON "InventoryAlertSetting"("productId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAlertSetting_merchantId_stockKey_key" ON "InventoryAlertSetting"("merchantId", "stockKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orderNo_key" ON "PurchaseOrder"("orderNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_merchantId_status_createdAt_idx" ON "PurchaseOrder"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_merchantId_supplierName_idx" ON "PurchaseOrder"("merchantId", "supplierName");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_createdAt_idx" ON "PurchaseOrder"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_skuId_idx" ON "PurchaseOrderItem"("productId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_receiptNo_key" ON "PurchaseReceipt"("receiptNo");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_merchantId_receivedAt_idx" ON "PurchaseReceipt"("merchantId", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_purchaseOrderId_receivedAt_idx" ON "PurchaseReceipt"("purchaseOrderId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_merchantId_requestId_key" ON "PurchaseReceipt"("merchantId", "requestId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptItem_receiptId_idx" ON "PurchaseReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptItem_purchaseOrderItemId_idx" ON "PurchaseReceiptItem"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptItem_productId_skuId_idx" ON "PurchaseReceiptItem"("productId", "skuId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_referrerId_idx" ON "Order"("referrerId");

-- CreateIndex
CREATE INDEX "Order_tempReferrerId_idx" ON "Order"("tempReferrerId");

-- CreateIndex
CREATE INDEX "Order_type_status_idx" ON "Order"("type", "status");

-- CreateIndex
CREATE INDEX "Order_userId_type_targetId_status_idx" ON "Order"("userId", "type", "targetId", "status");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_type_idx" ON "Order"("type");

-- CreateIndex
CREATE INDEX "Order_userId_type_status_createdAt_idx" ON "Order"("userId", "type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_merchantId_status_idx" ON "Order"("merchantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_payTransactionId_key" ON "Order"("payTransactionId");

-- CreateIndex
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");

-- CreateIndex
CREATE INDEX "Coupon_validStart_validEnd_idx" ON "Coupon"("validStart", "validEnd");

-- CreateIndex
CREATE INDEX "UserCoupon_userId_used_idx" ON "UserCoupon"("userId", "used");

-- CreateIndex
CREATE INDEX "UserCoupon_couponId_idx" ON "UserCoupon"("couponId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");

-- CreateIndex
CREATE INDEX "CourseReview_courseId_createdAt_idx" ON "CourseReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseReview_userId_idx" ON "CourseReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCertification_userId_key" ON "TeacherCertification"("userId");

-- CreateIndex
CREATE INDEX "TeacherCertification_status_idx" ON "TeacherCertification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLogistics_orderId_key" ON "OrderLogistics"("orderId");

-- CreateIndex
CREATE INDEX "OrderLogistics_orderId_idx" ON "OrderLogistics"("orderId");

-- CreateIndex
CREATE INDEX "LiveRoom_userId_idx" ON "LiveRoom"("userId");

-- CreateIndex
CREATE INDEX "LiveRoom_status_idx" ON "LiveRoom"("status");

-- CreateIndex
CREATE INDEX "LiveRoom_status_viewCount_idx" ON "LiveRoom"("status", "viewCount");

-- CreateIndex
CREATE INDEX "LiveRoom_circleId_idx" ON "LiveRoom"("circleId");

-- CreateIndex
CREATE INDEX "LiveRoom_circleId_status_idx" ON "LiveRoom"("circleId", "status");

-- CreateIndex
CREATE INDEX "LiveRoom_courseId_idx" ON "LiveRoom"("courseId");

-- CreateIndex
CREATE INDEX "LiveRoom_stationId_idx" ON "LiveRoom"("stationId");

-- CreateIndex
CREATE INDEX "LiveRoom_status_startTime_idx" ON "LiveRoom"("status", "startTime");

-- CreateIndex
CREATE INDEX "LiveRoom_hostUserId_status_idx" ON "LiveRoom"("hostUserId", "status");

-- CreateIndex
CREATE INDEX "LiveWatchProgress_userId_lastWatchedAt_idx" ON "LiveWatchProgress"("userId", "lastWatchedAt");

-- CreateIndex
CREATE INDEX "LiveWatchProgress_liveRoomId_lastWatchedAt_idx" ON "LiveWatchProgress"("liveRoomId", "lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveWatchProgress_userId_liveRoomId_key" ON "LiveWatchProgress"("userId", "liveRoomId");

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
CREATE INDEX "LiveProduct_productId_idx" ON "LiveProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveProduct_liveId_productId_key" ON "LiveProduct"("liveId", "productId");

-- CreateIndex
CREATE INDEX "LiveMic_liveRoomId_idx" ON "LiveMic"("liveRoomId");

-- CreateIndex
CREATE INDEX "LiveMic_userId_idx" ON "LiveMic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMic_liveRoomId_position_key" ON "LiveMic"("liveRoomId", "position");

-- CreateIndex
CREATE INDEX "LiveSlide_liveRoomId_idx" ON "LiveSlide"("liveRoomId");

-- CreateIndex
CREATE INDEX "LiveMutedUser_liveRoomId_idx" ON "LiveMutedUser"("liveRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMutedUser_liveRoomId_userId_key" ON "LiveMutedUser"("liveRoomId", "userId");

-- CreateIndex
CREATE INDEX "LiveFlashSale_liveRoomId_status_idx" ON "LiveFlashSale"("liveRoomId", "status");

-- CreateIndex
CREATE INDEX "LiveFlashSale_productId_idx" ON "LiveFlashSale"("productId");

-- CreateIndex
CREATE INDEX "LiveAuditLog_liveRoomId_createdAt_idx" ON "LiveAuditLog"("liveRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");

-- CreateIndex
CREATE INDEX "Video_status_idx" ON "Video"("status");

-- CreateIndex
CREATE INDEX "Video_stationId_idx" ON "Video"("stationId");

-- CreateIndex
CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Video_circleId_status_createdAt_idx" ON "Video"("circleId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProduct_videoId_productId_key" ON "VideoProduct"("videoId", "productId");

-- CreateIndex
CREATE INDEX "BotConfig_status_type_idx" ON "BotConfig"("status", "type");

-- CreateIndex
CREATE INDEX "BotConfig_sortOrder_idx" ON "BotConfig"("sortOrder");

-- CreateIndex
CREATE INDEX "CircleBot_botConfigId_idx" ON "CircleBot"("botConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleBot_circleId_key" ON "CircleBot"("circleId");

-- CreateIndex
CREATE INDEX "BotKnowledgeBase_botConfigId_idx" ON "BotKnowledgeBase"("botConfigId");

-- CreateIndex
CREATE INDEX "BotChatLog_userId_createdAt_idx" ON "BotChatLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BotChatLog_botConfigId_idx" ON "BotChatLog"("botConfigId");

-- CreateIndex
CREATE INDEX "BotChatLog_conversationId_idx" ON "BotChatLog"("conversationId");

-- CreateIndex
CREATE INDEX "BotChatLog_createdAt_idx" ON "BotChatLog"("createdAt");

-- CreateIndex
CREATE INDEX "PaipanRecord_userId_createdAt_idx" ON "PaipanRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaipanRecord_userId_paipanType_createdAt_idx" ON "PaipanRecord"("userId", "paipanType", "createdAt");

-- CreateIndex
CREATE INDEX "PaipanRecord_createdAt_idx" ON "PaipanRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PaipanRecord_paipanType_idx" ON "PaipanRecord"("paipanType");

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
CREATE INDEX "BaziKnowledge_category_idx" ON "BaziKnowledge"("category");

-- CreateIndex
CREATE INDEX "BaziKnowledge_status_idx" ON "BaziKnowledge"("status");

-- CreateIndex
CREATE INDEX "BaziKnowledge_createdAt_idx" ON "BaziKnowledge"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaziKnowledge_title_category_key" ON "BaziKnowledge"("title", "category");

-- CreateIndex
CREATE INDEX "ZiweiKnowledge_category_idx" ON "ZiweiKnowledge"("category");

-- CreateIndex
CREATE INDEX "ZiweiKnowledge_status_idx" ON "ZiweiKnowledge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ZiweiKnowledge_title_category_key" ON "ZiweiKnowledge"("title", "category");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_userId_analyzeType_createdAt_idx" ON "AiAnalysisRecord"("userId", "analyzeType", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_createdAt_idx" ON "AiAnalysisRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_scene_createdAt_idx" ON "AiAnalysisRecord"("scene", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_modelUsed_createdAt_idx" ON "AiAnalysisRecord"("modelUsed", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_paipanRecordId_idx" ON "AiAnalysisRecord"("paipanRecordId");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_paipanRecordId_school_idx" ON "AiAnalysisRecord"("paipanRecordId", "school");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysisRecord_userId_paipanRecordId_analyzeType_school_key" ON "AiAnalysisRecord"("userId", "paipanRecordId", "analyzeType", "school");

-- CreateIndex
CREATE INDEX "AiCacheEntry_scene_queryHash_idx" ON "AiCacheEntry"("scene", "queryHash");

-- CreateIndex
CREATE INDEX "AiCacheEntry_scene_expiresAt_idx" ON "AiCacheEntry"("scene", "expiresAt");

-- CreateIndex
CREATE INDEX "AiCacheEntry_hitCount_idx" ON "AiCacheEntry"("hitCount");

-- CreateIndex
CREATE INDEX "AiEvent_type_createdAt_idx" ON "AiEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AiEvent_source_createdAt_idx" ON "AiEvent"("source", "createdAt");

-- CreateIndex
CREATE INDEX "AiEvent_severity_createdAt_idx" ON "AiEvent"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "AiEvent_status_createdAt_idx" ON "AiEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiEvent_createdAt_idx" ON "AiEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiCapability_name_key" ON "AiCapability"("name");

-- CreateIndex
CREATE INDEX "AiCapability_scene_idx" ON "AiCapability"("scene");

-- CreateIndex
CREATE INDEX "AiCapability_capabilityType_idx" ON "AiCapability"("capabilityType");

-- CreateIndex
CREATE INDEX "AiCapability_status_idx" ON "AiCapability"("status");

-- CreateIndex
CREATE INDEX "AiCapability_provider_idx" ON "AiCapability"("provider");

-- CreateIndex
CREATE INDEX "AiDecision_agentId_createdAt_idx" ON "AiDecision"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecision_capabilityId_createdAt_idx" ON "AiDecision"("capabilityId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecision_riskLevel_createdAt_idx" ON "AiDecision"("riskLevel", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecision_humanAction_createdAt_idx" ON "AiDecision"("humanAction", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecision_createdAt_idx" ON "AiDecision"("createdAt");

-- CreateIndex
CREATE INDEX "AiCollaboration_status_createdAt_idx" ON "AiCollaboration"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiCollaboration_riskLevel_status_idx" ON "AiCollaboration"("riskLevel", "status");

-- CreateIndex
CREATE INDEX "AiCollaboration_type_createdAt_idx" ON "AiCollaboration"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AiCollaboration_proposedBy_createdAt_idx" ON "AiCollaboration"("proposedBy", "createdAt");

-- CreateIndex
CREATE INDEX "AiCollaboration_createdAt_idx" ON "AiCollaboration"("createdAt");

-- CreateIndex
CREATE INDEX "ToolRecord_userId_createdAt_idx" ON "ToolRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolRecord_userId_toolId_createdAt_idx" ON "ToolRecord"("userId", "toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolRecord_toolId_createdAt_idx" ON "ToolRecord"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolRecord_stationId_createdAt_idx" ON "ToolRecord"("stationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ToolFavorite_userId_toolId_key" ON "ToolFavorite"("userId", "toolId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolShare_shareToken_key" ON "ToolShare"("shareToken");

-- CreateIndex
CREATE INDEX "ToolShare_shareToken_idx" ON "ToolShare"("shareToken");

-- CreateIndex
CREATE INDEX "ToolShare_toolRecordId_idx" ON "ToolShare"("toolRecordId");

-- CreateIndex
CREATE INDEX "ToolShare_userId_idx" ON "ToolShare"("userId");

-- CreateIndex
CREATE INDEX "ToolPayRecord_userId_toolId_idx" ON "ToolPayRecord"("userId", "toolId");

-- CreateIndex
CREATE INDEX "ToolPayRecord_orderId_idx" ON "ToolPayRecord"("orderId");

-- CreateIndex
CREATE INDEX "ToolPayRecord_toolRecordId_idx" ON "ToolPayRecord"("toolRecordId");

-- CreateIndex
CREATE INDEX "StationToolConfig_stationId_idx" ON "StationToolConfig"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationToolConfig_stationId_toolId_key" ON "StationToolConfig"("stationId", "toolId");

-- CreateIndex
CREATE INDEX "QualityScoreRecord_scene_createdAt_idx" ON "QualityScoreRecord"("scene", "createdAt");

-- CreateIndex
CREATE INDEX "QualityScoreRecord_overall_idx" ON "QualityScoreRecord"("overall");

-- CreateIndex
CREATE INDEX "QualityScoreRecord_createdAt_idx" ON "QualityScoreRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Station_userId_key" ON "Station"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE INDEX "Station_code_idx" ON "Station"("code");

-- CreateIndex
CREATE INDEX "Station_operatorId_idx" ON "Station"("operatorId");

-- CreateIndex
CREATE INDEX "StationPick_stationId_sortOrder_idx" ON "StationPick"("stationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StationPick_stationId_contentType_contentId_key" ON "StationPick"("stationId", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "StationPinnedContent_stationId_board_idx" ON "StationPinnedContent"("stationId", "board");

-- CreateIndex
CREATE INDEX "StationPinnedContent_board_contentType_contentId_idx" ON "StationPinnedContent"("board", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "StationPinnedContent_stationId_board_slotIndex_key" ON "StationPinnedContent"("stationId", "board", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_userId_key" ON "Operator"("userId");

-- CreateIndex
CREATE INDEX "Operator_parentOperatorId_idx" ON "Operator"("parentOperatorId");

-- CreateIndex
CREATE INDEX "StationEarning_stationId_createdAt_idx" ON "StationEarning"("stationId", "createdAt");

-- CreateIndex
CREATE INDEX "StationEarning_orderId_idx" ON "StationEarning"("orderId");

-- CreateIndex
CREATE INDEX "OperatorEarning_operatorId_createdAt_idx" ON "OperatorEarning"("operatorId", "createdAt");

-- CreateIndex
CREATE INDEX "OperatorEarning_orderId_idx" ON "OperatorEarning"("orderId");

-- CreateIndex
CREATE INDEX "TeamTask_operatorId_status_idx" ON "TeamTask"("operatorId", "status");

-- CreateIndex
CREATE INDEX "TeamTask_status_deadline_idx" ON "TeamTask"("status", "deadline");

-- CreateIndex
CREATE INDEX "TeamTaskProgress_stationMasterId_idx" ON "TeamTaskProgress"("stationMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamTaskProgress_taskId_stationMasterId_key" ON "TeamTaskProgress"("taskId", "stationMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "StationOffline_ownerUserId_key" ON "StationOffline"("ownerUserId");

-- CreateIndex
CREATE INDEX "OfflineCourse_stationId_startTime_idx" ON "OfflineCourse"("stationId", "startTime");

-- CreateIndex
CREATE INDEX "OfflineCourse_auditStatus_idx" ON "OfflineCourse"("auditStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCourseReview_registrationId_key" ON "OfflineCourseReview"("registrationId");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_courseId_createdAt_idx" ON "OfflineCourseReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_stationId_idx" ON "OfflineCourseReview"("stationId");

-- CreateIndex
CREATE INDEX "OfflineCourseReview_userId_idx" ON "OfflineCourseReview"("userId");

-- CreateIndex
CREATE INDEX "OfflineCourseRegistration_userId_idx" ON "OfflineCourseRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCourseRegistration_courseId_userId_key" ON "OfflineCourseRegistration"("courseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCourseRegistration_courseId_verifyCode_key" ON "OfflineCourseRegistration"("courseId", "verifyCode");

-- CreateIndex
CREATE INDEX "StationEvent_stationId_startTime_idx" ON "StationEvent"("stationId", "startTime");

-- CreateIndex
CREATE INDEX "StationEvent_status_startTime_idx" ON "StationEvent"("status", "startTime");

-- CreateIndex
CREATE INDEX "StationEventRegistration_userId_idx" ON "StationEventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StationEventRegistration_eventId_userId_key" ON "StationEventRegistration"("eventId", "userId");

-- CreateIndex
CREATE INDEX "StationProduct_stationId_idx" ON "StationProduct"("stationId");

-- CreateIndex
CREATE INDEX "StationOrder_stationId_idx" ON "StationOrder"("stationId");

-- CreateIndex
CREATE INDEX "StationTeacher_stationId_idx" ON "StationTeacher"("stationId");

-- CreateIndex
CREATE INDEX "StationTeacher_sourceUserId_idx" ON "StationTeacher"("sourceUserId");

-- CreateIndex
CREATE INDEX "StationTeacherBooking_stationId_idx" ON "StationTeacherBooking"("stationId");

-- CreateIndex
CREATE INDEX "StationTeacherBooking_teacherId_idx" ON "StationTeacherBooking"("teacherId");

-- CreateIndex
CREATE INDEX "StationSettlement_stationId_period_idx" ON "StationSettlement"("stationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_circleId_key" ON "Institute"("circleId");

-- CreateIndex
CREATE INDEX "Institute_adminUserId_idx" ON "Institute"("adminUserId");

-- CreateIndex
CREATE INDEX "Institute_status_idx" ON "Institute"("status");

-- CreateIndex
CREATE INDEX "InstituteCourse_instituteId_startTime_idx" ON "InstituteCourse"("instituteId", "startTime");

-- CreateIndex
CREATE INDEX "InstituteCourse_teacherId_idx" ON "InstituteCourse"("teacherId");

-- CreateIndex
CREATE INDEX "InstituteCourseRegistration_userId_idx" ON "InstituteCourseRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteCourseRegistration_courseId_userId_key" ON "InstituteCourseRegistration"("courseId", "userId");

-- CreateIndex
CREATE INDEX "InstituteMember_userId_idx" ON "InstituteMember"("userId");

-- CreateIndex
CREATE INDEX "InstituteMember_role_status_idx" ON "InstituteMember"("role", "status");

-- CreateIndex
CREATE INDEX "InstituteMember_joinYear_idx" ON "InstituteMember"("joinYear");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteMember_instituteId_userId_key" ON "InstituteMember"("instituteId", "userId");

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
CREATE INDEX "InstituteTask_memberId_status_idx" ON "InstituteTask"("memberId", "status");

-- CreateIndex
CREATE INDEX "InstituteTaskTemplate_taskType_periodUnit_idx" ON "InstituteTaskTemplate"("taskType", "periodUnit");

-- CreateIndex
CREATE INDEX "InstituteTaskTemplate_status_idx" ON "InstituteTaskTemplate"("status");

-- CreateIndex
CREATE INDEX "InstituteEvent_scheduleAt_idx" ON "InstituteEvent"("scheduleAt");

-- CreateIndex
CREATE INDEX "InstituteEvent_lecturerId_idx" ON "InstituteEvent"("lecturerId");

-- CreateIndex
CREATE INDEX "InstituteEvent_type_status_idx" ON "InstituteEvent"("type", "status");

-- CreateIndex
CREATE INDEX "InstituteRevenue_instituteId_createdAt_idx" ON "InstituteRevenue"("instituteId", "createdAt");

-- CreateIndex
CREATE INDEX "InstituteRevenue_sourceType_idx" ON "InstituteRevenue"("sourceType");

-- CreateIndex
CREATE INDEX "InstituteDividend_instituteId_period_idx" ON "InstituteDividend"("instituteId", "period");

-- CreateIndex
CREATE INDEX "InstituteDividend_userId_idx" ON "InstituteDividend"("userId");

-- CreateIndex
CREATE INDEX "InstituteDividend_type_idx" ON "InstituteDividend"("type");

-- CreateIndex
CREATE INDEX "StationTeacherRequest_stationId_status_idx" ON "StationTeacherRequest"("stationId", "status");

-- CreateIndex
CREATE INDEX "StationTeacherRequest_teacherId_idx" ON "StationTeacherRequest"("teacherId");

-- CreateIndex
CREATE INDEX "StationTeacherRequest_status_idx" ON "StationTeacherRequest"("status");

-- CreateIndex
CREATE INDEX "RenewalRecord_userId_targetType_idx" ON "RenewalRecord"("userId", "targetType");

-- CreateIndex
CREATE INDEX "RenewalRecord_targetType_targetId_idx" ON "RenewalRecord"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "RenewalRecord_createdAt_idx" ON "RenewalRecord"("createdAt");

-- CreateIndex
CREATE INDEX "Like_targetType_targetId_idx" ON "Like"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Like_targetType_createdAt_idx" ON "Like"("targetType", "createdAt");

-- CreateIndex
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_targetType_targetId_key" ON "Like"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_createdAt_idx" ON "Comment"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_parentId_status_createdAt_idx" ON "Comment"("targetType", "targetId", "parentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");

-- CreateIndex
CREATE INDEX "Collect_userId_createdAt_idx" ON "Collect"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Collect_targetType_targetId_idx" ON "Collect"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Collect_targetType_createdAt_idx" ON "Collect"("targetType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collect_userId_targetType_targetId_key" ON "Collect"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_reporterId_createdAt_idx" ON "Report"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_type_createdAt_idx" ON "Feedback"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_phone_createdAt_idx" ON "SmsLog"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_status_createdAt_idx" ON "SmsLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_createdAt_idx" ON "SmsLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_executor_createdAt_idx" ON "AuditLog"("executor", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

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
CREATE UNIQUE INDEX "ConfigSystem_configKey_key" ON "ConfigSystem"("configKey");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_category_createdAt_idx" ON "Notification"("userId", "category", "createdAt");

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
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_createdAt_idx" ON "SearchHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_keyword_idx" ON "SearchHistory"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "SearchWeight_entityType_fieldName_key" ON "SearchWeight"("entityType", "fieldName");

-- CreateIndex
CREATE INDEX "ClassicBook_category_idx" ON "ClassicBook"("category");

-- CreateIndex
CREATE INDEX "ClassicBook_status_idx" ON "ClassicBook"("status");

-- CreateIndex
CREATE INDEX "ClassicBook_status_viewCount_idx" ON "ClassicBook"("status", "viewCount");

-- CreateIndex
CREATE INDEX "ClassicBook_title_idx" ON "ClassicBook"("title");

-- CreateIndex
CREATE INDEX "ClassicChapter_bookId_sortOrder_idx" ON "ClassicChapter"("bookId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClassicCommentary_bookId_idx" ON "ClassicCommentary"("bookId");

-- CreateIndex
CREATE INDEX "ClassicCommentary_chapterId_idx" ON "ClassicCommentary"("chapterId");

-- CreateIndex
CREATE INDEX "ClassicCommentary_type_idx" ON "ClassicCommentary"("type");

-- CreateIndex
CREATE INDEX "ClassicCommentary_school_idx" ON "ClassicCommentary"("school");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicCommentary_bookId_chapterId_author_title_key" ON "ClassicCommentary"("bookId", "chapterId", "author", "title");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_idx" ON "ReadingProgress"("userId");

-- CreateIndex
CREATE INDEX "ReadingProgress_chapterId_idx" ON "ReadingProgress"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_bookId_key" ON "ReadingProgress"("userId", "bookId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_bookId_idx" ON "Bookmark"("userId", "bookId");

-- CreateIndex
CREATE INDEX "Bookmark_chapterId_idx" ON "Bookmark"("chapterId");

-- CreateIndex
CREATE INDEX "ClassicImage_bookId_idx" ON "ClassicImage"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicImage_bookId_pageNumber_key" ON "ClassicImage"("bookId", "pageNumber");

-- CreateIndex
CREATE INDEX "ClassicOcrText_imageId_pageNumber_idx" ON "ClassicOcrText"("imageId", "pageNumber");

-- CreateIndex
CREATE INDEX "ClassicOcrText_imageId_lineNumber_charIndex_idx" ON "ClassicOcrText"("imageId", "lineNumber", "charIndex");

-- CreateIndex
CREATE INDEX "ClassicAnnotation_bookId_idx" ON "ClassicAnnotation"("bookId");

-- CreateIndex
CREATE INDEX "ClassicAnnotation_chapterId_idx" ON "ClassicAnnotation"("chapterId");

-- CreateIndex
CREATE INDEX "ClassicAnnotation_bookId_startPos_idx" ON "ClassicAnnotation"("bookId", "startPos");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_idx" ON "ClassicReadingNote"("userId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_bookId_idx" ON "ClassicReadingNote"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_chapterId_idx" ON "ClassicReadingNote"("chapterId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_chapterId_position_idx" ON "ClassicReadingNote"("userId", "chapterId", "position");

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
CREATE UNIQUE INDEX "CommissionConfig_configKey_key" ON "CommissionConfig"("configKey");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_payoutRef_key" ON "Withdrawal"("payoutRef");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Withdrawal_stationId_idx" ON "Withdrawal"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "ReferralLink_userId_createdAt_idx" ON "ReferralLink"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralLink_code_idx" ON "ReferralLink"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCoinAccount_userId_key" ON "VirtualCoinAccount"("userId");

-- CreateIndex
CREATE INDEX "VirtualCoinFrozen_userId_status_idx" ON "VirtualCoinFrozen"("userId", "status");

-- CreateIndex
CREATE INDEX "VirtualCoinFrozen_refId_idx" ON "VirtualCoinFrozen"("refId");

-- CreateIndex
CREATE INDEX "VirtualCoinTransaction_userId_createdAt_idx" ON "VirtualCoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VirtualCoinTransaction_refId_idx" ON "VirtualCoinTransaction"("refId");

-- CreateIndex
CREATE INDEX "VirtualCoinTransaction_userId_type_createdAt_idx" ON "VirtualCoinTransaction"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCreatorWithdrawal_userId_createdAt_idx" ON "VideoCreatorWithdrawal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCreatorWithdrawal_status_createdAt_idx" ON "VideoCreatorWithdrawal"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCoinRecharge_orderNo_key" ON "VirtualCoinRecharge"("orderNo");

-- CreateIndex
CREATE INDEX "VirtualCoinRecharge_userId_createdAt_idx" ON "VirtualCoinRecharge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VirtualCoinRecharge_orderNo_idx" ON "VirtualCoinRecharge"("orderNo");

-- CreateIndex
CREATE INDEX "PaidQuestion_circleId_status_idx" ON "PaidQuestion"("circleId", "status");

-- CreateIndex
CREATE INDEX "PaidQuestion_askerId_idx" ON "PaidQuestion"("askerId");

-- CreateIndex
CREATE INDEX "PaidQuestion_answererId_idx" ON "PaidQuestion"("answererId");

-- CreateIndex
CREATE INDEX "PaidQuestion_stationId_idx" ON "PaidQuestion"("stationId");

-- CreateIndex
CREATE INDEX "AudioCallRecord_callerId_createdAt_idx" ON "AudioCallRecord"("callerId", "createdAt");

-- CreateIndex
CREATE INDEX "AudioCallRecord_calleeId_idx" ON "AudioCallRecord"("calleeId");

-- CreateIndex
CREATE INDEX "AudioCallRecord_status_idx" ON "AudioCallRecord"("status");

-- CreateIndex
CREATE INDEX "AudioCallRecord_stationId_idx" ON "AudioCallRecord"("stationId");

-- CreateIndex
CREATE INDEX "AudioCallBilling_callRecordId_idx" ON "AudioCallBilling"("callRecordId");

-- CreateIndex
CREATE INDEX "GiftRecord_liveRoomId_createdAt_idx" ON "GiftRecord"("liveRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftRecord_userId_idx" ON "GiftRecord"("userId");

-- CreateIndex
CREATE INDEX "GiftRecord_giftId_idx" ON "GiftRecord"("giftId");

-- CreateIndex
CREATE INDEX "GiftRecord_toUserId_idx" ON "GiftRecord"("toUserId");

-- CreateIndex
CREATE INDEX "UserEarning_userId_createdAt_idx" ON "UserEarning"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserEarning_refId_idx" ON "UserEarning"("refId");

-- CreateIndex
CREATE INDEX "UserBehavior_userId_behavior_createdAt_idx" ON "UserBehavior"("userId", "behavior", "createdAt");

-- CreateIndex
CREATE INDEX "idx_user_target" ON "UserBehavior"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "UserBehavior_targetType_targetId_idx" ON "UserBehavior"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UserBehavior_userId_createdAt_idx" ON "UserBehavior"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehavior_createdAt_idx" ON "UserBehavior"("createdAt");

-- CreateIndex
CREATE INDEX "UserInterest_userId_score_idx" ON "UserInterest"("userId", "score");

-- CreateIndex
CREATE INDEX "UserInterest_tag_score_idx" ON "UserInterest"("tag", "score");

-- CreateIndex
CREATE INDEX "UserInterest_tag_idx" ON "UserInterest"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_tag_key" ON "UserInterest"("userId", "tag");

-- CreateIndex
CREATE INDEX "RecommendRule_scene_targetType_targetId_idx" ON "RecommendRule"("scene", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "RecommendRule_scene_ruleType_idx" ON "RecommendRule"("scene", "ruleType");

-- CreateIndex
CREATE INDEX "RecommendRule_ruleType_priority_idx" ON "RecommendRule"("ruleType", "priority");

-- CreateIndex
CREATE INDEX "RecommendLog_userId_createdAt_idx" ON "RecommendLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendLog_scene_createdAt_idx" ON "RecommendLog"("scene", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendLog_recommendId_idx" ON "RecommendLog"("recommendId");

-- CreateIndex
CREATE INDEX "RecommendLog_strategy_idx" ON "RecommendLog"("strategy");

-- CreateIndex
CREATE INDEX "WebhookSubscription_event_isActive_idx" ON "WebhookSubscription"("event", "isActive");

-- CreateIndex
CREATE INDEX "WebhookSubscription_url_idx" ON "WebhookSubscription"("url");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_subscriptionId_createdAt_idx" ON "WebhookDelivery"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_subscriptionId_eventKey_key" ON "WebhookDelivery"("subscriptionId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EbookCategory_name_key" ON "EbookCategory"("name");

-- CreateIndex
CREATE INDEX "Ebook_categoryId_idx" ON "Ebook"("categoryId");

-- CreateIndex
CREATE INDEX "Ebook_status_idx" ON "Ebook"("status");

-- CreateIndex
CREATE INDEX "EbookChapter_ebookId_sortOrder_idx" ON "EbookChapter"("ebookId", "sortOrder");

-- CreateIndex
CREATE INDEX "EbookProgress_userId_idx" ON "EbookProgress"("userId");

-- CreateIndex
CREATE INDEX "EbookProgress_chapterId_idx" ON "EbookProgress"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "EbookProgress_userId_ebookId_key" ON "EbookProgress"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookBookmark_userId_ebookId_idx" ON "EbookBookmark"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookBookmark_chapterId_idx" ON "EbookBookmark"("chapterId");

-- CreateIndex
CREATE INDEX "EbookNote_userId_ebookId_idx" ON "EbookNote"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookNote_ebookId_idx" ON "EbookNote"("ebookId");

-- CreateIndex
CREATE INDEX "EbookNote_chapterId_idx" ON "EbookNote"("chapterId");

-- CreateIndex
CREATE INDEX "EbookPurchase_userId_idx" ON "EbookPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EbookPurchase_userId_ebookId_key" ON "EbookPurchase"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookReview_ebookId_createdAt_idx" ON "EbookReview"("ebookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EbookReview_userId_ebookId_key" ON "EbookReview"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookReadingSession_userId_date_idx" ON "EbookReadingSession"("userId", "date");

-- CreateIndex
CREATE INDEX "EbookReadingSession_ebookId_idx" ON "EbookReadingSession"("ebookId");

-- CreateIndex
CREATE UNIQUE INDEX "EbookReadingSession_userId_ebookId_date_key" ON "EbookReadingSession"("userId", "ebookId", "date");

-- CreateIndex
CREATE INDEX "EbookFavorite_userId_idx" ON "EbookFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EbookFavorite_userId_ebookId_key" ON "EbookFavorite"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "OperationLog_userId_createdAt_idx" ON "OperationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_action_createdAt_idx" ON "OperationLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_createdAt_idx" ON "OperationLog"("createdAt");

-- CreateIndex
CREATE INDEX "FlashSale_status_startTime_idx" ON "FlashSale"("status", "startTime");

-- CreateIndex
CREATE INDEX "FlashSale_scope_scopePageId_idx" ON "FlashSale"("scope", "scopePageId");

-- CreateIndex
CREATE INDEX "FlashSaleItem_flashSaleId_idx" ON "FlashSaleItem"("flashSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_productId_key" ON "FlashSaleItem"("flashSaleId", "productId");

-- CreateIndex
CREATE INDEX "GroupBuy_status_idx" ON "GroupBuy"("status");

-- CreateIndex
CREATE INDEX "GroupBuy_scope_scopePageId_idx" ON "GroupBuy"("scope", "scopePageId");

-- CreateIndex
CREATE INDEX "GroupBuyParticipant_groupId_idx" ON "GroupBuyParticipant"("groupId");

-- CreateIndex
CREATE INDEX "GroupBuyParticipant_userId_idx" ON "GroupBuyParticipant"("userId");

-- CreateIndex
CREATE INDEX "GroupBuyParticipant_groupBuyId_idx" ON "GroupBuyParticipant"("groupBuyId");

-- CreateIndex
CREATE INDEX "CouponTemplate_status_endTime_idx" ON "CouponTemplate"("status", "endTime");

-- CreateIndex
CREATE INDEX "CouponRecord_userId_idx" ON "CouponRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRecord_couponId_userId_status_key" ON "CouponRecord"("couponId", "userId", "status");

-- CreateIndex
CREATE INDEX "DiscountActivity_status_startTime_idx" ON "DiscountActivity"("status", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPage_route_key" ON "MarketingPage"("route");

-- CreateIndex
CREATE INDEX "MarketingPage_stationId_idx" ON "MarketingPage"("stationId");

-- CreateIndex
CREATE INDEX "MarketingPageComponent_pageId_sortOrder_idx" ON "MarketingPageComponent"("pageId", "sortOrder");

-- CreateIndex
CREATE INDEX "Activity_status_startTime_idx" ON "Activity"("status", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityMetrics_activityId_key" ON "ActivityMetrics"("activityId");

-- CreateIndex
CREATE INDEX "RiskRule_type_enabled_idx" ON "RiskRule"("type", "enabled");

-- CreateIndex
CREATE INDEX "RiskAlert_status_level_createdAt_idx" ON "RiskAlert"("status", "level", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAlert_type_createdAt_idx" ON "RiskAlert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAlert_stationId_status_idx" ON "RiskAlert"("stationId", "status");

-- CreateIndex
CREATE INDEX "FraudDetection_status_createdAt_idx" ON "FraudDetection"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FraudDetection_userId_idx" ON "FraudDetection"("userId");

-- CreateIndex
CREATE INDEX "FraudDetection_stationId_status_idx" ON "FraudDetection"("stationId", "status");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_userId_createdAt_idx" ON "UserBehaviorLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_action_createdAt_idx" ON "UserBehaviorLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_deviceId_idx" ON "UserBehaviorLog"("deviceId");

-- CreateIndex
CREATE INDEX "AppealRecord_userId_status_idx" ON "AppealRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "AppealRecord_status_createdAt_idx" ON "AppealRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceFingerprint_deviceId_idx" ON "DeviceFingerprint"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceFingerprint_userId_deviceId_key" ON "DeviceFingerprint"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_source_billDate_idx" ON "ReconciliationRecord"("source", "billDate");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_status_idx" ON "ReconciliationRecord"("status");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "SettlementOrder_userId_period_idx" ON "SettlementOrder"("userId", "period");

-- CreateIndex
CREATE INDEX "SettlementOrder_status_idx" ON "SettlementOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalApplication_payoutRef_key" ON "WithdrawalApplication"("payoutRef");

-- CreateIndex
CREATE INDEX "WithdrawalApplication_userId_status_idx" ON "WithdrawalApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "WithdrawalApplication_status_createdAt_idx" ON "WithdrawalApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialReport_type_period_key" ON "FinancialReport"("type", "period");

-- CreateIndex
CREATE UNIQUE INDEX "HuifuConfig_key_key" ON "HuifuConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "HuifuSplitRecord_orderId_key" ON "HuifuSplitRecord"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "HuifuSplitRecord_outTradeNo_key" ON "HuifuSplitRecord"("outTradeNo");

-- CreateIndex
CREATE INDEX "HuifuSplitRecord_orderId_idx" ON "HuifuSplitRecord"("orderId");

-- CreateIndex
CREATE INDEX "HuifuSplitRecord_outTradeNo_idx" ON "HuifuSplitRecord"("outTradeNo");

-- CreateIndex
CREATE INDEX "HuifuSplitRecord_splitStatus_idx" ON "HuifuSplitRecord"("splitStatus");

-- CreateIndex
CREATE UNIQUE INDEX "HuifuSettlement_settleBatchId_key" ON "HuifuSettlement"("settleBatchId");

-- CreateIndex
CREATE INDEX "HuifuSettlement_settleDate_idx" ON "HuifuSettlement"("settleDate");

-- CreateIndex
CREATE INDEX "HuifuSettlement_status_idx" ON "HuifuSettlement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_apiKey_key" ON "Tenant"("apiKey");

-- CreateIndex
CREATE INDEX "Tenant_apiKey_idx" ON "Tenant"("apiKey");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "TenantApiCall_tenantId_createdAt_idx" ON "TenantApiCall"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantApiCall_apiType_createdAt_idx" ON "TenantApiCall"("apiType", "createdAt");

-- CreateIndex
CREATE INDEX "TenantUsageRecord_tenantId_createdAt_idx" ON "TenantUsageRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MiniAppConfig_appId_key" ON "MiniAppConfig"("appId");

-- CreateIndex
CREATE INDEX "MiniAppConfig_type_isActive_idx" ON "MiniAppConfig"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChurnPrediction_userId_key" ON "ChurnPrediction"("userId");

-- CreateIndex
CREATE INDEX "ChurnPrediction_riskLevel_idx" ON "ChurnPrediction"("riskLevel");

-- CreateIndex
CREATE INDEX "ChurnPrediction_activityScore_idx" ON "ChurnPrediction"("activityScore");

-- CreateIndex
CREATE INDEX "ChurnAction_userId_createdAt_idx" ON "ChurnAction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChurnAction_status_idx" ON "ChurnAction"("status");

-- CreateIndex
CREATE INDEX "ChurnRule_riskLevel_isActive_idx" ON "ChurnRule"("riskLevel", "isActive");

-- CreateIndex
CREATE INDEX "FortuneSubscription_userId_idx" ON "FortuneSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FortuneSubscription_userId_fortuneType_pushChannel_key" ON "FortuneSubscription"("userId", "fortuneType", "pushChannel");

-- CreateIndex
CREATE INDEX "FortuneRecord_userId_fortuneType_idx" ON "FortuneRecord"("userId", "fortuneType");

-- CreateIndex
CREATE UNIQUE INDEX "FortuneRecord_userId_fortuneType_period_key" ON "FortuneRecord"("userId", "fortuneType", "period");

-- CreateIndex
CREATE INDEX "PricingRule_targetType_isActive_idx" ON "PricingRule"("targetType", "isActive");

-- CreateIndex
CREATE INDEX "PricingDemand_targetType_targetId_recordedAt_idx" ON "PricingDemand"("targetType", "targetId", "recordedAt");

-- CreateIndex
CREATE INDEX "BountyQuestion_askerId_createdAt_idx" ON "BountyQuestion"("askerId", "createdAt");

-- CreateIndex
CREATE INDEX "BountyQuestion_answererId_idx" ON "BountyQuestion"("answererId");

-- CreateIndex
CREATE INDEX "BountyQuestion_status_createdAt_idx" ON "BountyQuestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BountyQuestion_category_status_idx" ON "BountyQuestion"("category", "status");

-- CreateIndex
CREATE INDEX "BountyQuestion_stationId_idx" ON "BountyQuestion"("stationId");

-- CreateIndex
CREATE INDEX "BountyReview_questionId_idx" ON "BountyReview"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PageContentConfig_pageRoute_fieldKey_key" ON "PageContentConfig"("pageRoute", "fieldKey");

-- CreateIndex
CREATE INDEX "SiteNotice_isActive_idx" ON "SiteNotice"("isActive");

-- CreateIndex
CREATE INDEX "ConfigVersion_configKey_version_idx" ON "ConfigVersion"("configKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MemberConfig_level_key" ON "MemberConfig"("level");

-- CreateIndex
CREATE INDEX "FullReductionRule_status_startTime_endTime_idx" ON "FullReductionRule"("status", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_userId_key" ON "Merchant"("userId");

-- CreateIndex
CREATE INDEX "Merchant_status_idx" ON "Merchant"("status");

-- CreateIndex
CREATE INDEX "Merchant_status_createdAt_idx" ON "Merchant"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Merchant_qualificationStatus_qualificationNextReviewAt_idx" ON "Merchant"("qualificationStatus", "qualificationNextReviewAt");

-- CreateIndex
CREATE INDEX "Merchant_riskLevel_idx" ON "Merchant"("riskLevel");

-- CreateIndex
CREATE INDEX "Merchant_shopName_idx" ON "Merchant"("shopName");

-- CreateIndex
CREATE INDEX "MerchantSupplier_merchantId_status_updatedAt_idx" ON "MerchantSupplier"("merchantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "MerchantSupplier_merchantId_lastPurchasedAt_idx" ON "MerchantSupplier"("merchantId", "lastPurchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantSupplier_merchantId_name_key" ON "MerchantSupplier"("merchantId", "name");

-- CreateIndex
CREATE INDEX "MerchantQualificationReview_merchantId_createdAt_idx" ON "MerchantQualificationReview"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantQualificationReview_status_createdAt_idx" ON "MerchantQualificationReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantMember_userId_status_idx" ON "MerchantMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantMember_merchantId_userId_key" ON "MerchantMember"("merchantId", "userId");

-- CreateIndex
CREATE INDEX "MerchantViolation_merchantId_idx" ON "MerchantViolation"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantViolation_status_idx" ON "MerchantViolation"("status");

-- CreateIndex
CREATE INDEX "MerchantViolation_merchantId_status_idx" ON "MerchantViolation"("merchantId", "status");

-- CreateIndex
CREATE INDEX "MerchantDepositRecord_merchantId_idx" ON "MerchantDepositRecord"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_settlements_merchantId_idx" ON "merchant_settlements"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_settlements_merchantId_status_idx" ON "merchant_settlements"("merchantId", "status");

-- CreateIndex
CREATE INDEX "merchant_settlements_createdAt_idx" ON "merchant_settlements"("createdAt");

-- CreateIndex
CREATE INDEX "MerchantAgreement_merchantId_idx" ON "MerchantAgreement"("merchantId");

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
CREATE INDEX "CircleKnowledge_circleId_status_idx" ON "CircleKnowledge"("circleId", "status");

-- CreateIndex
CREATE INDEX "CircleKnowledge_circleId_sourceType_idx" ON "CircleKnowledge"("circleId", "sourceType");

-- CreateIndex
CREATE INDEX "CircleKnowledge_scope_status_idx" ON "CircleKnowledge"("scope", "status");

-- CreateIndex
CREATE INDEX "CircleKnowledge_qualityScore_idx" ON "CircleKnowledge"("qualityScore");

-- CreateIndex
CREATE UNIQUE INDEX "CircleKnowledge_contentHash_circleId_key" ON "CircleKnowledge"("contentHash", "circleId");

-- CreateIndex
CREATE INDEX "CircleKnowledgeManual_circleId_createdAt_idx" ON "CircleKnowledgeManual"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleKnowledgeCandidate_circleId_status_idx" ON "CircleKnowledgeCandidate"("circleId", "status");

-- CreateIndex
CREATE INDEX "CircleKnowledgeDedupDecision_candidateId_idx" ON "CircleKnowledgeDedupDecision"("candidateId");

-- CreateIndex
CREATE INDEX "CircleKnowledgeDedupDecision_decidedAt_idx" ON "CircleKnowledgeDedupDecision"("decidedAt");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_type_idx" ON "KnowledgeEntity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEntity_name_type_key" ON "KnowledgeEntity"("name", "type");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_fromId_idx" ON "KnowledgeEdge"("fromId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_toId_idx" ON "KnowledgeEdge"("toId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_knowledgeId_idx" ON "KnowledgeEdge"("knowledgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserKnowledgeProfile_userId_key" ON "UserKnowledgeProfile"("userId");

-- CreateIndex
CREATE INDEX "UserKnowledgeProfile_userId_idx" ON "UserKnowledgeProfile"("userId");

-- CreateIndex
CREATE INDEX "UserKnowledgeInteraction_userId_createdAt_idx" ON "UserKnowledgeInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserKnowledgeInteraction_knowledgeId_idx" ON "UserKnowledgeInteraction"("knowledgeId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_executorType_status_idx" ON "Task"("executorType", "status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE INDEX "TaskTransferLog_taskId_idx" ON "TaskTransferLog"("taskId");

-- CreateIndex
CREATE INDEX "TaskTransferLog_createdAt_idx" ON "TaskTransferLog"("createdAt");

-- CreateIndex
CREATE INDEX "OpsTask_status_priority_idx" ON "OpsTask"("status", "priority");

-- CreateIndex
CREATE INDEX "OpsTask_type_status_idx" ON "OpsTask"("type", "status");

-- CreateIndex
CREATE INDEX "OpsTask_createdAt_idx" ON "OpsTask"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationPermission_resource_action_key" ON "AutomationPermission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRole_name_key" ON "AutomationRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRolePermission_roleId_permissionId_key" ON "AutomationRolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "AutomationRoleAssignee_userId_idx" ON "AutomationRoleAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRoleAssignee_roleId_userId_key" ON "AutomationRoleAssignee"("roleId", "userId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_level_sortOrder_idx" ON "Category"("level", "sortOrder");

-- CreateIndex
CREATE INDEX "InstituteContent_instituteId_idx" ON "InstituteContent"("instituteId");

-- CreateIndex
CREATE INDEX "InstituteContent_authorId_idx" ON "InstituteContent"("authorId");

-- CreateIndex
CREATE INDEX "InstituteContent_status_idx" ON "InstituteContent"("status");

-- CreateIndex
CREATE INDEX "InstituteContentPurchase_contentId_idx" ON "InstituteContentPurchase"("contentId");

-- CreateIndex
CREATE INDEX "InstituteContentPurchase_userId_idx" ON "InstituteContentPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteContentPurchase_contentId_userId_key" ON "InstituteContentPurchase"("contentId", "userId");

-- CreateIndex
CREATE INDEX "TemporaryReferralConfig_validFrom_validTo_idx" ON "TemporaryReferralConfig"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "TemporaryReferralConfig_stationId_idx" ON "TemporaryReferralConfig"("stationId");

-- CreateIndex
CREATE INDEX "ShippingAddress_userId_idx" ON "ShippingAddress"("userId");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE INDEX "PromotionMaterial_stationId_type_idx" ON "PromotionMaterial"("stationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserPoints_userId_key" ON "UserPoints"("userId");

-- CreateIndex
CREATE INDEX "PointsRecord_userId_createdAt_idx" ON "PointsRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsProduct_status_sortOrder_idx" ON "PointsProduct"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "PointsExchangeRecord_userId_createdAt_idx" ON "PointsExchangeRecord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthValue_userId_key" ON "GrowthValue"("userId");

-- CreateIndex
CREATE INDEX "GrowthRecord_userId_createdAt_idx" ON "GrowthRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalDocument_type_status_idx" ON "LegalDocument"("type", "status");

-- CreateIndex
CREATE INDEX "AppVersion_platform_publishedAt_idx" ON "AppVersion"("platform", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTag_name_key" ON "TopicTag"("name");

-- CreateIndex
CREATE INDEX "TopicTag_postCount_idx" ON "TopicTag"("postCount");

-- CreateIndex
CREATE INDEX "AfterSale_userId_idx" ON "AfterSale"("userId");

-- CreateIndex
CREATE INDEX "AfterSale_orderId_idx" ON "AfterSale"("orderId");

-- CreateIndex
CREATE INDEX "AfterSale_status_idx" ON "AfterSale"("status");

-- CreateIndex
CREATE INDEX "AfterSale_userId_status_idx" ON "AfterSale"("userId", "status");

-- CreateIndex
CREATE INDEX "CircleMemberGroup_circleId_idx" ON "CircleMemberGroup"("circleId");

-- CreateIndex
CREATE INDEX "CircleMemberGroupRelation_userId_idx" ON "CircleMemberGroupRelation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMemberGroupRelation_groupId_userId_key" ON "CircleMemberGroupRelation"("groupId", "userId");

-- CreateIndex
CREATE INDEX "RagPromptTemplate_scene_idx" ON "RagPromptTemplate"("scene");

-- CreateIndex
CREATE INDEX "RagPromptTemplate_status_idx" ON "RagPromptTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BigScreenToken_token_key" ON "BigScreenToken"("token");

-- CreateIndex
CREATE INDEX "BigScreenToken_token_idx" ON "BigScreenToken"("token");

-- CreateIndex
CREATE INDEX "BigScreenToken_status_idx" ON "BigScreenToken"("status");

-- CreateIndex
CREATE INDEX "BigScreenToken_validTo_idx" ON "BigScreenToken"("validTo");

-- CreateIndex
CREATE INDEX "LiveMinuteData_roomId_idx" ON "LiveMinuteData"("roomId");

-- CreateIndex
CREATE INDEX "LiveMinuteData_roomId_minute_idx" ON "LiveMinuteData"("roomId", "minute");

-- CreateIndex
CREATE INDEX "LiveMinuteData_minute_idx" ON "LiveMinuteData"("minute");

-- CreateIndex
CREATE INDEX "PlatformFeeRecord_type_idx" ON "PlatformFeeRecord"("type");

-- CreateIndex
CREATE INDEX "PlatformFeeRecord_circleId_idx" ON "PlatformFeeRecord"("circleId");

-- CreateIndex
CREATE INDEX "PlatformFeeRecord_createdAt_idx" ON "PlatformFeeRecord"("createdAt");

-- CreateIndex
CREATE INDEX "CircleRevenueRecord_circleId_createdAt_idx" ON "CircleRevenueRecord"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleRevenueRecord_settled_idx" ON "CircleRevenueRecord"("settled");

-- CreateIndex
CREATE INDEX "CircleRevenueRecord_type_idx" ON "CircleRevenueRecord"("type");

-- CreateIndex
CREATE INDEX "CircleRevenueSplit_circleId_idx" ON "CircleRevenueSplit"("circleId");

-- CreateIndex
CREATE INDEX "CircleRevenueSplit_guestId_idx" ON "CircleRevenueSplit"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleRevenueSplit_circleId_guestId_scene_key" ON "CircleRevenueSplit"("circleId", "guestId", "scene");

-- CreateIndex
CREATE INDEX "CircleGuestEarning_circleId_createdAt_idx" ON "CircleGuestEarning"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CircleGuestEarning_guestId_settled_idx" ON "CircleGuestEarning"("guestId", "settled");

-- CreateIndex
CREATE INDEX "CircleGuestEarning_scene_idx" ON "CircleGuestEarning"("scene");

-- CreateIndex
CREATE INDEX "CircleGuestEarning_sourceId_idx" ON "CircleGuestEarning"("sourceId");

-- CreateIndex
CREATE INDEX "CircleExpertBooking_expertUserId_slotDate_idx" ON "CircleExpertBooking"("expertUserId", "slotDate");

-- CreateIndex
CREATE INDEX "CircleExpertBooking_bookerUserId_idx" ON "CircleExpertBooking"("bookerUserId");

-- CreateIndex
CREATE INDEX "CircleExpertBooking_circleId_status_idx" ON "CircleExpertBooking"("circleId", "status");

-- CreateIndex
CREATE INDEX "CircleEvent_circleId_date_idx" ON "CircleEvent"("circleId", "date");

-- CreateIndex
CREATE INDEX "PlatformKnowledge_sourceType_idx" ON "PlatformKnowledge"("sourceType");

-- CreateIndex
CREATE INDEX "PlatformKnowledge_sourceType_sourceId_idx" ON "PlatformKnowledge"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PlatformKnowledge_category_idx" ON "PlatformKnowledge"("category");

-- CreateIndex
CREATE INDEX "PlatformKnowledge_qualityScore_idx" ON "PlatformKnowledge"("qualityScore");

-- CreateIndex
CREATE INDEX "PlatformKnowledge_createdAt_idx" ON "PlatformKnowledge"("createdAt");

-- CreateIndex
CREATE INDEX "Competition_type_idx" ON "Competition"("type");

-- CreateIndex
CREATE INDEX "Competition_status_idx" ON "Competition"("status");

-- CreateIndex
CREATE INDEX "Competition_level_idx" ON "Competition"("level");

-- CreateIndex
CREATE INDEX "Competition_organizerId_idx" ON "Competition"("organizerId");

-- CreateIndex
CREATE INDEX "Competition_createdAt_idx" ON "Competition"("createdAt");

-- CreateIndex
CREATE INDEX "CompetitionStage_competitionId_status_idx" ON "CompetitionStage"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionStage_status_startAt_idx" ON "CompetitionStage"("status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionStage_competitionId_seq_key" ON "CompetitionStage"("competitionId", "seq");

-- CreateIndex
CREATE INDEX "CompetitionRound_competitionId_sortOrder_idx" ON "CompetitionRound"("competitionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CompetitionRegistration_competitionId_status_idx" ON "CompetitionRegistration"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionRegistration_inviterId_idx" ON "CompetitionRegistration"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRegistration_competitionId_userId_key" ON "CompetitionRegistration"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "CompetitionQuestion_competitionId_idx" ON "CompetitionQuestion"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionQuestion_roundId_idx" ON "CompetitionQuestion"("roundId");

-- CreateIndex
CREATE INDEX "CompetitionQuestion_type_idx" ON "CompetitionQuestion"("type");

-- CreateIndex
CREATE INDEX "CompetitionQuestion_difficulty_idx" ON "CompetitionQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "CompetitionAnswer_roundId_registrationId_idx" ON "CompetitionAnswer"("roundId", "registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAnswer_registrationId_questionId_key" ON "CompetitionAnswer"("registrationId", "questionId");

-- CreateIndex
CREATE INDEX "CompetitionScore_registrationId_idx" ON "CompetitionScore"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionScore_registrationId_roundId_key" ON "CompetitionScore"("registrationId", "roundId");

-- CreateIndex
CREATE INDEX "CompetitionRanking_competitionId_rank_idx" ON "CompetitionRanking"("competitionId", "rank");

-- CreateIndex
CREATE INDEX "CompetitionRanking_userId_idx" ON "CompetitionRanking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRanking_competitionId_userId_roundId_key" ON "CompetitionRanking"("competitionId", "userId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionInvitation_inviteCode_key" ON "CompetitionInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "CompetitionInvitation_competitionId_inviterId_idx" ON "CompetitionInvitation"("competitionId", "inviterId");

-- CreateIndex
CREATE INDEX "CompetitionInvitation_inviteCode_idx" ON "CompetitionInvitation"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionInvitation_competitionId_inviteeId_key" ON "CompetitionInvitation"("competitionId", "inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionInviteCode_userId_key" ON "CompetitionInviteCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionInviteCode_code_key" ON "CompetitionInviteCode"("code");

-- CreateIndex
CREATE INDEX "CompetitionInviteCode_code_idx" ON "CompetitionInviteCode"("code");

-- CreateIndex
CREATE INDEX "CompetitionArticle_competitionId_idx" ON "CompetitionArticle"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionArticle_isFeatured_idx" ON "CompetitionArticle"("isFeatured");

-- CreateIndex
CREATE INDEX "CompetitionArticle_qualityRating_idx" ON "CompetitionArticle"("qualityRating");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTalent_userId_key" ON "CompetitionTalent"("userId");

-- CreateIndex
CREATE INDEX "CompetitionTalent_talentScore_idx" ON "CompetitionTalent"("talentScore");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialTeacher_userId_key" ON "SpecialTeacher"("userId");

-- CreateIndex
CREATE INDEX "SpecialTeacher_level_idx" ON "SpecialTeacher"("level");

-- CreateIndex
CREATE INDEX "SpecialTeacher_totalScore_idx" ON "SpecialTeacher"("totalScore");

-- CreateIndex
CREATE INDEX "BrowseHistory_userId_createdAt_idx" ON "BrowseHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BrowseHistory_userId_targetType_createdAt_idx" ON "BrowseHistory"("userId", "targetType", "createdAt");

-- CreateIndex
CREATE INDEX "CheckIn_userId_checkInDate_idx" ON "CheckIn"("userId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_checkInDate_key" ON "CheckIn"("userId", "checkInDate");

-- CreateIndex
CREATE INDEX "DailyTask_userId_taskDate_idx" ON "DailyTask"("userId", "taskDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTask_userId_taskType_taskDate_key" ON "DailyTask"("userId", "taskType", "taskDate");

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

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_competitionInviteCodeId_fkey" FOREIGN KEY ("competitionInviteCodeId") REFERENCES "CompetitionInviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auth" ADD CONSTRAINT "Auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyMigrationMap" ADD CONSTRAINT "LegacyMigrationMap_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LegacyMigrationBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPurchase" ADD CONSTRAINT "MemberPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRelation" ADD CONSTRAINT "ReferralRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRelation" ADD CONSTRAINT "ReferralRelation_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedUserId_fkey" FOREIGN KEY ("followedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginDevice" ADD CONSTRAINT "LoginDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePublishGrant" ADD CONSTRAINT "CirclePublishGrant_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePublishGrant" ADD CONSTRAINT "CirclePublishGrant_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirclePublishGrant" ADD CONSTRAINT "CirclePublishGrant_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleAnnouncement" ADD CONSTRAINT "CircleAnnouncement_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleAnnouncement" ADD CONSTRAINT "CircleAnnouncement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInviteCode" ADD CONSTRAINT "CircleInviteCode_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInviteCode" ADD CONSTRAINT "CircleInviteCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInvitation" ADD CONSTRAINT "CircleInvitation_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInvitation" ADD CONSTRAINT "CircleInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInvitation" ADD CONSTRAINT "CircleInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInvitation" ADD CONSTRAINT "CircleInvitation_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "CircleInviteCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRecommend" ADD CONSTRAINT "ArticleRecommend_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseChapter" ADD CONSTRAINT "CourseChapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseWork" ADD CONSTRAINT "CourseWork_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseWork" ADD CONSTRAINT "CourseWork_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseWork" ADD CONSTRAINT "CourseWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBundleItem" ADD CONSTRAINT "CourseBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationBundleAccess" ADD CONSTRAINT "StationBundleAccess_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "MerchantSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCertification" ADD CONSTRAINT "TeacherCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveWatchProgress" ADD CONSTRAINT "LiveWatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveWatchProgress" ADD CONSTRAINT "LiveWatchProgress_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProduct" ADD CONSTRAINT "LiveProduct_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMic" ADD CONSTRAINT "LiveMic_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSlide" ADD CONSTRAINT "LiveSlide_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMutedUser" ADD CONSTRAINT "LiveMutedUser_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveFlashSale" ADD CONSTRAINT "LiveFlashSale_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveAuditLog" ADD CONSTRAINT "LiveAuditLog_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProduct" ADD CONSTRAINT "VideoProduct_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleBot" ADD CONSTRAINT "CircleBot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleBot" ADD CONSTRAINT "CircleBot_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotKnowledgeBase" ADD CONSTRAINT "BotKnowledgeBase_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaipanRecord" ADD CONSTRAINT "PaipanRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleChart" ADD CONSTRAINT "CoupleChart_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleChart" ADD CONSTRAINT "CoupleChart_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalysisRecord" ADD CONSTRAINT "AiAnalysisRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalysisRecord" ADD CONSTRAINT "AiAnalysisRecord_paipanRecordId_fkey" FOREIGN KEY ("paipanRecordId") REFERENCES "PaipanRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolRecord" ADD CONSTRAINT "ToolRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolRecord" ADD CONSTRAINT "ToolRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolFavorite" ADD CONSTRAINT "ToolFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolShare" ADD CONSTRAINT "ToolShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolPayRecord" ADD CONSTRAINT "ToolPayRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolPayRecord" ADD CONSTRAINT "ToolPayRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationToolConfig" ADD CONSTRAINT "StationToolConfig_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationPick" ADD CONSTRAINT "StationPick_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationPinnedContent" ADD CONSTRAINT "StationPinnedContent_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_parentOperatorId_fkey" FOREIGN KEY ("parentOperatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationEarning" ADD CONSTRAINT "StationEarning_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorEarning" ADD CONSTRAINT "OperatorEarning_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_stationMasterId_fkey" FOREIGN KEY ("stationMasterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationOffline" ADD CONSTRAINT "StationOffline_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineCourse" ADD CONSTRAINT "OfflineCourse_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineCourseReview" ADD CONSTRAINT "OfflineCourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "OfflineCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineCourseRegistration" ADD CONSTRAINT "OfflineCourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "OfflineCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationEvent" ADD CONSTRAINT "StationEvent_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationEventRegistration" ADD CONSTRAINT "StationEventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "StationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationProduct" ADD CONSTRAINT "StationProduct_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationOrder" ADD CONSTRAINT "StationOrder_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTeacher" ADD CONSTRAINT "StationTeacher_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTeacherBooking" ADD CONSTRAINT "StationTeacherBooking_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTeacherBooking" ADD CONSTRAINT "StationTeacherBooking_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "StationTeacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationSettlement" ADD CONSTRAINT "StationSettlement_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institute" ADD CONSTRAINT "Institute_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institute" ADD CONSTRAINT "Institute_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteCourse" ADD CONSTRAINT "InstituteCourse_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteCourseRegistration" ADD CONSTRAINT "InstituteCourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "InstituteCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMember" ADD CONSTRAINT "InstituteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMember" ADD CONSTRAINT "InstituteMember_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteBoardGroup" ADD CONSTRAINT "InstituteBoardGroup_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteBoardGroup" ADD CONSTRAINT "InstituteBoardGroup_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteSharePoint" ADD CONSTRAINT "InstituteSharePoint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "InstituteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteTask" ADD CONSTRAINT "InstituteTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "InstituteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteEvent" ADD CONSTRAINT "InstituteEvent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteRevenue" ADD CONSTRAINT "InstituteRevenue_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteDividend" ADD CONSTRAINT "InstituteDividend_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteDividend" ADD CONSTRAINT "InstituteDividend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationTeacherRequest" ADD CONSTRAINT "StationTeacherRequest_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalRecord" ADD CONSTRAINT "RenewalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collect" ADD CONSTRAINT "Collect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicChapter" ADD CONSTRAINT "ClassicChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicCommentary" ADD CONSTRAINT "ClassicCommentary_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicCommentary" ADD CONSTRAINT "ClassicCommentary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicImage" ADD CONSTRAINT "ClassicImage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicOcrText" ADD CONSTRAINT "ClassicOcrText_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ClassicImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicAnnotation" ADD CONSTRAINT "ClassicAnnotation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicAnnotation" ADD CONSTRAINT "ClassicAnnotation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualCoinAccount" ADD CONSTRAINT "VirtualCoinAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualCoinTransaction" ADD CONSTRAINT "VirtualCoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualCoinRecharge" ADD CONSTRAINT "VirtualCoinRecharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_answererId_fkey" FOREIGN KEY ("answererId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "AudioCallRecord_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "AudioCallRecord_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "AudioCallRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioCallBilling" ADD CONSTRAINT "AudioCallBilling_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "AudioCallRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ebook" ADD CONSTRAINT "Ebook_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EbookCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookChapter" ADD CONSTRAINT "EbookChapter_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookProgress" ADD CONSTRAINT "EbookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookProgress" ADD CONSTRAINT "EbookProgress_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookProgress" ADD CONSTRAINT "EbookProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "EbookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookBookmark" ADD CONSTRAINT "EbookBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookBookmark" ADD CONSTRAINT "EbookBookmark_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookBookmark" ADD CONSTRAINT "EbookBookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "EbookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookNote" ADD CONSTRAINT "EbookNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookNote" ADD CONSTRAINT "EbookNote_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookNote" ADD CONSTRAINT "EbookNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "EbookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookPurchase" ADD CONSTRAINT "EbookPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookPurchase" ADD CONSTRAINT "EbookPurchase_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReview" ADD CONSTRAINT "EbookReview_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReview" ADD CONSTRAINT "EbookReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReadingSession" ADD CONSTRAINT "EbookReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReadingSession" ADD CONSTRAINT "EbookReadingSession_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "GroupBuy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRecord" ADD CONSTRAINT "CouponRecord_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CouponTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPage" ADD CONSTRAINT "MarketingPage_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPageComponent" ADD CONSTRAINT "MarketingPageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "MarketingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMetrics" ADD CONSTRAINT "ActivityMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApiCall" ADD CONSTRAINT "TenantApiCall_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUsageRecord" ADD CONSTRAINT "TenantUsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountyQuestion" ADD CONSTRAINT "BountyQuestion_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantSupplier" ADD CONSTRAINT "MerchantSupplier_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantQualificationReview" ADD CONSTRAINT "MerchantQualificationReview_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantMember" ADD CONSTRAINT "MerchantMember_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantViolation" ADD CONSTRAINT "MerchantViolation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDepositRecord" ADD CONSTRAINT "MerchantDepositRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAgreement" ADD CONSTRAINT "MerchantAgreement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleKnowledge" ADD CONSTRAINT "CircleKnowledge_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleKnowledgeDedupDecision" ADD CONSTRAINT "CircleKnowledgeDedupDecision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CircleKnowledgeCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTransferLog" ADD CONSTRAINT "TaskTransferLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRolePermission" ADD CONSTRAINT "AutomationRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AutomationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRolePermission" ADD CONSTRAINT "AutomationRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AutomationPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRoleAssignee" ADD CONSTRAINT "AutomationRoleAssignee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AutomationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteContentPurchase" ADD CONSTRAINT "InstituteContentPurchase_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "InstituteContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsExchangeRecord" ADD CONSTRAINT "PointsExchangeRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PointsProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMemberGroupRelation" ADD CONSTRAINT "CircleMemberGroupRelation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CircleMemberGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleRevenueRecord" ADD CONSTRAINT "CircleRevenueRecord_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleRevenueSplit" ADD CONSTRAINT "CircleRevenueSplit_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleGuestEarning" ADD CONSTRAINT "CircleGuestEarning_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleEvent" ADD CONSTRAINT "CircleEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionStage" ADD CONSTRAINT "CompetitionStage_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRound" ADD CONSTRAINT "CompetitionRound_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "CompetitionRegistration_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionQuestion" ADD CONSTRAINT "CompetitionQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CompetitionRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "CompetitionRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAnswer" ADD CONSTRAINT "CompetitionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CompetitionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionScore" ADD CONSTRAINT "CompetitionScore_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CompetitionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionScore" ADD CONSTRAINT "CompetitionScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRanking" ADD CONSTRAINT "CompetitionRanking_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRanking" ADD CONSTRAINT "CompetitionRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionInvitation" ADD CONSTRAINT "CompetitionInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionArticle" ADD CONSTRAINT "CompetitionArticle_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionArticle" ADD CONSTRAINT "CompetitionArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTalent" ADD CONSTRAINT "CompetitionTalent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialTeacher" ADD CONSTRAINT "SpecialTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowseHistory" ADD CONSTRAINT "BrowseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
