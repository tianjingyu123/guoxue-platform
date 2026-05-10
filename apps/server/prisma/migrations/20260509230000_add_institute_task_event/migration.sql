-- InstituteMember: 补充字段
ALTER TABLE "InstituteMember" ADD COLUMN "depositRefunded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InstituteMember" ADD COLUMN "joinYear" INTEGER NOT NULL DEFAULT 2026;
ALTER TABLE "InstituteMember" ADD COLUMN "lecturerLevel" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "InstituteMember" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- InstituteTask: 年度任务
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
CREATE INDEX "InstituteTask_memberId_status_idx" ON "InstituteTask"("memberId", "status");
ALTER TABLE "InstituteTask" ADD CONSTRAINT "InstituteTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "InstituteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InstituteEvent: 活动排期
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
    CONSTRAINT "InstituteEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstituteEvent_scheduleAt_idx" ON "InstituteEvent"("scheduleAt");
CREATE INDEX "InstituteEvent_lecturerId_idx" ON "InstituteEvent"("lecturerId");
CREATE INDEX "InstituteEvent_type_status_idx" ON "InstituteEvent"("type", "status");
