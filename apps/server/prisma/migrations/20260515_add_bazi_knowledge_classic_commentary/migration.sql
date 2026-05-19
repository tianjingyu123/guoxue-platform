-- BaziKnowledge: 八字命理专业知识库
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

CREATE INDEX "BaziKnowledge_category_idx" ON "BaziKnowledge"("category");
CREATE INDEX "BaziKnowledge_status_idx" ON "BaziKnowledge"("status");
CREATE INDEX "BaziKnowledge_createdAt_idx" ON "BaziKnowledge"("createdAt");
CREATE UNIQUE INDEX "BaziKnowledge_title_category_key" ON "BaziKnowledge"("title", "category");

-- ClassicCommentary: 经典注释/学术解释库
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

CREATE INDEX "ClassicCommentary_bookId_idx" ON "ClassicCommentary"("bookId");
CREATE INDEX "ClassicCommentary_chapterId_idx" ON "ClassicCommentary"("chapterId");
CREATE INDEX "ClassicCommentary_type_idx" ON "ClassicCommentary"("type");
CREATE INDEX "ClassicCommentary_school_idx" ON "ClassicCommentary"("school");
CREATE UNIQUE INDEX "ClassicCommentary_bookId_chapterId_author_title_key" ON "ClassicCommentary"("bookId", "chapterId", "author", "title");

ALTER TABLE "ClassicCommentary" ADD CONSTRAINT "ClassicCommentary_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassicCommentary" ADD CONSTRAINT "ClassicCommentary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
