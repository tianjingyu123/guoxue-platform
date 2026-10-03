-- 课程定时上下架（2026-07-11 后台课程编辑器重做·董事长拍板"支持上架下架、定时上下架"）
-- 幂等：可重复执行。生产低峰窗口执行即可，不锁表（ADD COLUMN 无默认值仅改元数据）。
-- 生效机制：course-scheduler.service 每分钟 cron 扫描到点课程翻转 auditStatus 并清空定时字段。
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "scheduledOnAt" TIMESTAMP(3);
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "scheduledOffAt" TIMESTAMP(3);
