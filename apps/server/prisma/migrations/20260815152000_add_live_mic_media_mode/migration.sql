-- 连麦申请显式区分语音/视频；默认 AUDIO 保证旧服务滚动发布期间写入兼容。
ALTER TABLE "LiveMic"
ADD COLUMN "mediaMode" TEXT NOT NULL DEFAULT 'AUDIO';

ALTER TABLE "LiveMic"
ADD CONSTRAINT "LiveMic_mediaMode_check"
CHECK ("mediaMode" IN ('AUDIO', 'VIDEO'));

-- 区分观众申请与主播邀请；默认 REQUEST 兼容滚动发布中的旧服务写入。
ALTER TABLE "LiveMic"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'REQUEST';

ALTER TABLE "LiveMic"
ADD CONSTRAINT "LiveMic_source_check"
CHECK ("source" IN ('REQUEST', 'INVITE'));
