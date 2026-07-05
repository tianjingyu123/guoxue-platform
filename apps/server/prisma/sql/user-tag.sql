-- D-T2 用户标签表（与 schema.prisma UserTag 对齐·只增不删）
CREATE TABLE IF NOT EXISTS "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserTag_userId_tag_key" ON "UserTag"("userId", "tag");
CREATE INDEX IF NOT EXISTS "UserTag_tag_idx" ON "UserTag"("tag");
