ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_idempotencyKey_key"
  ON "Notification"("idempotencyKey");
