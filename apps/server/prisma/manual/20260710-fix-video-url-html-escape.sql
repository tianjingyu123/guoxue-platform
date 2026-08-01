-- ─────────────────────────────────────────────────────────────────────────────
-- 修复：旧版 SanitizePipe 把 URL 字段做了 HTML 实体转义后入库
--   现象：videoUrl 存成 https:&#x2F;&#x2F;xxx.cos...&#x2F;uploads&#x2F;xxx.mp4
--         <video src> 无效 → 新上传短视频无法播放（生产实证：Video 表 2026-07-10 两条）
--   入口已修：apps/server/src/common/sanitize.pipe.ts SKIP_FIELDS 加 videoUrl/coverUrl 等
--   读取路径防御：video.service normalizeVideoUrls 反转义兜底
--   本脚本：幂等修复存量坏数据。可重复执行（WHERE 只命中仍含实体的行）。
--   实体顺序：先修双重转义（&amp;#x2F;），再修单层（&#x2F;），最后还原裸 &amp;。
-- 执行：psql $DATABASE_URL -f apps/server/prisma/manual/20260710-fix-video-url-html-escape.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 短视频
UPDATE "Video" SET "videoUrl" =
  replace(replace(replace(replace(replace(replace("videoUrl",
    '&amp;#x2F;', '/'),
    '&#x2F;', '/'),
    '&#x27;', ''''),
    '&quot;', '"'),
    '&amp;', '&'),
    '&lt;', '<')
WHERE "videoUrl" LIKE '%&#x2F;%' OR "videoUrl" LIKE '%&amp;%' OR "videoUrl" LIKE '%&#x27;%' OR "videoUrl" LIKE '%&quot;%';

UPDATE "Video" SET "coverUrl" =
  replace(replace(replace(replace(replace(replace("coverUrl",
    '&amp;#x2F;', '/'),
    '&#x2F;', '/'),
    '&#x27;', ''''),
    '&quot;', '"'),
    '&amp;', '&'),
    '&lt;', '<')
WHERE "coverUrl" LIKE '%&#x2F;%' OR "coverUrl" LIKE '%&amp;%' OR "coverUrl" LIKE '%&#x27;%' OR "coverUrl" LIKE '%&quot;%';

-- 圈子帖子附带视频（同根因防御性修复）
UPDATE "Post" SET "videoUrl" =
  replace(replace(replace(replace(replace(replace("videoUrl",
    '&amp;#x2F;', '/'),
    '&#x2F;', '/'),
    '&#x27;', ''''),
    '&quot;', '"'),
    '&amp;', '&'),
    '&lt;', '<')
WHERE "videoUrl" LIKE '%&#x2F;%' OR "videoUrl" LIKE '%&amp;%';

-- 商品主图视频（同根因防御性修复）
UPDATE "Product" SET "videoUrl" =
  replace(replace(replace(replace(replace(replace("videoUrl",
    '&amp;#x2F;', '/'),
    '&#x2F;', '/'),
    '&#x27;', ''''),
    '&quot;', '"'),
    '&amp;', '&'),
    '&lt;', '<')
WHERE "videoUrl" LIKE '%&#x2F;%' OR "videoUrl" LIKE '%&amp;%';
