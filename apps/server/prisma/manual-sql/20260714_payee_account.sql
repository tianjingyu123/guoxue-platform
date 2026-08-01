-- 收款主体表（分账接收方）· 资金架构批次1 地基（2026-07-14）
--
-- 解决的根因：此前 Merchant / StationOffline / Circle 一个渠道商户号字段都没有 ——
-- 商家/驿站/圈主在支付渠道眼里根本不存在，这是所有分账接不通的唯一根因。
--
-- 纯 additive：只建新表，不动任何既有表。

CREATE TABLE IF NOT EXISTS "PayeeAccount" (
  "id"             TEXT NOT NULL,

  -- 主体
  "subjectType"    TEXT NOT NULL,                       -- MERCHANT / OFFLINE_STATION / CIRCLE / INSTITUTE
  "subjectId"      TEXT NOT NULL,
  "userId"         TEXT NOT NULL,

  -- 结算模式：决定「谁是收款主体」，也就决定了责任归属
  -- PLATFORM_COLLECT 平台收款（无照主体只能走这条·平台担经营者责任）
  -- SELF_COLLECT     主体自收（须营业执照·责任随钱外移）
  "settlementMode" TEXT NOT NULL DEFAULT 'PLATFORM_COLLECT',
  -- 平台分成比例：圈子双轨无照 0.5 / 有照 0.2；驿站 0.3；商家按类目
  "platformRate"   DECIMAL(5,4) NOT NULL DEFAULT 0,

  -- 资质（SELF_COLLECT 必需）
  "subjectName"    TEXT,
  "licenseNo"      TEXT,
  "licenseImage"   TEXT,
  "legalName"      TEXT,
  "legalIdCard"    TEXT,                                -- 加密存储（crypto.util encrypt）
  "legalIdFront"   TEXT,
  "legalIdBack"    TEXT,
  "bankName"       TEXT,
  "bankBranch"     TEXT,
  "bankAccount"    TEXT,                                -- 加密存储
  "bankHolder"     TEXT,

  -- 渠道身份（进件成功后回填 —— 分账接收方就靠这几个 ID）
  "huifuId"        TEXT,
  "wxSubMchId"     TEXT,
  "alipayPid"      TEXT,
  "payeeOpenid"    TEXT,

  -- 进件状态机：DRAFT → SUBMITTED → APPROVING → ACTIVE / REJECTED / DISABLED
  "status"         TEXT NOT NULL DEFAULT 'DRAFT',
  "channel"        TEXT NOT NULL DEFAULT 'HUIFU',
  "channelApplyId" TEXT,
  "submittedAt"    TIMESTAMP(3),
  "activatedAt"    TIMESTAMP(3),
  "rejectReason"   TEXT,

  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayeeAccount_pkey" PRIMARY KEY ("id")
);

-- 一个主体只能有一个收款账户
CREATE UNIQUE INDEX IF NOT EXISTS "PayeeAccount_subjectType_subjectId_key"
  ON "PayeeAccount"("subjectType", "subjectId");

-- 汇付商户号全局唯一（防同一渠道号被两个主体绑定 → 钱分错人）
CREATE UNIQUE INDEX IF NOT EXISTS "PayeeAccount_huifuId_key"
  ON "PayeeAccount"("huifuId");

CREATE INDEX IF NOT EXISTS "PayeeAccount_status_idx"                  ON "PayeeAccount"("status");
CREATE INDEX IF NOT EXISTS "PayeeAccount_userId_idx"                  ON "PayeeAccount"("userId");
CREATE INDEX IF NOT EXISTS "PayeeAccount_settlementMode_status_idx"   ON "PayeeAccount"("settlementMode", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayeeAccount_userId_fkey'
  ) THEN
    ALTER TABLE "PayeeAccount"
      ADD CONSTRAINT "PayeeAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
