-- 全库 URL 字段 HTML 转义存量修复（举一反三·2026-07-11·幂等可重跑）
-- 根因：旧版 SanitizePipe 把 URL 字段实体转义入库（/ → &#x2F; 等），致 <video>/<image> src 无效。
-- 入口白名单 sanitize.pipe 已修（随本批部署）；本文件清洗全部已知 URL 承载字段的存量脏数据。
-- 替换顺序：先 &amp;→&（收敛双重转义），再 &#x2F;→/，再 &#x27;→' 与 &quot;→"。仅命中含转义痕迹的行。

-- 课程章节（视频/音频地址存 content 与 mediaUrl——「课堂上传的章节课程不能播」根因）
UPDATE "CourseChapter" SET "content"  = replace(replace(replace(replace("content", '&amp;','&'), '&#x2F;','/'), '&#x27;',''''), '&quot;','"') WHERE "content"  LIKE '%&#x2F;%' OR "content"  LIKE '%&amp;%';
UPDATE "CourseChapter" SET "mediaUrl" = replace(replace(replace(replace("mediaUrl",'&amp;','&'), '&#x2F;','/'), '&#x27;',''''), '&quot;','"') WHERE "mediaUrl" LIKE '%&#x2F;%' OR "mediaUrl" LIKE '%&amp;%';

-- 短视频（与 20260710-fix-video-url-html-escape.sql 重叠·幂等无害）
UPDATE "Video" SET "videoUrl" = replace(replace(replace(replace("videoUrl",'&amp;','&'), '&#x2F;','/'), '&#x27;',''''), '&quot;','"') WHERE "videoUrl" LIKE '%&#x2F;%' OR "videoUrl" LIKE '%&amp;%';
UPDATE "Video" SET "coverUrl" = replace(replace(replace(replace("coverUrl",'&amp;','&'), '&#x2F;','/'), '&#x27;',''''), '&quot;','"') WHERE "coverUrl" LIKE '%&#x2F;%' OR "coverUrl" LIKE '%&amp;%';

-- 课程/文章/圈子/直播/用户 封面与地址类
UPDATE "Course"   SET "cover"     = replace(replace("cover",    '&amp;','&'), '&#x2F;','/') WHERE "cover"     LIKE '%&#x2F;%' OR "cover"     LIKE '%&amp;%';
UPDATE "Article"  SET "cover"     = replace(replace("cover",    '&amp;','&'), '&#x2F;','/') WHERE "cover"     LIKE '%&#x2F;%' OR "cover"     LIKE '%&amp;%';
UPDATE "Circle"   SET "cover"     = replace(replace("cover",    '&amp;','&'), '&#x2F;','/') WHERE "cover"     LIKE '%&#x2F;%' OR "cover"     LIKE '%&amp;%';
UPDATE "LiveRoom" SET "cover"     = replace(replace("cover",    '&amp;','&'), '&#x2F;','/') WHERE "cover"     LIKE '%&#x2F;%' OR "cover"     LIKE '%&amp;%';
UPDATE "LiveRoom" SET "replayUrl" = replace(replace("replayUrl",'&amp;','&'), '&#x2F;','/') WHERE "replayUrl" LIKE '%&#x2F;%' OR "replayUrl" LIKE '%&amp;%';
UPDATE "User"     SET "avatar"    = replace(replace("avatar",   '&amp;','&'), '&#x2F;','/') WHERE "avatar"    LIKE '%&#x2F;%' OR "avatar"    LIKE '%&amp;%';

-- 商品（cover 文本列 + images 文本数组）
UPDATE "Product" SET "cover" = replace(replace("cover",'&amp;','&'), '&#x2F;','/') WHERE "cover" LIKE '%&#x2F;%' OR "cover" LIKE '%&amp;%';
UPDATE "Product" SET "images" = (
  SELECT array_agg(replace(replace(e,'&amp;','&'), '&#x2F;','/')) FROM unnest("images") AS e
) WHERE EXISTS (SELECT 1 FROM unnest("images") AS e WHERE e LIKE '%&#x2F;%' OR e LIKE '%&amp;%');

-- 帖子图片数组
UPDATE "Post" SET "images" = (
  SELECT array_agg(replace(replace(e,'&amp;','&'), '&#x2F;','/')) FROM unnest("images") AS e
) WHERE EXISTS (SELECT 1 FROM unnest("images") AS e WHERE e LIKE '%&#x2F;%' OR e LIKE '%&amp;%');
