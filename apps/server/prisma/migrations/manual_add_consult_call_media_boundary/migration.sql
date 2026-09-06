-- 咨询资源凭据边界，不存签名或密钥；历史订单不伪造边界。
CREATE TABLE "ConsultCallMediaBoundary" (
    "callId" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ConsultCallMediaBoundary_pkey" PRIMARY KEY ("callId")
);
ALTER TABLE "ConsultCallMediaBoundary" ADD CONSTRAINT "ConsultCallMediaBoundary_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "ConsultCall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
