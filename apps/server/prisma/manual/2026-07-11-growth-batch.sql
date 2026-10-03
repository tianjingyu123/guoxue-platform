-- 圈子增长项收尾批（V0 待办 #21/#33/#34/#37/#38）· 2026-07-11
-- 幂等：可重复执行。
-- 应用方式：npx prisma db execute --file prisma/manual/2026-07-11-growth-batch.sql --schema prisma/schema.prisma
-- ⚠️ 代码侧对 replayChapters 读写均走 $queryRaw/$executeRaw（绕过 prisma generate，无需停 pm2）。

-- #21 回放章节点：主播标注的章节 [{ "t": 秒, "title": "章节标题" }, ...]
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "replayChapters" JSONB;

-- #34 续费折扣配置（默认关·待董事长拍板开启）：
-- ConfigSystem 键 circle.renew_discount，代码读不到该键时缺省 {"enabled":false}（零行为变化）。
-- 这里不 INSERT 默认行——保持"未配置=关闭"语义；拍板开启时由后台/SQL 写入：
-- INSERT INTO "ConfigSystem" ("id","configKey","configValue","description","updatedAt")
-- VALUES (gen_random_uuid(), 'circle.renew_discount', '{"enabled":true,"renewRate":0.8,"twoYearRate":0.75}', '圈子续费老成员折扣（#34）', now())
-- ON CONFLICT ("configKey") DO UPDATE SET "configValue" = EXCLUDED."configValue", "updatedAt" = now();
