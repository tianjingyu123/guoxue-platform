-- CreateTable (Content 表在 init 迁移中遗漏，在此补建)
CREATE TABLE IF NOT EXISTS "Content" (
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
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Content" ADD COLUMN "stationId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "stationId" TEXT;

-- CreateIndex
CREATE INDEX "Content_type_createdAt_idx" ON "Content"("type", "createdAt");
CREATE INDEX "Content_status_idx" ON "Content"("status");
CREATE INDEX "Content_stationId_idx" ON "Content"("stationId");

-- CreateIndex
CREATE INDEX "Product_stationId_idx" ON "Product"("stationId");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
