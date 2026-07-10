
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

## 2026-07-02T16:00:02.753Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 98.05%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 52167 | 119787 | 2.296 | 2570764 | 1172057 | 68.7 |
| UPDATE "public"."Content" SET "status" = $1, "scheduledAt" | 3545 | 478 | 0.135 | 88600 | 26 | 100.0 |
| INSERT INTO "public"."AuditLog" ("id","userId","executor", | 96 | 272 | 2.831 | 8944 | 201 | 97.8 |
| INSERT INTO "public"."ConfigSystem" ("id","configKey","con | 159 | 168 | 1.055 | 4306 | 89 | 98.0 |
| SELECT "public"."Article"."id", "public"."Article"."viewCo | 709 | 124 | 0.174 | 13716 | 68 | 99.5 |
| CREATE INDEX "ClassicChapter_deletedAt_idx" ON "ClassicCha | 1 | 115 | 115.175 | 21702 | 15 | 99.9 |
| UPDATE "public"."Post" SET "status" = $1, "scheduledAt" =  | 3545 | 93 | 0.026 | 21264 | 6 | 100.0 |
| SELECT $1 | 13791 | 76 | 0.005 | 0 | 0 | — |
| UPDATE "public"."Course" SET "auditStatus" = $1, "createdA | 3545 | 73 | 0.021 | 3544 | 1 | 100.0 |
| SELECT "public"."AudioCallRecord"."id", "public"."AudioCal | 3544 | 68 | 0.019 | 5454 | 0 | 100.0 |

## 2026-07-03T16:00:03.730Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.02%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 67117 | 167591 | 2.497 | 3342588 | 1553537 | 68.3 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-04T16:00:03.813Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.08%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 82067 | 226560 | 2.761 | 4136616 | 1931963 | 68.2 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-05T16:00:02.993Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.1%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 82067 | 226560 | 2.761 | 4136616 | 1931963 | 68.2 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-06T16:00:02.482Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.15%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 97017 | 271171 | 2.795 | 4891715 | 2321724 | 67.8 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-07T16:00:02.548Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.2%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 111967 | 304920 | 2.723 | 5674996 | 2708132 | 67.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-08T16:00:02.908Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.21%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 111967 | 304920 | 2.723 | 5674996 | 2708132 | 67.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |

## 2026-07-09T16:00:02.492Z
基线重置于 Mon Jun 29 2026 20:41:38 GMT-0700 (Pacific Daylight Time) ｜ 全库缓存命中率 96.25%

| query | calls | total_ms | mean_ms | hit | read | hit% |
|---|--:|--:|--:|--:|--:|--:|
| SELECT "public"."ClassicChapter"."id", "public"."ClassicCh | 126917 | 347413 | 2.737 | 6428998 | 3098226 | 67.5 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 3 | 90995 | 30331.679 | 6224539 | 1303390 | 82.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 23935 | 23934.701 | 2101943 | 437883 | 82.8 |
| DELETE FROM "ClassicChapter" WHERE content LIKE $1 OR cont | 1 | 23764 | 23764.134 | 2197902 | 437808 | 83.4 |
| WITH per_book AS ( SELECT b.id, b.title, count(c.id) AS ch | 1 | 23218 | 23218.452 | 2096672 | 437076 | 82.7 |
| SELECT count(*) AS total_chapters, count(*) FILTER (WHERE  | 1 | 20462 | 20462.484 | 3369387 | 427766 | 88.7 |
| WITH per_book AS ( SELECT b.id, b.title, b.source, count(c | 1 | 12971 | 12970.549 | 840972 | 436972 | 65.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10505 | 10505.278 | 2101829 | 436799 | 82.8 |
| WITH per_book AS ( SELECT "bookId", count(*) AS ch, count( | 1 | 10259 | 10258.751 | 2101405 | 437865 | 82.8 |
| SELECT count(DISTINCT c."bookId") AS books, count(*) AS ch | 1 | 10107 | 10106.842 | 2050604 | 426031 | 82.8 |
