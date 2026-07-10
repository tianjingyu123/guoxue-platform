-- 2026-07-11 存量待审内容一次性放行（董事长拍板：先发后审新规下存量 PENDING 放行，配合机审兜底扫描）
-- 放行后调用 POST /api/v1/audit/admin/backfill-moderation（SUPER_ADMIN，type 分别传 VIDEO/COURSE/LIVE）做机审兜底。
-- 幂等：重复执行无副作用。
UPDATE "Video"    SET "auditStatus" = 'APPROVED' WHERE "auditStatus" = 'PENDING';
UPDATE "Course"   SET "auditStatus" = 'APPROVED' WHERE "auditStatus" = 'PENDING' AND "deletedAt" IS NULL;
UPDATE "LiveRoom" SET "auditStatus" = 'APPROVED' WHERE "auditStatus" = 'PENDING';
