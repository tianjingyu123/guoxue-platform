-- ═══════════════════════════════════════════════════════════════
-- 国学平台 — 数据库索引优化迁移
-- 分析日期：2026-05-11
-- 覆盖：高频查询缺失索引 + PostgreSQL GIN 索引 + 全文搜索优化
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 第一部分：标准 B-Tree 索引（Prisma schema 同步修改）
-- ═══════════════════════════════════════════════════════════════

-- 1. User 表 — 管理员按状态+时间排序列举
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_status_createdAt_idx"
    ON "User" ("status", "createdAt" DESC);

-- 2. SearchHistory 表 — 按时间清理过期搜索记录
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SearchHistory_createdAt_idx"
    ON "SearchHistory" ("createdAt");

-- SearchHistory — groupBy keyword 热门搜索统计加速
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SearchHistory_keyword_idx"
    ON "SearchHistory" ("keyword");

-- 3. PaipanRecord 表 — 管理员按类型筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaipanRecord_paipanType_idx"
    ON "PaipanRecord" ("paipanType");

-- PaipanRecord — 管理员按 clientName 搜索（contains 场景，配合 pg_trgm）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaipanRecord_clientName_idx"
    ON "PaipanRecord" ("clientName");

-- 4. Order 表 — 按类型筛选（高频：订单管理后台）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_type_idx"
    ON "Order" ("type");

-- Order — 用户+类型+状态组合查询（我的购买分 tab 场景）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_userId_type_status_createdAt_idx"
    ON "Order" ("userId", "type", "status", "createdAt" DESC);

-- 5. Comment 表 — 查询子回复（parentId 查楼层）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Comment_parentId_createdAt_idx"
    ON "Comment" ("parentId", "createdAt");

-- Comment — 审核状态筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Comment_status_idx"
    ON "Comment" ("status");

-- 6. Report 表 — 举报人查举报历史
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Report_reporterId_createdAt_idx"
    ON "Report" ("reporterId", "createdAt" DESC);

-- 7. ReferralRelation 表 — 用户查看自己的推荐关系
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ReferralRelation_userId_relationStatus_idx"
    ON "ReferralRelation" ("userId", "relationStatus");

-- 8. LiveRoom 表 — 按主播查询直播间
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LiveRoom_hostUserId_status_idx"
    ON "LiveRoom" ("hostUserId", "status");

-- 9. UserBehaviorLog 表 — 按时间范围查询（已有 userId_createdAt，补充纯时间）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserBehaviorLog_createdAt_idx"
    ON "UserBehaviorLog" ("createdAt" DESC);

-- 10. UserInterest 表 — 按标签查询有偏好的用户（推荐冷启动）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserInterest_tag_idx"
    ON "UserInterest" ("tag");

-- 11. Course 表 — 类型+审核状态筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_type_auditStatus_idx"
    ON "Course" ("type", "auditStatus");

-- 12. Product 表 — 供应商类型+状态筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_supplierType_status_idx"
    ON "Product" ("supplierType", "status");

-- 13. Like 表 — 用户点赞加速（配合 unique 约束查询）
-- (idx_user_target 已覆盖大部分场景，补充 createdAt 排序)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Like_userId_createdAt_idx"
    ON "Like" ("userId", "createdAt" DESC);

-- 14. Collect 表 — 同 Like 场景
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Collect_userId_createdAt_idx"
    ON "Collect" ("userId", "createdAt" DESC);

-- 15. Article — 审核状态+时间排序（内容审核后台高频使用）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_auditStatus_createdAt_idx"
    ON "Article" ("auditStatus", "createdAt" DESC);

-- 16. VirtualCoinTransaction — 用户交易流水按类型筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS "VirtualCoinTransaction_userId_type_createdAt_idx"
    ON "VirtualCoinTransaction" ("userId", "type", "createdAt" DESC);

