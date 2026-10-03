-- 古籍笔记增加句子/段落锚点；字段可空以兼容已有章节级笔记
ALTER TABLE "ClassicReadingNote"
  ADD COLUMN IF NOT EXISTS "position" INTEGER,
  ADD COLUMN IF NOT EXISTS "originalText" TEXT;

CREATE INDEX IF NOT EXISTS "ClassicReadingNote_userId_chapterId_position_idx"
  ON "ClassicReadingNote"("userId", "chapterId", "position");
