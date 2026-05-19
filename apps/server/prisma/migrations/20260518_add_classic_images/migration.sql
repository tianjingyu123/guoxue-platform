-- ClassicImage: 古籍原图元数据
CREATE TABLE IF NOT EXISTS "ClassicImage" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "bookId" TEXT NOT NULL REFERENCES "ClassicBook"(id) ON DELETE CASCADE,
    "pageNumber" INTEGER NOT NULL,
    label TEXT,
    "iiifUrl" TEXT,
    "manifestUrl" TEXT,
    width INTEGER,
    height INTEGER,
    source TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("bookId", "pageNumber")
);
CREATE INDEX IF NOT EXISTS "ClassicImage_bookId_idx" ON "ClassicImage"("bookId");

-- ClassicOcrText: OCR 文字坐标
CREATE TABLE IF NOT EXISTS "ClassicOcrText" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "imageId" TEXT NOT NULL REFERENCES "ClassicImage"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    w INTEGER NOT NULL,
    h INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "charIndex" INTEGER NOT NULL,
    confidence DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS "ClassicOcrText_imageId_pageNumber_idx" ON "ClassicOcrText"("imageId", "pageNumber");
CREATE INDEX IF NOT EXISTS "ClassicOcrText_imageId_lineNumber_charIndex_idx" ON "ClassicOcrText"("imageId", "lineNumber", "charIndex");

-- ClassicAnnotation: 注疏/夹注/眉批/校勘记
CREATE TABLE IF NOT EXISTS "ClassicAnnotation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "bookId" TEXT NOT NULL REFERENCES "ClassicBook"(id) ON DELETE CASCADE,
    "chapterId" TEXT REFERENCES "ClassicChapter"(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'zhu_shu',
    "startPos" INTEGER NOT NULL,
    "endPos" INTEGER NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    dynasty TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ClassicAnnotation_bookId_idx" ON "ClassicAnnotation"("bookId");
CREATE INDEX IF NOT EXISTS "ClassicAnnotation_chapterId_idx" ON "ClassicAnnotation"("chapterId");
CREATE INDEX IF NOT EXISTS "ClassicAnnotation_bookId_startPos_idx" ON "ClassicAnnotation"("bookId", "startPos");

-- ClassicBook 新增版本分组字段
ALTER TABLE "ClassicBook" ADD COLUMN IF NOT EXISTS "versionGroupId" TEXT;
