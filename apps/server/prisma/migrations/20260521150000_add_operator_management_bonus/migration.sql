-- Station: 添加 operatorId 字段（站长归属运营商）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Station' AND column_name = 'operatorId'
  ) THEN
    ALTER TABLE "Station" ADD COLUMN "operatorId" TEXT;
  END IF;
END $$;

-- Operator: 添加 totalEarning 字段
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Operator' AND column_name = 'totalEarning'
  ) THEN
    ALTER TABLE "Operator" ADD COLUMN "totalEarning" DECIMAL(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 创建 OperatorEarning 表
CREATE TABLE IF NOT EXISTS "OperatorEarning" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "earned" DECIMAL(10,2) NOT NULL,
    "sourceStationId" TEXT,
    "sourceOperatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorEarning_pkey" PRIMARY KEY ("id")
);

-- 索引
CREATE INDEX IF NOT EXISTS "Station_operatorId_idx" ON "Station"("operatorId");
CREATE INDEX IF NOT EXISTS "OperatorEarning_operatorId_createdAt_idx" ON "OperatorEarning"("operatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "OperatorEarning_orderId_idx" ON "OperatorEarning"("orderId");

-- 外键
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Station_operatorId_fkey'
  ) THEN
    ALTER TABLE "Station" ADD CONSTRAINT "Station_operatorId_fkey"
      FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'OperatorEarning_operatorId_fkey'
  ) THEN
    ALTER TABLE "OperatorEarning" ADD CONSTRAINT "OperatorEarning_operatorId_fkey"
      FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Operator 自引用外键（parentOperatorId）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Operator_parentOperatorId_fkey'
  ) THEN
    ALTER TABLE "Operator" ADD CONSTRAINT "Operator_parentOperatorId_fkey"
      FOREIGN KEY ("parentOperatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
