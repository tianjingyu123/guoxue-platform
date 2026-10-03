-- 内容开放范围·存量数据回填（幂等可重跑）
-- 背景：P1 给四类内容加了 visibility 字段（默认 CIRCLE_ONLY），但存量已过审/已发布内容
-- 此前一直展示在平台公共池。P3 查询过滤上线后公共池只出 visibility=PLATFORM，
-- 若不回填，存量内容会从首页/广场/瀑布流集体消失。
-- 口径：按「当前实际可见性」回填 —— 已在公共池露出的存量内容 = PLATFORM；新内容起用 CIRCLE_ONLY 默认。

-- 文章：已审核通过的存量文章（现平台文章流可见）
UPDATE "Article" SET "visibility" = 'PLATFORM'
WHERE "auditStatus" = 'APPROVED' AND "visibility" = 'CIRCLE_ONLY';

-- 课程：已审核通过的存量课程（现课程广场可见）
UPDATE "Course" SET "visibility" = 'PLATFORM'
WHERE "auditStatus" = 'APPROVED' AND "visibility" = 'CIRCLE_ONLY';

-- 短视频：已发布的存量视频（现瀑布流可见；私密视频 isPrivate 正交，不受影响）
UPDATE "Video" SET "visibility" = 'PLATFORM'
WHERE "status" = 'PUBLISHED' AND "visibility" = 'CIRCLE_ONLY';

-- 直播间：存量直播间（现直播广场无开放范围过滤，全部可见）
UPDATE "LiveRoom" SET "visibility" = 'PLATFORM'
WHERE "visibility" = 'CIRCLE_ONLY';
