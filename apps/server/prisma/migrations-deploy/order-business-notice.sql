-- 仅供空库基线：Prisma不能表达CHECK，须在登记新增08迁移前同事务补齐。
ALTER TABLE "OrderBusinessNotice" ADD CONSTRAINT "OrderBusinessNotice_shape_check" CHECK (
  "sourceVersion"='ORDER_NOTICE_V1' AND "kind" IN ('ORDER_PAID','ORDER_REFUNDED')
  AND "eventKey"="kind" || ':' || "orderId"
  AND ("kind" <> 'ORDER_PAID' OR "readyAt" IS NOT NULL)
);
