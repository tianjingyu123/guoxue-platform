-- 回滚：删除固件发布相关两张表（会丢失发布记录与推送状态；固件文件本身在对象存储里，需另行清理）
-- 执行前请确认没有正在灰度的发布：SELECT count(*) FROM "VoiceFirmwareRelease" WHERE status = 'active';
DROP TABLE IF EXISTS "VoiceFirmwareDeviceState";
DROP TABLE IF EXISTS "VoiceFirmwareRelease";
