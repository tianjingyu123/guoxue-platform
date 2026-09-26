-- 回滚：删除 lastInputAt 列（只影响空闲判定，不涉及额度与费用数据）
ALTER TABLE "VoiceSession" DROP COLUMN IF EXISTS "lastInputAt";
