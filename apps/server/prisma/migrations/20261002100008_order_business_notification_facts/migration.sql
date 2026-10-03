-- 仅新增空事实表；不扫描旧订单，不回填、不发送历史通知。
CREATE TABLE "OrderBusinessNotice" (
  "eventKey" VARCHAR(200) NOT NULL,
  "orderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "sourceVersion" VARCHAR(32) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  CONSTRAINT "OrderBusinessNotice_pkey" PRIMARY KEY ("eventKey"),
  CONSTRAINT "OrderBusinessNotice_shape_check" CHECK (
    "sourceVersion"='ORDER_NOTICE_V1' AND "kind" IN ('ORDER_PAID','ORDER_REFUNDED')
    AND "eventKey"="kind" || ':' || "orderId"
    AND ("kind" <> 'ORDER_PAID' OR "readyAt" IS NOT NULL)
  ),
  CONSTRAINT "OrderBusinessNotice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderBusinessNotice_createdAt_eventKey_idx" ON "OrderBusinessNotice"("createdAt", "eventKey");
