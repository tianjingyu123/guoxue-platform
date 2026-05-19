-- CreateTable
CREATE TABLE "ClassicReadingNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicReadingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_idx" ON "ClassicReadingNote"("userId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_userId_bookId_idx" ON "ClassicReadingNote"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_chapterId_idx" ON "ClassicReadingNote"("chapterId");

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
