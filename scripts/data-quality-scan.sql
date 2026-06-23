\encoding UTF8
\pset pager off
\set ON_ERROR_STOP off

-- =====================================================================
-- guoxue 数据库 · 核心表数据质量扫描 (只读)
-- 用法:
--   psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -f scripts/data-quality-scan.sql > dq-report.txt
-- 请先设置环境变量: DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
-- 跑完把末尾 FINDINGS / ROW COUNTS / SUMMARY 三段贴回来即可。
-- 说明: 纯只读; 含 ClassicChapter(52万行)等大表全扫, 约需 1-3 分钟, 请耐心。
-- 维度: 列名空白 / 文本卫生(空串.首尾空白.控制符.U+FFFD) / 时间倒挂
--       / 外键孤儿 / 重复值 / 古籍专项(章节计数.源编号残留.空正文)
-- =====================================================================

DROP TABLE IF EXISTS _dq_findings;
CREATE TEMP TABLE _dq_findings (
  seq serial, severity text, category text, tbl text, col text,
  metric text, cnt bigint, pct numeric(6,2), detail text
);

DROP TABLE IF EXISTS _dq_core;
CREATE TEMP TABLE _dq_core (tbl text);
INSERT INTO _dq_core(tbl) VALUES
 ('ClassicBook'),('ClassicChapter'),('ClassicOcrText'),('ClassicImage'),
 ('ClassicCommentary'),('Poetry'),('BaziKnowledge'),('PlatformKnowledge'),
 ('CircleKnowledge'),('WanNianLiDay'),('Content'),('Article'),('User'),
 ('Auth'),('Post'),('Comment'),('Notification'),('Circle'),('CircleMember'),
 ('Course'),('CourseChapter'),('Video'),('Product'),('ProductCategory'),
 ('Category'),('ConfigSystem'),('RolePermission'),('Permission');

-- 1) SCHEMA: 列名首尾空白 (全库)
INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,detail)
SELECT 'HIGH','schema',table_name,column_name,'column name has edge whitespace',1,
       'len='||length(column_name)
FROM information_schema.columns
WHERE table_schema='public' AND column_name <> btrim(column_name);

-- 2) 文本列卫生 (核心表所有 text 列)
DO $outer$
DECLARE
  r record;
  v_total bigint; v_null bigint; v_blank bigint; v_edge bigint; v_ctrl bigint; v_repl bigint;
BEGIN
  FOR r IN
    SELECT c.table_name AS t, c.column_name AS c
    FROM information_schema.columns c
    JOIN _dq_core ct ON ct.tbl = c.table_name
    WHERE c.table_schema='public'
      AND c.data_type IN ('text','character varying','character')
  LOOP
    BEGIN
      EXECUTE format($q$
        SELECT count(*),
               count(*) FILTER (WHERE %1$I IS NULL),
               count(*) FILTER (WHERE %1$I = ''),
               count(*) FILTER (WHERE %1$I IS NOT NULL AND %1$I <> btrim(%1$I, E' \t\n\r')),
               count(*) FILTER (WHERE translate(%1$I, E'\t\n\r','') ~ '[[:cntrl:]]'),
               count(*) FILTER (WHERE position(U&'\fffd' IN %1$I) > 0)
        FROM %2$I
      $q$, r.c, r.t)
      INTO v_total, v_null, v_blank, v_edge, v_ctrl, v_repl;

      IF v_blank > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,pct)
        VALUES('MED','blank',r.t,r.c,'empty string',v_blank,round(100.0*v_blank/NULLIF(v_total,0),2));
      END IF;
      IF v_edge > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,pct)
        VALUES('MED','hygiene',r.t,r.c,'leading/trailing whitespace',v_edge,round(100.0*v_edge/NULLIF(v_total,0),2));
      END IF;
      IF v_ctrl > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,pct)
        VALUES('HIGH','hygiene',r.t,r.c,'control chars (non tab/lf/cr)',v_ctrl,round(100.0*v_ctrl/NULLIF(v_total,0),2));
      END IF;
      IF v_repl > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,pct)
        VALUES('HIGH','encoding',r.t,r.c,'U+FFFD replacement char',v_repl,round(100.0*v_repl/NULLIF(v_total,0),2));
      END IF;
    EXCEPTION WHEN others THEN
      INSERT INTO _dq_findings(severity,category,tbl,col,metric,detail)
      VALUES('INFO','scan-error',r.t,r.c,'check skipped',SQLERRM);
    END;
  END LOOP;
END $outer$;

