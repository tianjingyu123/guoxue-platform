-- 为古籍章节添加八字命理标签字段，支持八字排盘古籍联动
ALTER TABLE "ClassicChapter" ADD COLUMN "tags" JSONB DEFAULT '[]'::jsonb;
