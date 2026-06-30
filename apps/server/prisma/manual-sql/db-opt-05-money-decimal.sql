-- P3 金额字段 Float→Decimal（2026-06-29 数据库优化）
-- 三列原为 double precision，违反「金额用 DECIMAL」铁律，存在精度隐患（其余 price 列全已是 Decimal）。
-- 表数据近乎空，USING 转换无精度损失。DDL 可在事务内，多条同文件执行。
-- 注：ToolRecord 等「32工具系统」表经查为未实装的规划表（非垃圾），本轮不删，留产品决策。
ALTER TABLE "AiAnalysisRecord" ALTER COLUMN "cost" TYPE numeric(10,4) USING "cost"::numeric;
ALTER TABLE "AiCapability" ALTER COLUMN "costPerCall" TYPE numeric(10,4) USING "costPerCall"::numeric;
ALTER TABLE "StationTeacherBooking" ALTER COLUMN "price" TYPE numeric(10,2) USING "price"::numeric;
