-- ============================================================
-- 业务逻辑对齐迁移：研究院实体 / 内容审核链路 / 圈主嘉宾分账
-- ============================================================

-- 1. 扩展角色枚举
ALTER TYPE "RoleType" ADD VALUE 'INSTITUTE_ADMIN';

-- 2. User 增加首次登录来源追踪
ALTER TABLE "User" ADD COLUMN "attributionSource"    TEXT    NOT NULL DEFAULT 'PLATFORM';
ALTER TABLE "User" ADD COLUMN "attributionStationId"  TEXT;

CREATE INDEX "User_attributionSource_attributionStationId_idx"
    ON "User" ("attributionSource", "attributionStationId");
CREATE INDEX "User_attributionStationId_idx"
    ON "User" ("attributionStationId");

ALTER TABLE "User" ADD CONSTRAINT "User_attributionStationId_fkey"
    FOREIGN KEY ("attributionStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Post 增加推首页和审核字段
ALTER TABLE "Post" ADD COLUMN "isPushHome"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "auditStatus"   TEXT    NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Post" ADD COLUMN "auditReason"   TEXT;
ALTER TABLE "Post" ADD COLUMN "isRecommended" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Post_circleId_isPushHome_auditStatus_createdAt_idx"
    ON "Post" ("circleId", "isPushHome", "auditStatus", "createdAt");
CREATE INDEX "Post_isRecommended_auditStatus_createdAt_idx"
    ON "Post" ("isRecommended", "auditStatus", "createdAt");

-- 3. 研究院实体
CREATE TABLE "Institute" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "intro"        TEXT,
    "logo"         TEXT,
    "circleId"     TEXT,
    "adminUserId"  TEXT NOT NULL,
    "contactName"  TEXT,
    "contactPhone" TEXT,
    "legalEntity"  TEXT,
    "status"       TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Institute_circleId_key" ON "Institute"("circleId");
CREATE INDEX "Institute_adminUserId_idx"     ON "Institute"("adminUserId");
CREATE INDEX "Institute_status_idx"          ON "Institute"("status");

ALTER TABLE "Institute" ADD CONSTRAINT "Institute_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Institute" ADD CONSTRAINT "Institute_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. 研究院线下课程
CREATE TABLE "InstituteCourse" (
    "id"           TEXT NOT NULL,
    "instituteId"  TEXT NOT NULL,
    "teacherId"    TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "cover"        TEXT,
    "intro"        TEXT,
    "price"        DECIMAL(10,2) NOT NULL DEFAULT 0,
    "teacherShare" DECIMAL(5,4)  NOT NULL DEFAULT 0,
    "maxStudents"  INTEGER       NOT NULL DEFAULT 20,
    "location"     TEXT,
    "startTime"    TIMESTAMP(3) NOT NULL,
    "endTime"      TIMESTAMP(3) NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteCourse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstituteCourse_instituteId_startTime_idx" ON "InstituteCourse"("instituteId", "startTime");
CREATE INDEX "InstituteCourse_teacherId_idx"             ON "InstituteCourse"("teacherId");

ALTER TABLE "InstituteCourse" ADD CONSTRAINT "InstituteCourse_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. 研究院课程报名
CREATE TABLE "InstituteCourseRegistration" (
    "id"        TEXT NOT NULL,
    "courseId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'REGISTERED',
    "signedAt"  TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteCourseRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstituteCourseRegistration_courseId_userId_key"
    ON "InstituteCourseRegistration"("courseId", "userId");
CREATE INDEX "InstituteCourseRegistration_userId_idx"
    ON "InstituteCourseRegistration"("userId");

ALTER TABLE "InstituteCourseRegistration" ADD CONSTRAINT "InstituteCourseRegistration_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "InstituteCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. InstituteMember 增加归属研究院
ALTER TABLE "InstituteMember" ADD COLUMN "instituteId" TEXT;

ALTER TABLE "InstituteMember" ADD CONSTRAINT "InstituteMember_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. 内容审核记录表（完整审核链路）
CREATE TABLE "ContentAuditRecord" (
    "id"               TEXT NOT NULL,
    "contentType"      TEXT NOT NULL,
    "contentId"        TEXT NOT NULL,
    "circleId"         TEXT,
    "submitterId"      TEXT NOT NULL,
    "auditMode"        TEXT NOT NULL DEFAULT 'PRE_PUBLISH',

    -- 机器初审
    "machineStatus"    TEXT NOT NULL DEFAULT 'PENDING',
    "machineResult"    TEXT,
    "machineAuditAt"   TIMESTAMP(3),
    "machineAuditBy"   TEXT,

    -- 人工复审
    "humanAuditorId"   TEXT,
    "humanStatus"      TEXT NOT NULL DEFAULT 'PENDING',
    "humanResult"      TEXT,
    "humanAuditAt"     TIMESTAMP(3),

    -- AI 复审
    "aiReauditEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiReauditStatus"  TEXT,
    "aiReauditResult"  TEXT,
    "aiReauditAt"      TIMESTAMP(3),

    -- 主推标注
    "isRecommended"    BOOLEAN NOT NULL DEFAULT false,
    "recommendedAt"    TIMESTAMP(3),
    "recommendedBy"    TEXT,

    -- 最终状态
    "finalStatus"      TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason"     TEXT,
    "finishedAt"       TIMESTAMP(3),

    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAuditRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentAuditRecord_contentType_contentId_createdAt_key"
    ON "ContentAuditRecord"("contentType", "contentId", "createdAt");
CREATE INDEX "ContentAuditRecord_contentType_contentId_idx"
    ON "ContentAuditRecord"("contentType", "contentId");
CREATE INDEX "ContentAuditRecord_submitterId_idx"
    ON "ContentAuditRecord"("submitterId");
CREATE INDEX "ContentAuditRecord_humanAuditorId_idx"
    ON "ContentAuditRecord"("humanAuditorId");
CREATE INDEX "ContentAuditRecord_finalStatus_idx"
    ON "ContentAuditRecord"("finalStatus");
CREATE INDEX "ContentAuditRecord_isRecommended_finalStatus_createdAt_idx"
    ON "ContentAuditRecord"("isRecommended", "finalStatus", "createdAt");
CREATE INDEX "ContentAuditRecord_circleId_createdAt_idx"
    ON "ContentAuditRecord"("circleId", "createdAt");

-- 8. 圈主→嘉宾分账配置
CREATE TABLE "CircleRevenueSplit" (
    "id"        TEXT NOT NULL,
    "circleId"  TEXT NOT NULL,
    "guestId"   TEXT NOT NULL,
    "scene"     TEXT NOT NULL DEFAULT 'ALL',
    "splitRate" DECIMAL(5,4) NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleRevenueSplit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleRevenueSplit_circleId_guestId_scene_key"
    ON "CircleRevenueSplit"("circleId", "guestId", "scene");
CREATE INDEX "CircleRevenueSplit_circleId_idx" ON "CircleRevenueSplit"("circleId");
CREATE INDEX "CircleRevenueSplit_guestId_idx"  ON "CircleRevenueSplit"("guestId");

ALTER TABLE "CircleRevenueSplit" ADD CONSTRAINT "CircleRevenueSplit_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. 嘉宾收益记录
CREATE TABLE "CircleGuestEarning" (
    "id"        TEXT NOT NULL,
    "circleId"  TEXT NOT NULL,
    "guestId"   TEXT NOT NULL,
    "scene"     TEXT NOT NULL,
    "sourceId"  TEXT NOT NULL,
    "amount"    DECIMAL(10,2) NOT NULL,
    "splitRate" DECIMAL(5,4)  NOT NULL,
    "earned"    DECIMAL(10,2) NOT NULL,
    "settled"   BOOLEAN       NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleGuestEarning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleGuestEarning_circleId_createdAt_idx"
    ON "CircleGuestEarning"("circleId", "createdAt");
CREATE INDEX "CircleGuestEarning_guestId_settled_idx"
    ON "CircleGuestEarning"("guestId", "settled");
CREATE INDEX "CircleGuestEarning_scene_idx"     ON "CircleGuestEarning"("scene");
CREATE INDEX "CircleGuestEarning_sourceId_idx"  ON "CircleGuestEarning"("sourceId");

ALTER TABLE "CircleGuestEarning" ADD CONSTRAINT "CircleGuestEarning_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. 课程组合包系统（打包销售/打包赠送）
CREATE TYPE "BundleType" AS ENUM ('FREE_GIFT', 'PAID_COMBO', 'MEMBER_BENEFIT');
CREATE TYPE "BundleTarget" AS ENUM ('STATION', 'OPERATOR', 'MEMBER', 'PUBLIC');

CREATE TABLE "CourseBundle" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "cover"         TEXT,
    "intro"         TEXT,
    "type"          "BundleType"  NOT NULL DEFAULT 'FREE_GIFT',
    "target"        "BundleTarget" NOT NULL DEFAULT 'PUBLIC',
    "originalPrice" DECIMAL(10,2),
    "sellPrice"     DECIMAL(10,2),
    "sortOrder"     INTEGER NOT NULL DEFAULT 0,
    "status"        TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseBundle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseBundle_type_target_idx"        ON "CourseBundle"("type", "target");
CREATE INDEX "CourseBundle_status_idx"              ON "CourseBundle"("status");
CREATE INDEX "CourseBundle_target_type_status_idx"  ON "CourseBundle"("target", "type", "status");

CREATE TABLE "CourseBundleItem" (
    "id"        TEXT NOT NULL,
    "bundleId"  TEXT NOT NULL,
    "itemType"  TEXT NOT NULL DEFAULT 'COURSE',
    "itemId"    TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseBundleItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseBundleItem_bundleId_itemType_itemId_key"
    ON "CourseBundleItem"("bundleId", "itemType", "itemId");
CREATE INDEX "CourseBundleItem_bundleId_sortOrder_idx"
    ON "CourseBundleItem"("bundleId", "sortOrder");

ALTER TABLE "CourseBundleItem" ADD CONSTRAINT "CourseBundleItem_bundleId_fkey"
    FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StationBundleAccess" (
    "id"         TEXT NOT NULL,
    "bundleId"   TEXT NOT NULL,
    "stationId"  TEXT,
    "operatorId" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationBundleAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StationBundleAccess_bundleId_stationId_key"
    ON "StationBundleAccess"("bundleId", "stationId");
CREATE UNIQUE INDEX "StationBundleAccess_bundleId_operatorId_key"
    ON "StationBundleAccess"("bundleId", "operatorId");
CREATE INDEX "StationBundleAccess_stationId_idx"  ON "StationBundleAccess"("stationId");
CREATE INDEX "StationBundleAccess_operatorId_idx" ON "StationBundleAccess"("operatorId");

ALTER TABLE "StationBundleAccess" ADD CONSTRAINT "StationBundleAccess_bundleId_fkey"
    FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderType 增加 BUNDLE
ALTER TYPE "OrderType" ADD VALUE 'BUNDLE';
