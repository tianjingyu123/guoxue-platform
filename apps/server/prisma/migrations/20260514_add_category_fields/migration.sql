-- 用户兴趣品类
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interestCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 圈子
ALTER TABLE "Circle" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Circle" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 帖子
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 内容（后台管理）
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 文章
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 课程
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 商品
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 视频
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 电子书
ALTER TABLE "Ebook" ADD COLUMN IF NOT EXISTS "categoryLevel1" TEXT;
ALTER TABLE "Ebook" ADD COLUMN IF NOT EXISTS "categoryLevel2" TEXT;

-- 品类索引
CREATE INDEX IF NOT EXISTS "Circle_categoryLevel1_idx" ON "Circle"("categoryLevel1");
CREATE INDEX IF NOT EXISTS "Article_categoryLevel1_idx" ON "Article"("categoryLevel1");
CREATE INDEX IF NOT EXISTS "Course_categoryLevel1_idx" ON "Course"("categoryLevel1");
CREATE INDEX IF NOT EXISTS "Product_categoryLevel1_idx" ON "Product"("categoryLevel1");
CREATE INDEX IF NOT EXISTS "Ebook_categoryLevel1_idx" ON "Ebook"("categoryLevel1");
CREATE INDEX IF NOT EXISTS "Post_categoryLevel1_idx" ON "Post"("categoryLevel1");
