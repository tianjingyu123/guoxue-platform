-- 发布页补字段（2026-07-10·幂等可重跑）
-- ① OBS 横屏直播（董事长口头要求）：观看端按 orientation 渲染横/竖屏
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "orientation" TEXT NOT NULL DEFAULT 'portrait';
-- ② 课程介绍详情图（V0 publish-course·最多6张·展示在课程详情页介绍区）
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "detailImages" TEXT[] NOT NULL DEFAULT '{}';
