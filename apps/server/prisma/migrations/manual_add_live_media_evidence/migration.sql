-- 仅保存脱敏会话证据；不回填旧状态为已证明离线，不修改历史直播。
CREATE TABLE "LiveMediaEvidence" (
    "roomId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "LiveMediaEvidence_pkey" PRIMARY KEY ("roomId")
);
ALTER TABLE "LiveMediaEvidence" ADD CONSTRAINT "LiveMediaEvidence_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
