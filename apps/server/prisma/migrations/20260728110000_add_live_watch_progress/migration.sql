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

-- CreateIndex
CREATE UNIQUE INDEX "LiveWatchProgress_userId_liveRoomId_key"
ON "LiveWatchProgress"("userId", "liveRoomId");

-- CreateIndex
CREATE INDEX "LiveWatchProgress_userId_lastWatchedAt_idx"
ON "LiveWatchProgress"("userId", "lastWatchedAt");

-- CreateIndex
CREATE INDEX "LiveWatchProgress_liveRoomId_lastWatchedAt_idx"
ON "LiveWatchProgress"("liveRoomId", "lastWatchedAt");

-- AddForeignKey
ALTER TABLE "LiveWatchProgress"
ADD CONSTRAINT "LiveWatchProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveWatchProgress"
ADD CONSTRAINT "LiveWatchProgress_liveRoomId_fkey"
FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
