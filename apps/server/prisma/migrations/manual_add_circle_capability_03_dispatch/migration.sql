-- 只增加可靠派发账本；不回填、不调用供应商、不开放圈子能力。
-- 依赖 manual_add_circle_capability_02_quota_ledger；线上执行须另行审查授权。
CREATE TYPE "CircleCapabilityDispatchState" AS ENUM ('READY', 'DISPATCHING', 'CONFIRMED', 'UNKNOWN', 'CANCELLED');

CREATE TABLE "CircleCapabilityDispatch" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "state" "CircleCapabilityDispatchState" NOT NULL DEFAULT 'READY',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "providerOperationKey" TEXT NOT NULL,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "evidenceRef" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleCapabilityDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleCapabilityDispatch_reservationId_key" ON "CircleCapabilityDispatch"("reservationId");
CREATE UNIQUE INDEX "CircleCapabilityDispatch_providerOperationKey_key" ON "CircleCapabilityDispatch"("providerOperationKey");
CREATE UNIQUE INDEX "CircleCapabilityDispatch_leaseToken_key" ON "CircleCapabilityDispatch"("leaseToken");
CREATE INDEX "CircleCapabilityDispatch_state_createdAt_idx" ON "CircleCapabilityDispatch"("state", "createdAt");
CREATE INDEX "CircleCapabilityDispatch_state_leaseUntil_idx" ON "CircleCapabilityDispatch"("state", "leaseUntil");
ALTER TABLE "CircleCapabilityDispatch" ADD CONSTRAINT "CircleCapabilityDispatch_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "CircleCapabilityQuota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
