-- M4 灰度第一步：User 手机号加密列（2026-06-29）
-- 加 phoneHash(确定性HMAC，等值查询/唯一约束) + phoneEnc(密文，展示用)，均可空（存量回填前为 null）。
-- 不动 phone 明文列（灰度期保留，切读完成后再删）。唯一索引允许多 null，安全。
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneHash" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneEnc" text;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneHash_key" ON "User"("phoneHash");