-- 3) 一致性: updatedAt < createdAt
DO $outer$
DECLARE r record; n bigint;
BEGIN
  FOR r IN
    SELECT ct.tbl AS t FROM _dq_core ct
    WHERE EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=ct.tbl AND column_name='createdAt')
      AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=ct.tbl AND column_name='updatedAt')
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE "updatedAt" < "createdAt"', r.t) INTO n;
    IF n > 0 THEN
      INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt)
      VALUES('MED','consistency',r.t,'updatedAt','updatedAt < createdAt',n);
    END IF;
  END LOOP;
END $outer$;

-- 4) 完整性: 外键孤儿 (单列 FK, 全库)
DO $outer$
DECLARE r record; n bigint;
BEGIN
  FOR r IN
    SELECT cl.relname AS child, att.attname AS child_col,
           pcl.relname AS parent, patt.attname AS parent_col
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid=con.conrelid
    JOIN pg_namespace ns ON ns.oid=cl.relnamespace AND ns.nspname='public'
    JOIN pg_class pcl ON pcl.oid=con.confrelid
    JOIN pg_attribute att  ON att.attrelid=con.conrelid  AND att.attnum=con.conkey[1]
    JOIN pg_attribute patt ON patt.attrelid=con.confrelid AND patt.attnum=con.confkey[1]
    WHERE con.contype='f' AND array_length(con.conkey,1)=1
  LOOP
    BEGIN
      EXECUTE format($q$SELECT count(*) FROM %I c WHERE c.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %I p WHERE p.%I = c.%I)$q$,
                     r.child, r.child_col, r.parent, r.parent_col, r.child_col) INTO n;
      IF n > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,detail)
        VALUES('HIGH','integrity',r.child,r.child_col,'orphan FK rows',n,'-> '||r.parent||'.'||r.parent_col);
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $outer$;

-- 5) 重复: 核心表 title/name 同值分组
DO $outer$
DECLARE r record; n bigint;
BEGIN
  FOR r IN
    SELECT ct.tbl AS t,
           (SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name=ct.tbl
               AND column_name IN ('title','name') ORDER BY column_name LIMIT 1) AS nc
    FROM _dq_core ct
  LOOP
    IF r.nc IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format($q$SELECT count(*) FROM (SELECT %1$I FROM %2$I WHERE %1$I IS NOT NULL GROUP BY %1$I HAVING count(*)>1) d$q$,
                     r.nc, r.t) INTO n;
      IF n > 0 THEN
        INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,detail)
        VALUES('MED','duplication',r.t,r.nc,'duplicate value groups',n,'same '||r.nc);
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $outer$;

-- 6) 古籍专项
INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt)
SELECT 'MED','consistency','ClassicBook','chapterCount','chapterCount <> real chapter count',count(*)
FROM (
  SELECT b.id, b."chapterCount" AS rec, count(c.id) AS act
  FROM "ClassicBook" b LEFT JOIN "ClassicChapter" c ON c."bookId"=b.id
  GROUP BY b.id, b."chapterCount"
  HAVING b."chapterCount" IS DISTINCT FROM count(c.id)
) t;

INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt,detail)
SELECT 'LOW','content','ClassicBook','title','title has latin letters (source-id residue?)',count(*),
       'e.g. /CK-KZ, KR####, pinyin'
FROM "ClassicBook" WHERE title ~ '[A-Za-z]';

INSERT INTO _dq_findings(severity,category,tbl,col,metric,cnt)
SELECT 'HIGH','completeness','ClassicChapter','content','empty content',count(*)
FROM "ClassicChapter" WHERE content IS NULL OR content='';

-- 7) 行数概览 (核心表)
DO $outer$
DECLARE r record; n bigint;
BEGIN
  FOR r IN SELECT tbl FROM _dq_core LOOP
    EXECUTE format('SELECT count(*) FROM %I', r.tbl) INTO n;
    INSERT INTO _dq_findings(severity,category,tbl,metric,cnt)
    VALUES('INFO','rowcount',r.tbl,'row count',n);
  END LOOP;
END $outer$;

-- ===================== 输出 =====================
\echo ''
\echo '================ FINDINGS (problem list) ================'
SELECT severity, category, tbl, col, metric, cnt, pct, detail
FROM _dq_findings
WHERE category <> 'rowcount'
ORDER BY CASE severity WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END,
         category, tbl, col;

\echo ''
\echo '================ ROW COUNTS (core tables) ================'
SELECT tbl, cnt AS rows FROM _dq_findings WHERE category='rowcount' ORDER BY cnt DESC;

\echo ''
\echo '================ SUMMARY ================'
SELECT severity, count(*) AS findings
FROM _dq_findings WHERE category<>'rowcount'
GROUP BY severity
ORDER BY CASE severity WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END;
