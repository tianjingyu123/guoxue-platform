-- 用户隐私偏好
--
-- 背景：apps/mobile/src/pkg-settings/privacy/index.vue 的开关此前是纯本地 ref，
-- 无接口、无持久化，重进页面即回默认值 —— 用户以为关掉了，实际采集不受影响。
-- 本列给这些开关一个真正的落点。
--
-- 为什么放在 User 上而不是独立表：与既有 notifySettings / creatorSettings 同范式，
-- 读取方大多已经在查 User，不额外加一次 join；改动面最小。
-- 偏好变更的时间与操作人由既有 AuditLog 承载，不在本列里存历史。
--
-- 可空：NULL = 用户从未设置过。读取方按各自默认值处理；**读取失败按已关闭处理**。
-- 存量零影响、无需回填。
--
-- 影响面：仅 User 表新增一个可空 Json 列，不改任何既有列、不改既有查询。

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacySettings" JSONB;
