-- 汉字字典（新华字典 14809 字）：新增 ZidianEntry 表（只增不删·幂等）。
-- 背景：V0 排盘工具的「字典查询」需 5.2MB 新华字典释义，前端分包塞不下（小程序单包 2MB 上限），
--       故释义与繁体下沉后端；康熙笔画/五行/数理/生肖宜忌等 24 个字段仍由前端本地算（数据已在 pkg-paipan2/lib）。
-- 应用：cd apps/server && npx prisma db execute --file prisma/sql/2026-07-14-zidian-dict.sql --schema prisma/schema.prisma
-- 灌数据：npx tsx scripts/seed-zidian.ts

CREATE TABLE IF NOT EXISTS "ZidianEntry" (
    "char" TEXT NOT NULL,
    "traditional" TEXT NOT NULL DEFAULT '',
    "pinyin" TEXT NOT NULL DEFAULT '',
    "explanation" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZidianEntry_pkey" PRIMARY KEY ("char")
);

-- 按拼音检索（去声调前缀匹配）
CREATE INDEX IF NOT EXISTS "ZidianEntry_pinyin_idx" ON "ZidianEntry"("pinyin");
