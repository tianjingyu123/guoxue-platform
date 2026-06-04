-- CreateTable
CREATE TABLE IF NOT EXISTS "CircleAnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleAnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CircleExpertBooking" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleExpertBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CircleAnnouncementRead_announcementId_userId_key" ON "CircleAnnouncementRead"("announcementId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CircleAnnouncementRead_announcementId_idx" ON "CircleAnnouncementRead"("announcementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CircleAnnouncementRead_userId_idx" ON "CircleAnnouncementRead"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CircleExpertBooking_expertUserId_slotDate_idx" ON "CircleExpertBooking"("expertUserId", "slotDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CircleExpertBooking_bookerUserId_idx" ON "CircleExpertBooking"("bookerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CircleExpertBooking_circleId_status_idx" ON "CircleExpertBooking"("circleId", "status");
