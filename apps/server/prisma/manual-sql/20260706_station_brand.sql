-- 驿-P1 驿站品牌主页（2026-07-06）：StationOffline 增量列 brandStory / photos / featuredTeacherIds
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260706_station_brand.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS 全覆盖，可重复执行；只增不删

-- 1. 驿站故事（品牌主页正文，可空）
ALTER TABLE "StationOffline"
  ADD COLUMN IF NOT EXISTS "brandStory" TEXT;

-- 2. 品牌相册（环境照片墙 URL 数组，默认空）
ALTER TABLE "StationOffline"
  ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 3. 讲师阵容（StationTeacher.id 数组·驿站长挑选展示顺序，默认空）
ALTER TABLE "StationOffline"
  ADD COLUMN IF NOT EXISTS "featuredTeacherIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
