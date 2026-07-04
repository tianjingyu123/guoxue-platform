-- P2-c switch: enable ledger-based withdrawable (idempotent)
INSERT INTO "ConfigSystem" ("id", "configKey", "configValue", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'settlement.ledger_withdrawable.enabled', 'true', 'P2-c: withdrawable balance reads LedgerEntry (engine authoritative). Set false to rollback to legacy.', NOW(), NOW())
ON CONFLICT ("configKey") DO UPDATE SET "configValue" = 'true', "updatedAt" = NOW();
