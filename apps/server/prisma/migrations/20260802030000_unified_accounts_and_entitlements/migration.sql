-- 统一账号与权益中心（仅增量迁移；保留全部现有用户、订单和认证数据）。

-- 1. Auth 从“每用户每提供方一行”升级为“每用户可绑定多个应用身份”。
ALTER TABLE "Auth"
  ADD COLUMN IF NOT EXISTS "namespace" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "appId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 旧认证行原样转成稳定身份；微信旧行保留 legacy 作用域，首次成功登录时再安全归位到真实 appId。
UPDATE "Auth"
SET
  "namespace" = CASE
    WHEN provider = 'PASSWORD' THEN 'password'
    WHEN provider = 'PHONE' THEN 'phone'
    WHEN provider = 'WECHAT' THEN 'wechat:legacy'
    ELSE 'legacy:' || lower(provider)
  END,
  "subject" = CASE
    WHEN provider = 'PASSWORD' THEN "userId"
    WHEN provider = 'PHONE' THEN COALESCE("openId", credential, "userId")
    WHEN provider = 'WECHAT' THEN COALESCE("openId", id)
    ELSE COALESCE("openId", "userId", id)
  END
WHERE "subject" IS NULL;

DROP INDEX IF EXISTS "Auth_userId_provider_key";
DROP INDEX IF EXISTS "Auth_openId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Auth_provider_namespace_subject_key"
  ON "Auth"(provider, "namespace", subject);
CREATE INDEX IF NOT EXISTS "Auth_userId_provider_idx" ON "Auth"("userId", provider);
CREATE INDEX IF NOT EXISTS "Auth_provider_unionId_idx" ON "Auth"(provider, "unionId");
CREATE INDEX IF NOT EXISTS "Auth_appId_openId_idx" ON "Auth"("appId", "openId");

-- 2. 会员购买与原始订单建立可追溯关系（历史记录和管理员赠送保持 NULL）。
ALTER TABLE "MemberPurchase"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberPurchase_orderId_key" ON "MemberPurchase"("orderId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberPurchase_orderId_fkey') THEN
    ALTER TABLE "MemberPurchase"
      ADD CONSTRAINT "MemberPurchase_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- 3. 不可变权益流水。
CREATE TABLE IF NOT EXISTS "EntitlementLedger" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entitlementKey" TEXT NOT NULL,
  kind TEXT NOT NULL,
  "resourceType" TEXT NOT NULL DEFAULT '',
  "resourceId" TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'GLOBAL',
  action TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "reversesLedgerId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntitlementLedger_pkey" PRIMARY KEY (id),
  CONSTRAINT "EntitlementLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EntitlementLedger_idempotencyKey_key" ON "EntitlementLedger"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "EntitlementLedger_userId_entitlementKey_createdAt_idx" ON "EntitlementLedger"("userId", "entitlementKey", "createdAt");
CREATE INDEX IF NOT EXISTS "EntitlementLedger_sourceType_sourceId_idx" ON "EntitlementLedger"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "EntitlementLedger_reversesLedgerId_idx" ON "EntitlementLedger"("reversesLedgerId");
CREATE INDEX IF NOT EXISTS "EntitlementLedger_validUntil_idx" ON "EntitlementLedger"("validUntil");

-- 4. 权益当前投影：所有终端只读这一份聚合状态，version 支撑并发原子消费。
CREATE TABLE IF NOT EXISTS "EntitlementBalance" (
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entitlementKey" TEXT NOT NULL,
  kind TEXT NOT NULL,
  "resourceType" TEXT NOT NULL DEFAULT '',
  "resourceId" TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'GLOBAL',
  quantity INTEGER NOT NULL DEFAULT 0,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  version INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntitlementBalance_pkey" PRIMARY KEY (id),
  CONSTRAINT "EntitlementBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EntitlementBalance_userId_entitlementKey_resourceType_resourceId_scope_key"
  ON "EntitlementBalance"("userId", "entitlementKey", "resourceType", "resourceId", scope);
CREATE INDEX IF NOT EXISTS "EntitlementBalance_userId_status_validUntil_idx" ON "EntitlementBalance"("userId", status, "validUntil");
CREATE INDEX IF NOT EXISTS "EntitlementBalance_entitlementKey_resourceId_idx" ON "EntitlementBalance"("entitlementKey", "resourceId");
