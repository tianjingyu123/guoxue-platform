-- ============================================================
-- guoxue 数据库质量自动化监控
-- 用法: psql -f scripts/data-quality-monitor.sql
-- 覆盖: 文本卫生/完整性/一致性/唯一性/业务逻辑/编码/约束/膨胀
-- 输出: PASS/FAIL 报告 + 违规详情
-- ============================================================

-- 监控结果表（保留历史快照）
CREATE TABLE IF NOT EXISTS "_quality_snapshot" (
  id          BIGSERIAL PRIMARY KEY,
  check_time  TIMESTAMP NOT NULL DEFAULT now(),
  dimension   TEXT NOT NULL,
  check_name  TEXT NOT NULL,
  status      TEXT NOT NULL,  -- PASS | FAIL | WARN
  detail      TEXT,
  row_count   BIGINT
);
CREATE INDEX IF NOT EXISTS "_quality_snapshot_time_idx" ON "_quality_snapshot" (check_time);
CREATE INDEX IF NOT EXISTS "_quality_snapshot_dim_idx" ON "_quality_snapshot" (dimension);

-- ============================================================
-- 监控函数
-- ============================================================
CREATE OR REPLACE FUNCTION run_quality_check(
  p_dimension TEXT,
  p_check_name TEXT,
  p_sql TEXT,
  p_threshold BIGINT DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_count BIGINT;
  v_status TEXT;
  v_detail TEXT;
BEGIN
  EXECUTE p_sql INTO v_count;

  IF v_count IS NULL THEN
    v_status := 'FAIL';
    v_detail := 'Query returned NULL';
  ELSIF v_count > p_threshold THEN
    v_status := 'FAIL';
    v_detail := format('Found %s violations (threshold: %s)', v_count, p_threshold);
  ELSE
    v_status := 'PASS';
    v_detail := format('Clean (%s violations, threshold: %s)', v_count, p_threshold);
  END IF;

  INSERT INTO "_quality_snapshot" (dimension, check_name, status, detail, row_count)
  VALUES (p_dimension, p_check_name, v_status, v_detail, v_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DIMENSION 1: TEXT HYGIENE
-- ============================================================
\echo '=== DIMENSION 1: TEXT HYGIENE ==='

-- 1a: U+FFFD replacement characters
SELECT run_quality_check('text_hygiene', 'U+FFFD_in_text_columns',
  $$SELECT count(*) FROM (
    SELECT 1 FROM "ClassicChapter" WHERE content LIKE '%'||E'\xEF\xBF\xBD'||'%'
    UNION ALL SELECT 1 FROM "ClassicBook" WHERE title LIKE '%'||E'\xEF\xBF\xBD'||'%'
    UNION ALL SELECT 1 FROM "User" WHERE nickname LIKE '%'||E'\xEF\xBF\xBD'||'%'
    UNION ALL SELECT 1 FROM "PlatformKnowledge" WHERE content LIKE '%'||E'\xEF\xBF\xBD'||'%'
    UNION ALL SELECT 1 FROM "ConfigSystem" WHERE "configValue" LIKE '%'||E'\xEF\xBF\xBD'||'%'
  ) t$$, 0);

-- 1b: Zero-width characters
SELECT run_quality_check('text_hygiene', 'zero_width_chars',
  $$SELECT count(*) FROM "ClassicChapter" WHERE content ~ E'[​‌‍﻿]'$$, 0);

-- 1c: Leading/trailing whitespace in key columns
SELECT run_quality_check('text_hygiene', 'whitespace_in_titles',
  $$SELECT count(*) FROM "ClassicBook" WHERE btrim(title) != title$$, 0);

-- 1d: Control characters
SELECT run_quality_check('text_hygiene', 'control_characters',
  $$SELECT count(*) FROM "ClassicChapter" WHERE content ~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'$$, 0);

-- ============================================================
-- DIMENSION 2: REFERENTIAL INTEGRITY
-- ============================================================
\echo '=== DIMENSION 2: REFERENTIAL INTEGRITY ==='

SELECT run_quality_check('integrity', 'orphan_ClassicChapter',
  $$SELECT count(*) FROM "ClassicChapter" cc LEFT JOIN "ClassicBook" cb ON cc."bookId" = cb.id WHERE cb.id IS NULL$$, 0);

SELECT run_quality_check('integrity', 'orphan_User',
  $$SELECT count(*) FROM "Auth" a LEFT JOIN "User" u ON a."userId" = u.id WHERE u.id IS NULL$$, 0);

SELECT run_quality_check('integrity', 'orphan_Station',
  $$SELECT count(*) FROM "Station" s LEFT JOIN "User" u ON s."userId" = u.id WHERE u.id IS NULL$$, 0);

-- ============================================================
-- DIMENSION 3: TEMPORAL CONSISTENCY
-- ============================================================
\echo '=== DIMENSION 3: TEMPORAL CONSISTENCY ==='

SELECT run_quality_check('temporal', 'time_inversions',
  $$SELECT sum(cnt) FROM (
    SELECT count(*) AS cnt FROM "ClassicBook" WHERE "updatedAt" < "createdAt"
    UNION ALL SELECT count(*) FROM "ProductSku" WHERE "updatedAt" < "createdAt"
    UNION ALL SELECT count(*) FROM "Order" WHERE "updatedAt" < "createdAt"
    UNION ALL SELECT count(*) FROM "Coupon" WHERE "updatedAt" < "createdAt"
  ) t$$, 0);

SELECT run_quality_check('temporal', 'future_dates',
  $$SELECT count(*) FROM "User" WHERE "createdAt" > now() + interval '1 day'
    UNION ALL SELECT count(*) FROM "Order" WHERE "createdAt" > now() + interval '1 day'$$, 0);

-- ============================================================
-- DIMENSION 4: UNIQUENESS
-- ============================================================
\echo '=== DIMENSION 4: UNIQUENESS ==='

SELECT run_quality_check('uniqueness', 'duplicate_article_titles',
  $$SELECT count(*) FROM (SELECT title FROM "Article" GROUP BY title HAVING count(*) > 1) t$$, 0);

SELECT run_quality_check('uniqueness', 'duplicate_post_titles',
  $$SELECT count(*) FROM (SELECT title FROM "Post" GROUP BY title HAVING count(*) > 1) t$$, 0);

SELECT run_quality_check('uniqueness', 'duplicate_course_titles',
  $$SELECT count(*) FROM (SELECT title FROM "Course" GROUP BY title HAVING count(*) > 1) t$$, 0);

SELECT run_quality_check('uniqueness', 'duplicate_circle_names',
  $$SELECT count(*) FROM (SELECT name FROM "Circle" GROUP BY name HAVING count(*) > 1) t$$, 0);

-- ============================================================
-- DIMENSION 5: NULL KEY COLUMNS
-- ============================================================
\echo '=== DIMENSION 5: NULL KEYS ==='

SELECT run_quality_check('null_keys', 'null_book_titles',
  $$SELECT count(*) FROM "ClassicBook" WHERE title IS NULL OR title = ''$$, 0);

SELECT run_quality_check('null_keys', 'null_coupon_names',
  $$SELECT count(*) FROM "Coupon" WHERE name IS NULL OR name = ''$$, 0);

SELECT run_quality_check('null_keys', 'null_post_titles',
  $$SELECT count(*) FROM "Post" WHERE title IS NULL OR title = ''$$, 0);

-- ============================================================
-- DIMENSION 6: NUMERIC SANITY
-- ============================================================
\echo '=== DIMENSION 6: NUMERIC SANITY ==='

SELECT run_quality_check('numeric', 'negative_prices',
  $$SELECT count(*) FROM "Product" WHERE price < 0
    UNION ALL SELECT count(*) FROM "Course" WHERE price < 0
    UNION ALL SELECT count(*) FROM "Order" WHERE amount <= 0$$, 0);

SELECT run_quality_check('numeric', 'negative_counts',
  $$SELECT count(*) FROM "ClassicBook" WHERE "chapterCount" < 0
    UNION ALL SELECT count(*) FROM "Product" WHERE stock < 0$$, 0);

-- ============================================================
-- DIMENSION 7: STATUS CONSISTENCY
-- ============================================================
\echo '=== DIMENSION 7: STATUS ==='

SELECT run_quality_check('status', 'expired_coupons_active',
  $$SELECT count(*) FROM "Coupon" WHERE status = 'ACTIVE' AND "validEnd" < now()$$, 0);

-- ============================================================
-- DIMENSION 8: CROSS-TABLE COUNTS
-- ============================================================
\echo '=== DIMENSION 8: CROSS-TABLE ==='

SELECT run_quality_check('cross_table', 'circle_memberCount_mismatch',
  $$SELECT count(*) FROM "Circle" c WHERE c."memberCount" != (SELECT count(*) FROM "CircleMember" cm WHERE cm."circleId" = c.id)$$, 0);

SELECT run_quality_check('cross_table', 'product_salesCount_mismatch',
  $$SELECT count(*) FROM "Product" p WHERE p."salesCount" != (SELECT count(*) FROM "Order" o WHERE o."targetId" = p.id AND o.status IN ('PAID','SHIPPED','COMPLETED'))$$, 0);

-- ============================================================
-- DIMENSION 9: TABLE BLOAT
-- ============================================================
\echo '=== DIMENSION 9: BLOAT ==='

SELECT run_quality_check('bloat', 'dead_tuples_ClassicChapter',
  $$SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'ClassicChapter'$$, 100);

SELECT run_quality_check('bloat', 'dead_tuples_ClassicBook',
  $$SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'ClassicBook'$$, 50);

-- ============================================================
-- REPORT GENERATION
-- ============================================================
\echo ''
\echo '========================================'
\echo '  DATA QUALITY MONITORING REPORT'
\echo '========================================'
\echo ''

-- Latest snapshot summary
SELECT
  dimension,
  count(*) FILTER (WHERE status = 'FAIL') AS failures,
  count(*) FILTER (WHERE status = 'PASS') AS passed,
  count(*) FILTER (WHERE status = 'WARN') AS warnings
FROM "_quality_snapshot"
WHERE check_time >= now() - interval '1 minute'
GROUP BY dimension
ORDER BY failures DESC, dimension;

\echo ''
\echo '--- FAILED CHECKS ---'
SELECT check_name, detail, row_count
FROM "_quality_snapshot"
WHERE check_time >= now() - interval '1 minute' AND status = 'FAIL'
ORDER BY dimension, check_name;

\echo ''
\echo '--- HISTORICAL TREND (last 10 runs) ---'
SELECT
  check_time::date AS date,
  count(*) AS total_checks,
  count(*) FILTER (WHERE status = 'FAIL') AS failures,
  count(*) FILTER (WHERE status = 'PASS') AS passed
FROM "_quality_snapshot"
GROUP BY check_time::date
ORDER BY date DESC
LIMIT 10;

\echo ''
\echo '=== MONITORING COMPLETE ==='
