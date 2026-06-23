-- Health dashboard — simple and fast
DROP FUNCTION IF EXISTS db_health_score();

CREATE OR REPLACE FUNCTION db_health_score()
RETURNS TABLE(category text, score int, max_score int) AS $$
DECLARE
  v_cnt bigint;
  v_dq int := 0; v_int int := 0; v_perf int := 0; v_maint int := 0;
BEGIN
  -- Data quality (fast checks only)
  SELECT count(*) INTO v_cnt FROM "ClassicChapter" WHERE content LIKE '%'||E'\xEF\xBF\xBD'||'%' LIMIT 1;
  IF v_cnt = 0 THEN v_dq := v_dq + 10; END IF;
  SELECT count(*) INTO v_cnt FROM "ClassicBook" WHERE btrim(title) != title LIMIT 1;
  IF v_cnt = 0 THEN v_dq := v_dq + 10; END IF;

  -- Integrity
  SELECT count(*) INTO v_cnt FROM "Circle" c WHERE c."memberCount" != (SELECT count(*) FROM "CircleMember" WHERE "circleId" = c.id) LIMIT 1;
  IF v_cnt = 0 THEN v_int := v_int + 10; END IF;
  SELECT count(*) INTO v_cnt FROM "Product" p WHERE p."salesCount" != (SELECT count(*) FROM "Order" o WHERE o."targetId" = p.id AND o.status IN ('PAID','SHIPPED','COMPLETED')) LIMIT 1;
  IF v_cnt = 0 THEN v_int := v_int + 10; END IF;

  -- Performance
  SELECT count(*) INTO v_cnt FROM pg_stat_user_tables WHERE n_dead_tup > n_live_tup * 0.1 AND n_live_tup > 100 LIMIT 1;
  IF v_cnt = 0 THEN v_perf := v_perf + 10; END IF;
  SELECT count(*) INTO v_cnt FROM pg_stat_user_indexes WHERE idx_scan = 0 AND pg_relation_size(indexrelid) > 1048576 LIMIT 1;
  IF v_cnt = 0 THEN v_perf := v_perf + 10; END IF;

  -- Maintenance
  SELECT count(*) INTO v_cnt FROM "Product" WHERE price < 0 LIMIT 1;
  IF v_cnt = 0 THEN v_maint := v_maint + 10; END IF;
  SELECT count(*) INTO v_cnt FROM "Coupon" WHERE status = 'ACTIVE' AND "validEnd" < now() LIMIT 1;
  IF v_cnt = 0 THEN v_maint := v_maint + 10; END IF;

  RETURN QUERY
    SELECT '数据质量'::text, v_dq, 20
    UNION ALL SELECT '完整性', v_int, 20
    UNION ALL SELECT '性能', v_perf, 20
    UNION ALL SELECT '运维', v_maint, 20
    UNION ALL SELECT '总评', v_dq+v_int+v_perf+v_maint, 80;
END;
$$ LANGUAGE plpgsql;

SELECT category,
  repeat('█', (score * 10 / max_score)::int) || repeat('░', 10 - (score * 10 / max_score)::int) AS bar,
  score || '/' || max_score AS score_text
FROM db_health_score();
