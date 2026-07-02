
## 2026-06-30T03:50:36.842Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 98.27%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| UPDATE "public"."Content" SET "status" = $1, "scheduledAt" | 9 | 1 | 0.136 | 225 | 0 | 100.0 |
| SELECT "public"."Article"."id", "public"."Article"."viewCo | 2 | 0 | 0.167 | 40 | 0 | 100.0 |
| SELECT $1 | 35 | 0 | 0.007 | 0 | 0 | — |
| UPDATE "public"."Post" SET "status" = $1, "scheduledAt" =  | 9 | 0 | 0.023 | 54 | 0 | 100.0 |
| SELECT "public"."AudioCallRecord"."id", "public"."AudioCal | 9 | 0 | 0.02 | 21 | 0 | 100.0 |
| UPDATE "public"."Course" SET "auditStatus" = $1, "createdA | 9 | 0 | 0.018 | 9 | 0 | 100.0 |
| SELECT "public"."LiveRoom"."id" FROM "public"."LiveRoom" W | 9 | 0 | 0.017 | 9 | 0 | 100.0 |
| SELECT "public"."Circle"."id", "public"."Circle"."memberCo | 2 | 0 | 0.069 | 16 | 0 | 100.0 |
| UPDATE "public"."Course" SET "auditStatus" = $1, "schedule | 9 | 0 | 0.013 | 18 | 0 | 100.0 |
| UPDATE "public"."Article" SET "auditStatus" = $1, "schedul | 9 | 0 | 0.011 | 18 | 0 | 100.0 |

## 2026-06-30T16:00:10.178Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 98.18%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 17389 | 16374 | 0.942 | 868400 | 379911 | 69.6 |
| CREATE INDEX "ClassicChapter_deletedAt_idx" ON "ClassicCha | 1 | 115 | 115.175 | 21702 | 15 | 99.9 |
| UPDATE "public"."Content" SET "status" = $1, "scheduledAt" | 738 | 96 | 0.13 | 18450 | 0 | 100.0 |
| INSERT INTO "public"."AuditLog" ("id","userId","executor", | 20 | 47 | 2.365 | 1940 | 66 | 96.7 |
| INSERT INTO "public"."ConfigSystem" ("id","configKey","con | 34 | 33 | 0.981 | 887 | 28 | 96.9 |
| SELECT table_name, column_name FROM information_schema.col | 1 | 32 | 31.783 | 15762 | 97 | 99.4 |
| SELECT "public"."Article"."id", "public"."Article"."viewCo | 148 | 21 | 0.143 | 2877 | 17 | 99.4 |
| UPDATE "public"."Post" SET "status" = $1, "scheduledAt" =  | 738 | 18 | 0.025 | 4428 | 0 | 100.0 |
| SELECT $1 | 2829 | 16 | 0.006 | 0 | 0 | — |
| SELECT "public"."ClassicBook"."id", "public"."ClassicBook" | 1 | 15 | 15.327 | 642 | 0 | 100.0 |

## 2026-07-01T16:00:03.300Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 98.11%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 34778 | 71223 | 2.048 | 1723491 | 773009 | 69.0 |
| UPDATE "public"."Content" SET "status" = $1, "scheduledAt" | 2174 | 289 | 0.133 | 54350 | 0 | 100.0 |
| INSERT INTO "public"."AuditLog" ("id","userId","executor", | 59 | 171 | 2.901 | 5612 | 120 | 97.9 |
| INSERT INTO "public"."ConfigSystem" ("id","configKey","con | 98 | 121 | 1.237 | 2734 | 55 | 98.0 |
| CREATE INDEX "ClassicChapter_deletedAt_idx" ON "ClassicCha | 1 | 115 | 115.175 | 21702 | 15 | 99.9 |
| SELECT "public"."Article"."id", "public"."Article"."viewCo | 434 | 76 | 0.174 | 8424 | 34 | 99.6 |
| SELECT table_name, column_name FROM information_schema.col | 3 | 63 | 21.069 | 47494 | 97 | 99.8 |
| UPDATE "public"."Post" SET "status" = $1, "scheduledAt" =  | 2174 | 55 | 0.025 | 13044 | 0 | 100.0 |
| SELECT $1 | 8455 | 47 | 0.006 | 0 | 0 | — |
| UPDATE "public"."Course" SET "auditStatus" = $1, "createdA | 2174 | 44 | 0.02 | 2174 | 0 | 100.0 |
