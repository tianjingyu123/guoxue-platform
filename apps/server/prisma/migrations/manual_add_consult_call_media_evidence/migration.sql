-- 只保存归一化回调证据，不包含原始报文或鉴权票据。
ALTER TABLE "ConsultCallMediaBoundary" ADD COLUMN "mediaEvidence" JSONB;
CREATE INDEX "ConsultCall_rtcRoomId_idx" ON "ConsultCall"("rtcRoomId");
