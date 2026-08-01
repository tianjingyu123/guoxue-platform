-- 还原 SanitizePipe 误转义的 URL 字段：&#x2F;→/ &#x27;→' &quot;→" &lt;→< &gt;→> &amp;→&（&amp; 最后）
-- 仅命中含 &#x2F; 的脏行；影响面已确认：CourseChapter.mediaUrl 5行 + Video.videoUrl 5行

BEGIN;

UPDATE "CourseChapter"
SET "mediaUrl" = replace(replace(replace(replace(replace(replace(
  "mediaUrl", '&#x2F;','/'), '&#x27;',''''), '&quot;','"'), '&lt;','<'), '&gt;','>'), '&amp;','&')
WHERE "mediaUrl" LIKE '%&#x2F;%';

UPDATE "Video"
SET "videoUrl" = replace(replace(replace(replace(replace(replace(
  "videoUrl", '&#x2F;','/'), '&#x27;',''''), '&quot;','"'), '&lt;','<'), '&gt;','>'), '&amp;','&')
WHERE "videoUrl" LIKE '%&#x2F;%';

-- 验证：还原后应为 https://... 正常地址，且不再含 &#x2F;
SELECT 'CourseChapter' AS tbl, id, LEFT("mediaUrl",70) AS url FROM "CourseChapter"
  WHERE "mediaUrl" LIKE 'http%' ORDER BY "createdAt" DESC LIMIT 5;
SELECT 'Video' AS tbl, id, LEFT("videoUrl",70) AS url FROM "Video"
  WHERE "videoUrl" LIKE 'http%' AND "videoUrl" NOT LIKE '%&#x2F;%' ORDER BY "createdAt" DESC LIMIT 5;
-- 确认再无残留脏行
SELECT (SELECT count(*) FROM "CourseChapter" WHERE "mediaUrl" LIKE '%&#x2F;%') AS chapter_dirty,
       (SELECT count(*) FROM "Video" WHERE "videoUrl" LIKE '%&#x2F;%') AS video_dirty;

COMMIT;
