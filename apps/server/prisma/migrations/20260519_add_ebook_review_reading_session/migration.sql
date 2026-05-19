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

-- CreateIndex
CREATE UNIQUE INDEX "EbookReview_userId_ebookId_key" ON "EbookReview"("userId", "ebookId");

-- CreateIndex
CREATE INDEX "EbookReview_ebookId_createdAt_idx" ON "EbookReview"("ebookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EbookReadingSession_userId_ebookId_date_key" ON "EbookReadingSession"("userId", "ebookId", "date");

-- CreateIndex
CREATE INDEX "EbookReadingSession_userId_date_idx" ON "EbookReadingSession"("userId", "date");

-- CreateIndex
CREATE INDEX "EbookReadingSession_ebookId_idx" ON "EbookReadingSession"("ebookId");

-- AddForeignKey
ALTER TABLE "EbookReview" ADD CONSTRAINT "EbookReview_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReview" ADD CONSTRAINT "EbookReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReadingSession" ADD CONSTRAINT "EbookReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookReadingSession" ADD CONSTRAINT "EbookReadingSession_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
