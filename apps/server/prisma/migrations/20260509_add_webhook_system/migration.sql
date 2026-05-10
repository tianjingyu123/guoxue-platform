-- Webhook 订阅系统

-- 1. 创建枚举类型
DO $$ BEGIN
  CREATE TYPE "WebhookEvent" AS ENUM (
    'ORDER_PAID',
    'ORDER_REFUNDED',
    'USER_REGISTERED',
    'CONTENT_PUBLISHED',
    'WITHDRAWAL_REQUESTED',
    'COURSE_ENROLLED',
    'LIVE_STARTED',
    'LIVE_ENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 创建 Webhook 订阅表
CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
  "id"          TEXT            NOT NULL PRIMARY KEY,
  "event"       "WebhookEvent"  NOT NULL,
  "url"         TEXT            NOT NULL,
  "secret"      TEXT,
  "description" TEXT,
  "isActive"    BOOLEAN         NOT NULL DEFAULT true,
  "lastSentAt"  TIMESTAMP(3),
  "lastStatus"  INTEGER,
  "retryCount"  INTEGER         NOT NULL DEFAULT 0,
  "maxRetries"  INTEGER         NOT NULL DEFAULT 3,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_webhook_event_active ON "WebhookSubscription"("event", "isActive");
CREATE INDEX IF NOT EXISTS idx_webhook_url ON "WebhookSubscription"("url");