-- 17. Follow — 按关注时间排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Follow_userId_createdAt_idx"
    ON "Follow" ("userId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Follow_followedUserId_createdAt_idx"
    ON "Follow" ("followedUserId", "createdAt" DESC);

-- 18. CircleMember — 按加入时间排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CircleMember_userId_joinedAt_idx"
    ON "CircleMember" ("userId", "joinedAt" DESC);

-- ═══════════════════════════════════════════════════════════════
-- 第二部分：全文搜索 GIN 索引（SearchService FTS 查询加速）
-- ═══════════════════════════════════════════════════════════════

-- 启用 pg_trgm 扩展（三字母组相似度，支持 contains/ILIKE 加速）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Article 搜索（title + excerpt）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_fts_idx"
    ON "Article"
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

-- Course 搜索（title + intro）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_fts_idx"
    ON "Course"
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(intro, '')));

-- Product 搜索（title + intro）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_fts_idx"
    ON "Product"
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(intro, '')));

-- Circle 搜索（name + intro）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Circle_fts_idx"
    ON "Circle"
    USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(intro, '')));

-- Content 搜索（title + author + excerpt）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Content_fts_idx"
    ON "Content"
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(excerpt, '')));

-- ClassicBook 搜索（title + author + intro）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ClassicBook_fts_idx"
    ON "ClassicBook"
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(intro, '')));

-- Video 搜索（title）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Video_fts_idx"
    ON "Video"
    USING GIN (to_tsvector('simple', coalesce(title, '')));

-- User 搜索（nickname）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_fts_idx"
    ON "User"
    USING GIN (to_tsvector('simple', coalesce(nickname, '')));

-- ═══════════════════════════════════════════════════════════════
-- 第三部分：数组字段 GIN 索引（tags String[] has/hasSome 查询加速）
-- ═══════════════════════════════════════════════════════════════

-- Article.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_tags_gin_idx"
    ON "Article" USING GIN ("tags");

-- Course.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_tags_gin_idx"
    ON "Course" USING GIN ("tags");

-- Product.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_tags_gin_idx"
    ON "Product" USING GIN ("tags");

-- Circle.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Circle_tags_gin_idx"
    ON "Circle" USING GIN ("tags");

-- Video.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Video_tags_gin_idx"
    ON "Video" USING GIN ("tags");

-- Content.tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Content_tags_gin_idx"
    ON "Content" USING GIN ("tags");

-- ═══════════════════════════════════════════════════════════════
-- 第四部分：pg_trgm 三字母组索引（contains/ILIKE 关键词搜索加速）
-- ═══════════════════════════════════════════════════════════════

-- User nickname ILIKE/contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_nickname_trgm_idx"
    ON "User" USING GIN ("nickname" gin_trgm_ops);

-- User phone contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_phone_trgm_idx"
    ON "User" USING GIN ("phone" gin_trgm_ops);

-- PaipanRecord clientName contains（管理员搜索）
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaipanRecord_clientName_trgm_idx"
    ON "PaipanRecord" USING GIN ("clientName" gin_trgm_ops);

-- Article title contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_title_trgm_idx"
    ON "Article" USING GIN ("title" gin_trgm_ops);

-- Course title contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_title_trgm_idx"
    ON "Course" USING GIN ("title" gin_trgm_ops);

-- Product title contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_title_trgm_idx"
    ON "Product" USING GIN ("title" gin_trgm_ops);

-- Circle name contains
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Circle_name_trgm_idx"
    ON "Circle" USING GIN ("name" gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════
-- 第五部分：ANALYZE 更新统计信息
-- ═══════════════════════════════════════════════════════════════

ANALYZE "User";
ANALYZE "Article";
ANALYZE "Course";
ANALYZE "Product";
ANALYZE "Circle";
ANALYZE "Content";
ANALYZE "Video";
ANALYZE "Order";
ANALYZE "Comment";
ANALYZE "PaipanRecord";
ANALYZE "SearchHistory";
ANALYZE "Notification";
ANALYZE "Like";
ANALYZE "Collect";
ANALYZE "Follow";
ANALYZE "LiveRoom";
ANALYZE "UserBehaviorLog";
ANALYZE "UserInterest";
ANALYZE "VirtualCoinTransaction";
ANALYZE "Report";
ANALYZE "ReferralRelation";
ANALYZE "CircleMember";
ANALYZE "ClassicBook";
