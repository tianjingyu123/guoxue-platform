-- CreateTable
CREATE TABLE "ClassicCopyright" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "auditNote" TEXT,
    "auditedAt" TIMESTAMP(3),
    "auditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicCopyright_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassicCopyright_bookId_idx" ON "ClassicCopyright"("bookId");

-- CreateIndex
CREATE INDEX "ClassicCopyright_license_idx" ON "ClassicCopyright"("license");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicCopyright_bookId_sourceName_key" ON "ClassicCopyright"("bookId", "sourceName");

-- AddForeignKey
ALTER TABLE "ClassicCopyright" ADD CONSTRAINT "ClassicCopyright_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ClassicBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
