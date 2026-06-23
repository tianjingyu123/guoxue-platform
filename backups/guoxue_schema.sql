--
-- PostgreSQL database dump
--

\restrict 1XYaubpXcVnrPXRJUgE4EWqGPKa3vSGsTwTSecC66r2kx8uO3DAVXOmfArSiUsr

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: BehaviorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BehaviorType" AS ENUM (
    'VIEW',
    'LIKE',
    'COLLECT',
    'COMMENT',
    'PURCHASE',
    'LEARN',
    'SEARCH',
    'SHARE',
    'FOLLOW'
);


--
-- Name: BundleTarget; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BundleTarget" AS ENUM (
    'STATION',
    'OPERATOR',
    'MEMBER',
    'PUBLIC'
);


--
-- Name: BundleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BundleType" AS ENUM (
    'FREE_GIFT',
    'PAID_COMBO',
    'MEMBER_BENEFIT'
);


--
-- Name: CircleMemberRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CircleMemberRole" AS ENUM (
    'OWNER',
    'PARTNER',
    'ADMIN',
    'GUEST',
    'VOLUNTEER',
    'MEMBER'
);


--
-- Name: CircleStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CircleStatus" AS ENUM (
    'ACTIVE',
    'DISABLED',
    'PENDING'
);


--
-- Name: CircleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CircleType" AS ENUM (
    'FREE',
    'PAID',
    'YEARLY'
);


--
-- Name: CoinScene; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CoinScene" AS ENUM (
    'RECHARGE',
    'CIRCLE_JOIN',
    'PAID_QUESTION',
    'PEEK_ANSWER',
    'AUDIO_CALL',
    'LIVE_GIFT',
    'BOT_CALL',
    'REFUND',
    'PLATFORM_GRANT',
    'BOUNTY',
    'BOUNTY_UNFREEZE'
);


--
-- Name: CoinTransType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CoinTransType" AS ENUM (
    'RECHARGE',
    'SPEND',
    'REFUND',
    'GRANT'
);


--
-- Name: CompetitionLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompetitionLevel" AS ENUM (
    'S',
    'A',
    'B'
);


--
-- Name: CompetitionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompetitionStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'IN_PROGRESS',
    'FINISHED',
    'CANCELLED'
);


--
-- Name: CompetitionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompetitionType" AS ENUM (
    'BAZI_PREDICT',
    'LIUYAO',
    'QIMEN_DUNJIA',
    'MEIHUA_YISHU',
    'ZIWEI_DOUSHU',
    'FENGSHUI',
    'NAME_ANALYSIS',
    'POETRY',
    'COUPLET',
    'CALLIGRAPHY',
    'PAINTING',
    'MUSIC',
    'GO_CHESS',
    'TEA_CEREMONY',
    'INCENSE',
    'MARTIAL_ARTS',
    'TCM_DIAGNOSIS',
    'CLASSIC_RECITE',
    'GEWU_PERCEIVE',
    'UNKNOWN_PREDICT'
);


--
-- Name: CouponType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CouponType" AS ENUM (
    'FULL_REDUCE',
    'DISCOUNT',
    'NO_THRESHOLD'
);


--
-- Name: CourseType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CourseType" AS ENUM (
    'VIDEO',
    'AUDIO',
    'TEXT',
    'EBOOK',
    'COMBO'
);


--
-- Name: EarningScene; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EarningScene" AS ENUM (
    'QUESTION',
    'PEEK',
    'AUDIO_CALL',
    'LIVE_GIFT'
);


--
-- Name: EbookStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EbookStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'DISABLED'
);


--
-- Name: InstituteRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InstituteRole" AS ENUM (
    'INITIATOR',
    'TYPE_A',
    'TYPE_B',
    'PRESIDENT',
    'VICE_PRESIDENT',
    'SECRETARY_GENERAL'
);


--
-- Name: LiveHostType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LiveHostType" AS ENUM (
    'CIRCLE_OWNER',
    'STATION_MASTER'
);


--
-- Name: LiveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LiveStatus" AS ENUM (
    'WAITING',
    'LIVING',
    'ENDED',
    'REPLAY'
);


--
-- Name: MemberLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MemberLevel" AS ENUM (
    'NONE',
    'MONTHLY',
    'YEARLY',
    'LIFETIME'
);


--
-- Name: MerchantStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MerchantStatus" AS ENUM (
    'PENDING_REVIEW',
    'REVIEW_FAILED',
    'DEPOSIT_PENDING',
    'AGREEMENT_PENDING',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);


--
-- Name: OperatorLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperatorLevel" AS ENUM (
    'SILVER',
    'GOLD',
    'DIAMOND',
    'BLACK_GOLD'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PAID',
    'SHIPPED',
    'COMPLETED',
    'REFUNDED',
    'CANCELLED'
);


--
-- Name: OrderType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderType" AS ENUM (
    'MEMBER',
    'COURSE',
    'PRODUCT',
    'CIRCLE_JOIN',
    'STATION_MASTER',
    'OPERATOR',
    'BOT_SERVICE',
    'PAIPAN',
    'LIVESTREAM',
    'BUNDLE'
);


--
-- Name: PostType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PostType" AS ENUM (
    'TEXT',
    'IMAGE',
    'VIDEO',
    'FILE',
    'LINK',
    'AUDIO'
);


--
-- Name: PrizeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PrizeType" AS ENUM (
    'CASH',
    'PHYSICAL',
    'VIRTUAL',
    'MIXED'
);


--
-- Name: PromotionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PromotionStatus" AS ENUM (
    'ELIMINATED',
    'PROMOTED',
    'CHAMPION',
    'RUNNER_UP',
    'THIRD_PLACE'
);


--
-- Name: QuestionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuestionType" AS ENUM (
    'SINGLE_CHOICE',
    'MULTI_CHOICE',
    'FILL_IN',
    'SCALE',
    'CASE_ANALYSIS',
    'ESSAY'
);


--
-- Name: ReferrerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferrerType" AS ENUM (
    'STATION_MASTER',
    'OPERATOR',
    'USER'
);


--
-- Name: RegistrationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RegistrationStatus" AS ENUM (
    'REGISTERED',
    'QUALIFIED',
    'DISQUALIFIED',
    'WITHDRAWN'
);


--
-- Name: RoleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoleType" AS ENUM (
    'SUPER_ADMIN',
    'OPERATION_ADMIN',
    'CONTENT_AUDITOR',
    'CIRCLE_OWNER',
    'LECTURER',
    'STATION_MASTER',
    'OPERATOR',
    'STATION_OFFLINE_OWNER',
    'INSTITUTE_MEMBER',
    'FINANCE_ADMIN',
    'CUSTOMER_SERVICE',
    'GOODS_AUDITOR',
    'INSTITUTE_ADMIN'
);


--
-- Name: RoundStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoundStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'FINISHED'
);


--
-- Name: RoundType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoundType" AS ENUM (
    'REGISTRATION',
    'PRELIMINARY',
    'SEMIFINAL',
    'FINAL'
);


--
-- Name: ScoringModel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ScoringModel" AS ENUM (
    'A',
    'B',
    'C',
    'D'
);


--
-- Name: SupplierType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SupplierType" AS ENUM (
    'PLATFORM',
    'CIRCLE_OWNER',
    'STATION_OFFLINE',
    'CERTIFIED_MERCHANT'
);


--
-- Name: TaskPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'NEEDS_REVIEW',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: TaskType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskType" AS ENUM (
    'CODE_DEVELOP',
    'BUG_FIX',
    'DATA_ANALYSIS',
    'USER_FEEDBACK',
    'CONTENT_REVIEW',
    'FINANCE_CHECK',
    'SYSTEM_HEALTH',
    'SCHEDULED_TASK'
);


--
-- Name: TenantPlan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantPlan" AS ENUM (
    'BASIC',
    'PRO',
    'ENTERPRISE',
    'CUSTOM'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'DISABLED',
    'BANNED'
);


--
-- Name: ViolationSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ViolationSeverity" AS ENUM (
    'MINOR',
    'MODERATE',
    'SEVERE'
);


--
-- Name: ViolationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ViolationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'DISMISSED'
);


--
-- Name: WebhookEvent; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WebhookEvent" AS ENUM (
    'ORDER_PAID',
    'ORDER_REFUNDED',
    'USER_REGISTERED',
    'CONTENT_PUBLISHED',
    'WITHDRAWAL_REQUESTED',
    'COURSE_ENROLLED',
    'LIVE_STARTED',
    'LIVE_ENDED'
);


--
-- Name: check_garbled_user_footprint(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_garbled_user_footprint() RETURNS TABLE(tbl_name text, row_count bigint)
    LANGUAGE plpgsql
    AS $_$
DECLARE
  rec RECORD;
  gu_ids text[];
  sql text;
  cnt bigint;
BEGIN
  -- Collect garbled user IDs
  SELECT array_agg(id) INTO gu_ids FROM "User"
  WHERE nickname LIKE '%' || E'\xEF\xBF\xBD' || '%';

  IF gu_ids IS NULL THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON rc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'User'
    ORDER BY tc.table_name
  LOOP
    sql := format('SELECT count(*) FROM %I WHERE %I = ANY($1)', rec.table_name, rec.column_name);
    BEGIN
      EXECUTE sql INTO cnt USING gu_ids;
      IF cnt > 0 THEN
        tbl_name := rec.table_name;
        row_count := cnt;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip tables that might have issues
    END;
  END LOOP;
END;
$_$;


--
-- Name: db_health_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.db_health_score() RETURNS TABLE(category text, score integer, max_score integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: run_quality_check(text, text, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_quality_check(p_dimension text, p_check_name text, p_sql text, p_threshold bigint DEFAULT 0) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activity" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "pageId" text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ActivityMetrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityMetrics" (
    id text NOT NULL,
    "activityId" text NOT NULL,
    pv integer DEFAULT 0 NOT NULL,
    uv integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    revenue numeric(12,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AfterSale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AfterSale" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    amount numeric(10,2),
    logistics text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiAnalysisRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiAnalysisRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "paipanRecordId" text,
    "analyzeType" text NOT NULL,
    "analysisContent" text NOT NULL,
    "modelName" text DEFAULT 'deepseek-v4-pro'::text NOT NULL,
    "tokenUsage" jsonb,
    "isCached" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cost double precision,
    "fallbackModel" text,
    "fallbackUsed" boolean DEFAULT false NOT NULL,
    "inputSummary" text,
    latency integer,
    "modelUsed" text,
    "outputSummary" text,
    scene text,
    "userAccepted" boolean,
    "toolId" text
);


--
-- Name: AiCacheEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiCacheEntry" (
    id text NOT NULL,
    scene text NOT NULL,
    "queryHash" text NOT NULL,
    "queryText" text NOT NULL,
    "queryVectorJson" text,
    response text NOT NULL,
    model text NOT NULL,
    "tokenUsage" jsonb,
    "hitCount" integer DEFAULT 0 NOT NULL,
    "lastHitAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiCapability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiCapability" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    scene text[],
    modality text[],
    "capabilityType" text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    "inputSchema" jsonb NOT NULL,
    "outputSchema" jsonb NOT NULL,
    "costPerCall" double precision DEFAULT 0 NOT NULL,
    "avgLatency" integer DEFAULT 0 NOT NULL,
    "qualityScore" double precision DEFAULT 0 NOT NULL,
    "totalCalls" integer DEFAULT 0 NOT NULL,
    "successRate" double precision DEFAULT 100 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "lastHealthCheck" timestamp(3) without time zone,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiCollaboration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiCollaboration" (
    id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "proposedBy" text NOT NULL,
    confidence double precision NOT NULL,
    "impactScope" jsonb NOT NULL,
    alternatives jsonb DEFAULT '[]'::jsonb NOT NULL,
    "riskLevel" text DEFAULT 'medium'::text NOT NULL,
    "executionPlan" jsonb NOT NULL,
    "rollbackPlan" jsonb,
    status text DEFAULT 'pending_review'::text NOT NULL,
    "decisionId" text,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "executedAt" timestamp(3) without time zone,
    "executionResult" jsonb,
    "rolledBackAt" timestamp(3) without time zone,
    "feedbackRating" integer,
    "feedbackComment" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AiDecision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiDecision" (
    id text NOT NULL,
    "agentId" text NOT NULL,
    "capabilityId" text,
    "modelId" text NOT NULL,
    "modelVersion" text NOT NULL,
    "inputSummary" text NOT NULL,
    "contextKeys" text[],
    reasoning jsonb,
    output jsonb NOT NULL,
    confidence double precision NOT NULL,
    "riskLevel" text DEFAULT 'low'::text NOT NULL,
    "humanAction" text,
    "humanReviewer" text,
    "humanNote" text,
    "humanReviewedAt" timestamp(3) without time zone,
    "outcomeMetric" text,
    "outcomeExpected" double precision,
    "outcomeActual" double precision,
    "outcomeMeasuredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AiEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiEvent" (
    id text NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    payload jsonb NOT NULL,
    context jsonb,
    status text DEFAULT 'published'::text NOT NULL,
    "processedBy" text[] DEFAULT ARRAY[]::text[],
    "processResult" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


--
-- Name: AppVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppVersion" (
    id text NOT NULL,
    platform text NOT NULL,
    version text NOT NULL,
    "buildNumber" text,
    changelog text,
    "forceUpdate" boolean DEFAULT false NOT NULL,
    "downloadUrl" text,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AppealRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppealRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    reason text NOT NULL,
    evidence jsonb,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "reviewedBy" text,
    "reviewNote" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Article; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    cover text,
    excerpt text,
    tags text[],
    "isPushHome" boolean DEFAULT false NOT NULL,
    "auditStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "collectCount" integer DEFAULT 0 NOT NULL,
    "commentCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stationId" text,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "scheduledAt" timestamp(3) without time zone,
    "titleEn" text,
    "contentEn" text,
    "excerptEn" text,
    "deletedAt" timestamp without time zone
)
WITH (autovacuum_vacuum_scale_factor='0.1');


--
-- Name: ArticleRecommend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ArticleRecommend" (
    id text NOT NULL,
    "articleId" text NOT NULL,
    "recommendType" text NOT NULL,
    "targetId" text NOT NULL,
    title text,
    cover text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: AudioCallBilling; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AudioCallBilling" (
    id text NOT NULL,
    "callRecordId" text NOT NULL,
    "billingMinute" integer NOT NULL,
    "coinDeducted" integer NOT NULL,
    "balanceBefore" integer NOT NULL,
    "balanceAfter" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AudioCallRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AudioCallRecord" (
    id text NOT NULL,
    "callerId" text NOT NULL,
    "calleeId" text NOT NULL,
    "circleId" text,
    "pricePerMinuteCoin" integer NOT NULL,
    "durationSeconds" integer DEFAULT 0 NOT NULL,
    "totalCoin" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'WAITING'::text NOT NULL,
    "roomId" text,
    "startedAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stationId" text
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "targetType" text,
    "targetId" text,
    detail text,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    executor text,
    "rollbackData" jsonb
);


--
-- Name: Auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Auth" (
    id text NOT NULL,
    "userId" text NOT NULL,
    provider text NOT NULL,
    "openId" text,
    "unionId" text,
    credential text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AutomationPermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationPermission" (
    id text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AutomationRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationRole" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AutomationRoleAssignee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationRoleAssignee" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "userId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AutomationRolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AutomationRolePermission" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


--
-- Name: BaziKnowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BaziKnowledge" (
    id text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    source text,
    "contentHash" text,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BigScreenToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BigScreenToken" (
    id text NOT NULL,
    type text NOT NULL,
    token text NOT NULL,
    "validFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validTo" timestamp(3) without time zone NOT NULL,
    "ipWhitelist" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdBy" text NOT NULL,
    "approvedBy" text,
    "revokedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone
);


--
-- Name: Blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Blacklist" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "blockedUserId" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Bookmark; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Bookmark" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "chapterId" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BotChatLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BotChatLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "botConfigId" text NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    "conversationId" text,
    "chatId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BotConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BotConfig" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    avatar text,
    intro text NOT NULL,
    "botId" text NOT NULL,
    "apiKey" text NOT NULL,
    "isFree" boolean DEFAULT true NOT NULL,
    "dailyLimit" integer DEFAULT 5 NOT NULL,
    price numeric(10,2),
    "monthlyPrice" numeric(10,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "voiceEnabled" boolean DEFAULT false
);


--
-- Name: BotKnowledgeBase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BotKnowledgeBase" (
    id text NOT NULL,
    "botConfigId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "sourceType" text,
    "sourceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BountyQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BountyQuestion" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    "bountyCoin" integer NOT NULL,
    "bountyRmb" numeric(10,2),
    category text DEFAULT 'BAZI'::text NOT NULL,
    "circleId" text,
    "askerId" text NOT NULL,
    "answererId" text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    answer text,
    "answerImages" text[] DEFAULT ARRAY[]::text[],
    "answerAudioUrl" text,
    "lockExpireAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "answeredAt" timestamp(3) without time zone,
    "settledAt" timestamp(3) without time zone,
    "stationId" text
);


--
-- Name: BountyReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BountyReview" (
    id text NOT NULL,
    "questionId" text NOT NULL,
    "reviewerId" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: BrowseHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BrowseHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    title text NOT NULL,
    cover text,
    duration integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    level integer DEFAULT 1 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    icon text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "contentCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CelebrityCase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CelebrityCase" (
    id text NOT NULL,
    name text NOT NULL,
    gender text NOT NULL,
    description text NOT NULL,
    subtitle text NOT NULL,
    "primaryCat" text NOT NULL,
    "secondaryCat" text NOT NULL,
    bazi text[],
    letter text NOT NULL,
    zodiac text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CheckIn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CheckIn" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "checkInDate" date NOT NULL,
    "consecutiveDays" integer DEFAULT 1 NOT NULL,
    "rewardPoints" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ChurnAction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChurnAction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "actionType" text NOT NULL,
    "actionData" jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    result text,
    "triggeredBy" text DEFAULT 'SYSTEM'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "errorLog" text,
    "executedAt" timestamp(3) without time zone
);


--
-- Name: ChurnPrediction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChurnPrediction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "activityScore" double precision DEFAULT 100 NOT NULL,
    "riskLevel" text DEFAULT 'LOW'::text NOT NULL,
    "lastActiveAt" timestamp(3) without time zone,
    "daysSinceActive" integer DEFAULT 0 NOT NULL,
    "churnFactors" text[] DEFAULT ARRAY[]::text[],
    "predictedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ChurnRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChurnRule" (
    id text NOT NULL,
    name text NOT NULL,
    "riskLevel" text NOT NULL,
    "scoreThreshold" double precision,
    "daysThreshold" integer,
    "actionType" text NOT NULL,
    "actionConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Circle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Circle" (
    id text NOT NULL,
    name text NOT NULL,
    intro text NOT NULL,
    cover text,
    tags text[],
    type public."CircleType" DEFAULT 'FREE'::public."CircleType" NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "depositAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "ownerId" text NOT NULL,
    "memberCount" integer DEFAULT 0 NOT NULL,
    "postCount" integer DEFAULT 0 NOT NULL,
    status public."CircleStatus" DEFAULT 'PENDING'::public."CircleStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stationId" text,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "originalPrice" numeric(10,2),
    "recommendedEbookIds" jsonb,
    "deletedAt" timestamp without time zone
);


--
-- Name: CircleAnnouncement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleAnnouncement" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    "isTop" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CircleAnnouncementRead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleAnnouncementRead" (
    id text NOT NULL,
    "announcementId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleBot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleBot" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "botConfigId" text NOT NULL,
    "knowledgeBaseId" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleEvent" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    "time" text NOT NULL,
    circle text NOT NULL,
    type text DEFAULT 'activity'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CircleExpertBooking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleExpertBooking" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "expertUserId" text NOT NULL,
    "bookerUserId" text NOT NULL,
    "slotDate" text NOT NULL,
    "slotStart" text NOT NULL,
    "slotEnd" text NOT NULL,
    topic text,
    notes text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CircleGuestEarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleGuestEarning" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "guestId" text NOT NULL,
    scene text NOT NULL,
    "sourceId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "splitRate" numeric(5,4) NOT NULL,
    earned numeric(10,2) NOT NULL,
    settled boolean DEFAULT false NOT NULL,
    "settledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleInvitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleInvitation" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "inviterId" text NOT NULL,
    "inviteeId" text NOT NULL,
    "inviteCodeId" text,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleInviteCode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleInviteCode" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    code text NOT NULL,
    "maxUses" integer DEFAULT 0 NOT NULL,
    "useCount" integer DEFAULT 0 NOT NULL,
    "expiredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleKnowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleKnowledge" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text,
    content text NOT NULL,
    "contentHash" text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "addedBy" text,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "vectorJson" text,
    scope text DEFAULT 'circle'::character varying NOT NULL,
    "qualityScore" double precision,
    "chunkIndex" integer,
    "parentChunkId" text
);


--
-- Name: CircleKnowledgeCandidate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleKnowledgeCandidate" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text,
    content text NOT NULL,
    "contentHash" text NOT NULL,
    "similarityScore" double precision,
    "similarToId" text,
    status text DEFAULT 'pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleKnowledgeDedupDecision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleKnowledgeDedupDecision" (
    id text NOT NULL,
    "candidateId" text NOT NULL,
    decision text NOT NULL,
    "decidedBy" text,
    "decidedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text
);


--
-- Name: CircleKnowledgeManual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleKnowledgeManual" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleMember" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    role public."CircleMemberRole" DEFAULT 'MEMBER'::public."CircleMemberRole" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expireAt" timestamp(3) without time zone,
    "callAvailableHours" jsonb,
    "callPricePerMinuteCoin" integer DEFAULT 0 NOT NULL,
    "questionPriceCoin" integer DEFAULT 0 NOT NULL,
    "questionTimeoutHours" integer DEFAULT 72 NOT NULL
);


--
-- Name: CircleMemberGroup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleMemberGroup" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    name text NOT NULL,
    color text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleMemberGroupRelation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleMemberGroupRelation" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "userId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleRevenueRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleRevenueRecord" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    type text NOT NULL,
    "sourceId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "platformFee" numeric(10,2) NOT NULL,
    "ownerShare" numeric(10,2) NOT NULL,
    "splitRate" numeric(5,4) NOT NULL,
    settled boolean DEFAULT false NOT NULL,
    "settledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CircleRevenueSplit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CircleRevenueSplit" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "guestId" text NOT NULL,
    scene text DEFAULT 'ALL'::text NOT NULL,
    "splitRate" numeric(5,4) NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ClassicAnnotation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicAnnotation" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "chapterId" text,
    type text DEFAULT '注疏'::text NOT NULL,
    "startPos" integer NOT NULL,
    "endPos" integer NOT NULL,
    content text NOT NULL,
    author text,
    dynasty text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ClassicBook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicBook" (
    id text NOT NULL,
    title text NOT NULL,
    author text,
    dynasty text,
    category text DEFAULT '子'::text NOT NULL,
    cover text,
    intro text,
    source text,
    "chapterCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "versionGroupId" text,
    "introEn" text,
    "titleEn" text,
    "deletedAt" timestamp without time zone,
    CONSTRAINT chk_book_chaptercount_positive CHECK (("chapterCount" >= 0))
)
WITH (autovacuum_vacuum_scale_factor='0.05');


--
-- Name: TABLE "ClassicBook"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ClassicBook" IS '古籍书目';


--
-- Name: COLUMN "ClassicBook".title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook".title IS '书名';


--
-- Name: COLUMN "ClassicBook".author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook".author IS '作者/编者';


--
-- Name: COLUMN "ClassicBook".dynasty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook".dynasty IS '朝代';


--
-- Name: COLUMN "ClassicBook".category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook".category IS '分类（经/史/子/集/释/道）';


--
-- Name: COLUMN "ClassicBook"."chapterCount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook"."chapterCount" IS '章节数';


--
-- Name: COLUMN "ClassicBook"."viewCount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook"."viewCount" IS '浏览量';


--
-- Name: COLUMN "ClassicBook".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook".status IS '状态（DRAFT/PUBLISHED）';


--
-- Name: COLUMN "ClassicBook"."versionGroupId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook"."versionGroupId" IS '同书多版本分组ID';


--
-- Name: COLUMN "ClassicBook"."deletedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicBook"."deletedAt" IS '软删除时间';


--
-- Name: ClassicChapter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicChapter" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    translation text,
    annotation text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tags jsonb,
    "titleEn" text,
    "contentEn" text,
    "translationEn" text,
    "deletedAt" timestamp without time zone
)
WITH (autovacuum_vacuum_scale_factor='0.05');


--
-- Name: TABLE "ClassicChapter"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."ClassicChapter" IS '古籍章节';


--
-- Name: COLUMN "ClassicChapter"."bookId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter"."bookId" IS '所属古籍';


--
-- Name: COLUMN "ClassicChapter".title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter".title IS '章节标题';


--
-- Name: COLUMN "ClassicChapter".content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter".content IS '原文内容';


--
-- Name: COLUMN "ClassicChapter".translation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter".translation IS '白话译文';


--
-- Name: COLUMN "ClassicChapter".annotation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter".annotation IS '注释';


--
-- Name: COLUMN "ClassicChapter"."sortOrder"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter"."sortOrder" IS '排序号';


--
-- Name: COLUMN "ClassicChapter"."deletedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."ClassicChapter"."deletedAt" IS '软删除时间';


--
-- Name: ClassicCommentary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicCommentary" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "chapterId" text,
    title text NOT NULL,
    author text,
    dynasty text,
    school text,
    type text DEFAULT '注释'::text NOT NULL,
    content text NOT NULL,
    "sourceUrl" text,
    "contentHash" text,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ClassicImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicImage" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "pageNumber" integer NOT NULL,
    label text,
    "iiifUrl" text,
    "manifestUrl" text,
    width integer,
    height integer,
    source text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ClassicOcrText; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicOcrText" (
    id text NOT NULL,
    "imageId" text NOT NULL,
    content text NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    w integer NOT NULL,
    h integer NOT NULL,
    "pageNumber" integer NOT NULL,
    "lineNumber" integer NOT NULL,
    "charIndex" integer NOT NULL,
    confidence double precision
);


--
-- Name: ClassicReadingNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClassicReadingNote" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "chapterId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Collect; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Collect" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "parentId" text,
    content text NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp without time zone
);


--
-- Name: CommissionConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommissionConfig" (
    id text NOT NULL,
    "configKey" text NOT NULL,
    "configName" text NOT NULL,
    "rateA" numeric(10,4) NOT NULL,
    "rateB" numeric(10,4) NOT NULL,
    "rateC" numeric(10,4),
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Competition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Competition" (
    id text NOT NULL,
    title text NOT NULL,
    type public."CompetitionType" NOT NULL,
    level public."CompetitionLevel" DEFAULT 'B'::public."CompetitionLevel" NOT NULL,
    status public."CompetitionStatus" DEFAULT 'DRAFT'::public."CompetitionStatus" NOT NULL,
    description text,
    "coverImage" text,
    rules text,
    "scoringModel" public."ScoringModel" DEFAULT 'A'::public."ScoringModel" NOT NULL,
    "maxParticipants" integer DEFAULT 0 NOT NULL,
    "entryFee" integer DEFAULT 0 NOT NULL,
    "isInviteOnly" boolean DEFAULT false NOT NULL,
    "requireIdentity" boolean DEFAULT false NOT NULL,
    "minLevel" integer DEFAULT 0 NOT NULL,
    "organizerId" text,
    "organizerType" text,
    tags text[] DEFAULT '{}'::text[],
    "totalPrize" integer DEFAULT 0 NOT NULL,
    "invitationShare" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    "prizeType" public."PrizeType" DEFAULT 'CASH'::public."PrizeType" NOT NULL,
    "prizeConfig" jsonb,
    "titleEn" text,
    "descriptionEn" text,
    "rulesEn" text
);


--
-- Name: CompetitionAnswer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionAnswer" (
    id text NOT NULL,
    "registrationId" text NOT NULL,
    "roundId" text NOT NULL,
    "questionId" text NOT NULL,
    answer jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isCorrect" boolean,
    score integer,
    "graderId" text,
    comment text,
    duration integer DEFAULT 0 NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gradedAt" timestamp(3) without time zone
);


--
-- Name: CompetitionArticle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionArticle" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "isPremium" boolean DEFAULT false NOT NULL,
    "unlockPrice" integer DEFAULT 0 NOT NULL,
    "unlockCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "qualityRating" double precision,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publishedAt" timestamp(3) without time zone
);


--
-- Name: CompetitionInvitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionInvitation" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    "inviterId" text NOT NULL,
    "inviteeId" text NOT NULL,
    "inviteCode" text NOT NULL,
    "inviteeStatus" public."RegistrationStatus",
    "rewardType" text,
    "rewardAmount" integer DEFAULT 0 NOT NULL,
    "rewardStatus" text DEFAULT 'pending'::text NOT NULL,
    "settledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CompetitionInviteCode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionInviteCode" (
    id text NOT NULL,
    "userId" text NOT NULL,
    code text NOT NULL,
    "shareCount" integer DEFAULT 0 NOT NULL,
    "clickCount" integer DEFAULT 0 NOT NULL,
    "regCount" integer DEFAULT 0 NOT NULL,
    "totalReward" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CompetitionQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionQuestion" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    "roundId" text,
    type public."QuestionType" NOT NULL,
    score integer DEFAULT 10 NOT NULL,
    difficulty integer DEFAULT 1 NOT NULL,
    stem text NOT NULL,
    options jsonb,
    answer jsonb DEFAULT '{}'::jsonb NOT NULL,
    analysis text,
    source text,
    tags text[] DEFAULT '{}'::text[],
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CompetitionRanking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionRanking" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    "userId" text NOT NULL,
    "roundId" text,
    rank integer NOT NULL,
    score integer NOT NULL,
    status public."PromotionStatus" NOT NULL,
    prize integer DEFAULT 0 NOT NULL,
    "prizeInfo" jsonb,
    "certificateUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CompetitionRegistration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionRegistration" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    "userId" text NOT NULL,
    status public."RegistrationStatus" DEFAULT 'REGISTERED'::public."RegistrationStatus" NOT NULL,
    "inviterId" text,
    "inviteCode" text,
    "paidFee" integer DEFAULT 0 NOT NULL,
    "extraData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CompetitionRound; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionRound" (
    id text NOT NULL,
    "competitionId" text NOT NULL,
    type public."RoundType" NOT NULL,
    status public."RoundStatus" DEFAULT 'PENDING'::public."RoundStatus" NOT NULL,
    title text NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    duration integer DEFAULT 0 NOT NULL,
    "passCount" integer DEFAULT 0 NOT NULL,
    "passPercent" integer DEFAULT 0 NOT NULL,
    "scoringConfig" jsonb,
    "liveConfig" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "descriptionEn" text,
    "titleEn" text
);


--
-- Name: CompetitionScore; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompetitionScore" (
    id text NOT NULL,
    "registrationId" text NOT NULL,
    "roundId" text,
    "totalScore" integer DEFAULT 0 NOT NULL,
    "autoScore" integer DEFAULT 0 NOT NULL,
    "judgeScore" integer DEFAULT 0 NOT NULL,
    "bonusScore" integer DEFAULT 0 NOT NULL,
    rank integer,
    detail jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text
);


--
-- Name: ConfigSystem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConfigSystem" (
    id text NOT NULL,
    "configKey" text NOT NULL,
    "configValue" text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ConfigVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConfigVersion" (
    id text NOT NULL,
    "configKey" text NOT NULL,
    value jsonb NOT NULL,
    version integer NOT NULL,
    "changedBy" text,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Content" (
    id text NOT NULL,
    title text NOT NULL,
    author text,
    dynasty text,
    excerpt text,
    body text NOT NULL,
    cover text,
    tags text[],
    "viewCount" integer DEFAULT 0 NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type text DEFAULT 'ARTICLE'::text NOT NULL,
    "stationId" text,
    "auditReason" text,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "scheduledAt" timestamp(3) without time zone
);


--
-- Name: ContentAuditRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentAuditRecord" (
    id text NOT NULL,
    "contentType" text NOT NULL,
    "contentId" text NOT NULL,
    "circleId" text,
    "submitterId" text NOT NULL,
    "auditMode" text DEFAULT 'PRE_PUBLISH'::text NOT NULL,
    "machineStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "machineResult" text,
    "machineAuditAt" timestamp(3) without time zone,
    "machineAuditBy" text,
    "humanAuditorId" text,
    "humanStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "humanResult" text,
    "humanAuditAt" timestamp(3) without time zone,
    "aiReauditEnabled" boolean DEFAULT false NOT NULL,
    "aiReauditStatus" text,
    "aiReauditResult" text,
    "aiReauditAt" timestamp(3) without time zone,
    "isRecommended" boolean DEFAULT false NOT NULL,
    "recommendedAt" timestamp(3) without time zone,
    "recommendedBy" text,
    "finalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "rejectReason" text,
    "finishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Coupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Coupon" (
    id text NOT NULL,
    type public."CouponType" NOT NULL,
    value numeric(10,2) NOT NULL,
    "minAmount" numeric(10,2),
    scope text DEFAULT 'ALL'::text NOT NULL,
    "scopeId" text,
    "totalCount" integer DEFAULT '-1'::integer NOT NULL,
    "usedCount" integer DEFAULT 0 NOT NULL,
    "validStart" timestamp(3) without time zone NOT NULL,
    "validEnd" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "discountAmount" numeric(10,2),
    "discountRate" numeric(5,4),
    name text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    CONSTRAINT chk_coupon_minamount_positive CHECK (("minAmount" >= (0)::numeric)),
    CONSTRAINT chk_coupon_value_positive CHECK ((value > (0)::numeric))
);


--
-- Name: CouponRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CouponRecord" (
    id text NOT NULL,
    "couponId" text NOT NULL,
    "userId" text NOT NULL,
    status text DEFAULT 'UNUSED'::text NOT NULL,
    "claimedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone
);


--
-- Name: CouponTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CouponTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "faceValue" numeric(10,2) NOT NULL,
    threshold numeric(10,2),
    "totalCount" integer DEFAULT 0 NOT NULL,
    "claimedCount" integer DEFAULT 0 NOT NULL,
    "usedCount" integer DEFAULT 0 NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "validDays" integer DEFAULT 7 NOT NULL,
    "applicableScope" jsonb,
    "aiPrecision" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    scope text DEFAULT 'GLOBAL'::character varying NOT NULL,
    "scopePageId" text
);


--
-- Name: Course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Course" (
    id text NOT NULL,
    "circleId" text,
    "userId" text NOT NULL,
    title text NOT NULL,
    cover text,
    intro text,
    type public."CourseType" DEFAULT 'VIDEO'::public."CourseType" NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "originalPrice" numeric(10,2),
    "studentCount" integer DEFAULT 0 NOT NULL,
    "auditStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stationId" text,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "validityDays" integer DEFAULT 0 NOT NULL,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "scheduledAt" timestamp(3) without time zone,
    "titleEn" text,
    "introEn" text,
    "deletedAt" timestamp without time zone,
    CONSTRAINT chk_course_price_positive CHECK ((price >= (0)::numeric)),
    CONSTRAINT chk_course_studentcount_positive CHECK (("studentCount" >= 0))
);


--
-- Name: TABLE "Course"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."Course" IS '课程';


--
-- Name: COLUMN "Course".title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Course".title IS '课程名称';


--
-- Name: COLUMN "Course".price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Course".price IS '价格';


--
-- Name: COLUMN "Course"."studentCount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Course"."studentCount" IS '学员数';


--
-- Name: COLUMN "Course"."deletedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Course"."deletedAt" IS '软删除时间';


--
-- Name: CourseBundle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseBundle" (
    id text NOT NULL,
    name text NOT NULL,
    cover text,
    intro text,
    type public."BundleType" DEFAULT 'FREE_GIFT'::public."BundleType" NOT NULL,
    target public."BundleTarget" DEFAULT 'PUBLIC'::public."BundleTarget" NOT NULL,
    "originalPrice" numeric(10,2),
    "sellPrice" numeric(10,2),
    "sortOrder" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CourseBundleItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseBundleItem" (
    id text NOT NULL,
    "bundleId" text NOT NULL,
    "itemType" text DEFAULT 'COURSE'::text NOT NULL,
    "itemId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CourseChapter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseChapter" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    title text NOT NULL,
    content text,
    "mediaUrl" text,
    duration integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "freeTrial" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CourseProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    "chapterId" text NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CourseQa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseQa" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "chapterId" text,
    "userId" text NOT NULL,
    question text NOT NULL,
    answer text,
    "answeredBy" text,
    tags text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "answeredAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CourseReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseReview" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text,
    rating integer NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reply text
);


--
-- Name: CourseWork; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CourseWork" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "chapterId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    score double precision,
    feedback text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DailyTask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyTask" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "taskType" text NOT NULL,
    "taskDate" date NOT NULL,
    title text NOT NULL,
    description text,
    "rewardPoints" integer DEFAULT 0 NOT NULL,
    "targetCount" integer DEFAULT 1 NOT NULL,
    "doneCount" integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DeviceFingerprint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeviceFingerprint" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deviceId" text NOT NULL,
    platform text,
    "userAgent" text,
    ip text,
    "isTrusted" boolean DEFAULT true NOT NULL,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DiscountActivity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DiscountActivity" (
    id text NOT NULL,
    name text NOT NULL,
    "discountPct" integer NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "productIds" text[],
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    scope text DEFAULT 'GLOBAL'::character varying NOT NULL,
    "scopePageId" text,
    "courseIds" text[] DEFAULT ARRAY[]::text[],
    "circleIds" text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: Ebook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ebook" (
    id text NOT NULL,
    title text NOT NULL,
    author text,
    cover text,
    description text,
    "categoryId" text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "originalPrice" numeric(10,2),
    "fileUrl" text,
    "fileType" text DEFAULT 'PDF'::text NOT NULL,
    "fileSize" integer,
    "totalChapters" integer DEFAULT 0 NOT NULL,
    language text DEFAULT 'zh-CN'::text NOT NULL,
    "hasWatermark" boolean DEFAULT true NOT NULL,
    "memberFree" boolean DEFAULT false NOT NULL,
    status public."EbookStatus" DEFAULT 'DRAFT'::public."EbookStatus" NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "purchaseCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "titleEn" text,
    "descriptionEn" text
);


--
-- Name: EbookBookmark; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookBookmark" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ebookId" text NOT NULL,
    "chapterId" text,
    page integer DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EbookCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookCategory" (
    id text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EbookChapter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookChapter" (
    id text NOT NULL,
    "ebookId" text NOT NULL,
    title text NOT NULL,
    content text,
    "pageStart" integer DEFAULT 0 NOT NULL,
    "pageEnd" integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "freeTrial" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contentEn" text,
    "titleEn" text
);


--
-- Name: EbookNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookNote" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ebookId" text NOT NULL,
    "chapterId" text,
    content text NOT NULL,
    page integer DEFAULT 0 NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EbookProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ebookId" text NOT NULL,
    "chapterId" text,
    progress integer DEFAULT 0 NOT NULL,
    "currentPage" integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EbookPurchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookPurchase" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ebookId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expireAt" timestamp(3) without time zone
);


--
-- Name: EbookReadingSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookReadingSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ebookId" text NOT NULL,
    duration integer DEFAULT 0 NOT NULL,
    pages integer DEFAULT 0 NOT NULL,
    date date NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EbookReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EbookReview" (
    id text NOT NULL,
    "ebookId" text NOT NULL,
    "userId" text NOT NULL,
    rating integer NOT NULL,
    content text NOT NULL,
    reply text,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureFlag" (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    percentage integer DEFAULT 100 NOT NULL,
    "targetUserIds" text[] DEFAULT ARRAY[]::text[],
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: Feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Feedback" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    contact text,
    images text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'pending'::text NOT NULL,
    result text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FinancialReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FinancialReport" (
    id text NOT NULL,
    type text NOT NULL,
    period text NOT NULL,
    data jsonb NOT NULL,
    "generatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FlashSale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FlashSale" (
    id text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "warmupMinutes" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    scope text DEFAULT 'GLOBAL'::character varying NOT NULL,
    "scopePageId" text
);


--
-- Name: FlashSaleItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FlashSaleItem" (
    id text NOT NULL,
    "flashSaleId" text NOT NULL,
    "productId" text NOT NULL,
    "skuId" text,
    "flashPrice" numeric(10,2) NOT NULL,
    "limitCount" integer DEFAULT 1 NOT NULL,
    stock integer NOT NULL,
    sold integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: Follow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Follow" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "followedUserId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FortuneRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FortuneRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fortuneType" text NOT NULL,
    period text NOT NULL,
    "fortuneContent" jsonb NOT NULL,
    "luckyDirection" text,
    "luckyColor" text,
    "luckyNumber" integer,
    advice text,
    "aiCost" numeric(10,4),
    "sentStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FortuneSubscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FortuneSubscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fortuneType" text NOT NULL,
    "pushChannel" text NOT NULL,
    "pushTime" text DEFAULT '08:00'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FraudDetection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FraudDetection" (
    id text NOT NULL,
    "userId" text,
    type text NOT NULL,
    confidence numeric(3,2) NOT NULL,
    evidence jsonb,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stationId" text
);


--
-- Name: FreightTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FreightTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'FIXED'::text NOT NULL,
    "defaultFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "conditionFree" jsonb,
    regions jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FullReductionRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FullReductionRule" (
    id text NOT NULL,
    name text NOT NULL,
    threshold numeric(10,2) NOT NULL,
    reduction numeric(10,2) NOT NULL,
    "giftProductId" text,
    "giftCount" integer DEFAULT 0 NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "productIds" text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    scope text DEFAULT 'GLOBAL'::character varying NOT NULL,
    "scopePageId" text
);


--
-- Name: Gift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Gift" (
    id text NOT NULL,
    name text NOT NULL,
    icon text,
    "priceCoin" integer NOT NULL,
    level text DEFAULT 'BASIC'::text NOT NULL,
    "effectUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GiftRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "liveRoomId" text NOT NULL,
    "toUserId" text NOT NULL,
    "giftId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "totalCoin" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GroupBuy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupBuy" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "skuId" text,
    "groupPrice" numeric(10,2) NOT NULL,
    "minMembers" integer DEFAULT 2 NOT NULL,
    "expireMinutes" integer DEFAULT 1440 NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "autoComplete" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    scope text DEFAULT 'GLOBAL'::character varying NOT NULL,
    "scopePageId" text
);


--
-- Name: GroupBuyParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GroupBuyParticipant" (
    id text NOT NULL,
    "groupBuyId" text NOT NULL,
    "userId" text NOT NULL,
    "groupId" text NOT NULL,
    "isLeader" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'WAITING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GrowthRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GrowthRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    source text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GrowthValue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GrowthValue" (
    id text NOT NULL,
    "userId" text NOT NULL,
    value integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HuifuConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HuifuConfig" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HuifuSettlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HuifuSettlement" (
    id text NOT NULL,
    "settleDate" timestamp(3) without time zone NOT NULL,
    "settleBatchId" text,
    "totalAmount" numeric(12,2) NOT NULL,
    "feeAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "actualAmount" numeric(12,2) NOT NULL,
    detail jsonb,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "rawResponse" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HuifuSplitRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HuifuSplitRecord" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "huifuOrderId" text,
    "outTradeNo" text NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "splitStatus" text DEFAULT 'PENDING'::text NOT NULL,
    receivers jsonb,
    "rawRequest" jsonb,
    "rawResponse" jsonb,
    "errorMsg" text,
    "splitAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Institute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Institute" (
    id text NOT NULL,
    name text NOT NULL,
    intro text,
    logo text,
    "circleId" text,
    "adminUserId" text NOT NULL,
    "contactName" text,
    "contactPhone" text,
    "legalEntity" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InstituteContent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteContent" (
    id text NOT NULL,
    title text NOT NULL,
    "contentType" text DEFAULT 'ARTICLE'::text NOT NULL,
    content text NOT NULL,
    summary text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "instituteId" text NOT NULL,
    "authorId" text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InstituteContentPurchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteContentPurchase" (
    id text NOT NULL,
    "contentId" text NOT NULL,
    "userId" text NOT NULL,
    price numeric(10,2) NOT NULL,
    "purchasedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InstituteCourse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteCourse" (
    id text NOT NULL,
    "instituteId" text NOT NULL,
    "teacherId" text NOT NULL,
    title text NOT NULL,
    cover text,
    intro text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "teacherShare" numeric(5,4) DEFAULT 0 NOT NULL,
    "maxStudents" integer DEFAULT 20 NOT NULL,
    location text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InstituteCourseRegistration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteCourseRegistration" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "userId" text NOT NULL,
    status text DEFAULT 'REGISTERED'::text NOT NULL,
    "signedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InstituteDividend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteDividend" (
    id text NOT NULL,
    "instituteId" text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    period text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InstituteEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteEvent" (
    id text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    "lecturerId" text,
    description text,
    location text,
    "scheduleAt" timestamp(3) without time zone NOT NULL,
    "maxAttendees" integer DEFAULT 50 NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "instituteId" text
);


--
-- Name: InstituteMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteMember" (
    id text NOT NULL,
    "userId" text NOT NULL,
    role public."InstituteRole" NOT NULL,
    deposit numeric(10,2) DEFAULT 0 NOT NULL,
    "tasksCompleted" integer DEFAULT 0 NOT NULL,
    "tasksRequired" integer DEFAULT 3 NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "depositRefunded" boolean DEFAULT false NOT NULL,
    "joinYear" integer NOT NULL,
    "lecturerLevel" text DEFAULT 'NONE'::text NOT NULL,
    "instituteId" text NOT NULL,
    "expireAt" timestamp(3) without time zone
);


--
-- Name: InstituteRevenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteRevenue" (
    id text NOT NULL,
    "instituteId" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text,
    amount numeric(10,2) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InstituteTask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteTask" (
    id text NOT NULL,
    "memberId" text NOT NULL,
    "taskType" text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InstituteTaskTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InstituteTaskTemplate" (
    id text NOT NULL,
    "taskType" text NOT NULL,
    title text NOT NULL,
    description text,
    "requiredCount" integer DEFAULT 1 NOT NULL,
    "periodUnit" text DEFAULT 'YEAR'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "userId" text,
    "orderId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    "taxNo" text,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "invoiceUrl" text,
    "expressNo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: KnowledgeEdge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KnowledgeEdge" (
    id text NOT NULL,
    "fromId" text NOT NULL,
    "toId" text NOT NULL,
    relation text NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    evidence text,
    "knowledgeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: KnowledgeEntity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KnowledgeEntity" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    summary text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    aliases jsonb
);


--
-- Name: LegalDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LegalDocument" (
    id text NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "publishedAt" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Like; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Like" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LiveAuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveAuditLog" (
    id text NOT NULL,
    "liveRoomId" text NOT NULL,
    "screenshotUrl" text,
    "auditResult" text DEFAULT 'PENDING'::text NOT NULL,
    label text,
    "rawData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LiveFlashSale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveFlashSale" (
    id text NOT NULL,
    "liveRoomId" text NOT NULL,
    "productId" text NOT NULL,
    "flashPrice" integer NOT NULL,
    stock integer NOT NULL,
    "soldCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'WAITING'::text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LiveMic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveMic" (
    id text NOT NULL,
    "liveRoomId" text NOT NULL,
    "userId" text NOT NULL,
    "position" integer NOT NULL,
    status text DEFAULT 'OCCUPIED'::text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LiveMinuteData; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveMinuteData" (
    id text NOT NULL,
    "roomId" text NOT NULL,
    minute timestamp(3) without time zone NOT NULL,
    "onlineCount" integer DEFAULT 0 NOT NULL,
    gmw integer DEFAULT 0 NOT NULL,
    "orderCount" integer DEFAULT 0 NOT NULL,
    "commentCount" integer DEFAULT 0 NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "shareCount" integer DEFAULT 0 NOT NULL,
    "giftAmount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LiveMutedUser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveMutedUser" (
    id text NOT NULL,
    "liveRoomId" text NOT NULL,
    "userId" text NOT NULL,
    "mutedBy" text NOT NULL,
    "mutedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: LiveProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveProduct" (
    id text NOT NULL,
    "liveId" text NOT NULL,
    "productId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: LiveRoom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveRoom" (
    id text NOT NULL,
    "circleId" text,
    "userId" text NOT NULL,
    title text NOT NULL,
    cover text,
    "hostType" public."LiveHostType" DEFAULT 'CIRCLE_OWNER'::public."LiveHostType" NOT NULL,
    "hostUserId" text NOT NULL,
    "coHostIds" text[] DEFAULT ARRAY[]::text[],
    "pushUrl" text,
    "pullUrl" text,
    "trtcRoomId" text,
    "imGroupId" text,
    status public."LiveStatus" DEFAULT 'WAITING'::public."LiveStatus" NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "chargeType" text DEFAULT 'FREE'::text NOT NULL,
    "chargePrice" numeric(10,2),
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    "replayUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "courseId" text,
    "stationId" text,
    "titleEn" text
);


--
-- Name: LiveSlide; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LiveSlide" (
    id text NOT NULL,
    "liveRoomId" text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    type text DEFAULT 'IMAGE'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LoginDevice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LoginDevice" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deviceName" text,
    "deviceType" text,
    "ipAddress" text,
    location text,
    "isCurrent" boolean DEFAULT false NOT NULL,
    "lastLogin" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MarketingPage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MarketingPage" (
    id text NOT NULL,
    name text NOT NULL,
    route text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stationId" text,
    description text,
    "entryConfig" jsonb,
    "entryVisible" boolean DEFAULT false NOT NULL
);


--
-- Name: MarketingPageComponent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MarketingPageComponent" (
    id text NOT NULL,
    "pageId" text NOT NULL,
    type text NOT NULL,
    title text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    audience jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MemberConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MemberConfig" (
    id text NOT NULL,
    level text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    "coinBonus" integer DEFAULT 0 NOT NULL,
    benefits jsonb,
    "maxBorrowDays" integer DEFAULT 30 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MemberPurchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MemberPurchase" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "memberType" public."MemberLevel" NOT NULL,
    amount numeric(10,2) NOT NULL,
    "sourcePage" text,
    "referrerId" text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expireAt" timestamp(3) without time zone
);


--
-- Name: Merchant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Merchant" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "shopName" text NOT NULL,
    "shopLogo" text,
    "shopIntro" text,
    "contactName" text NOT NULL,
    "contactPhone" text NOT NULL,
    "idCardNumber" text NOT NULL,
    "idCardFront" text,
    "idCardBack" text,
    "businessLicense" text,
    "brandAuth" text,
    "categoryIds" text[] DEFAULT ARRAY[]::text[],
    status public."MerchantStatus" DEFAULT 'PENDING_REVIEW'::public."MerchantStatus" NOT NULL,
    "depositAmount" numeric(10,2),
    "depositPaid" boolean DEFAULT false NOT NULL,
    "agreementSigned" boolean DEFAULT false NOT NULL,
    "agreementUrl" text,
    "signedAt" timestamp(3) without time zone,
    "signedIp" text,
    "rejectReason" text,
    "commissionRate" numeric(5,4),
    "totalSales" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    rating numeric(3,2) DEFAULT 5.0 NOT NULL,
    "openedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MerchantAgreement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MerchantAgreement" (
    id text NOT NULL,
    "merchantId" text NOT NULL,
    version text NOT NULL,
    title text DEFAULT '商家入驻协议'::text NOT NULL,
    content text NOT NULL,
    "signedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MerchantDepositRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MerchantDepositRecord" (
    id text NOT NULL,
    "merchantId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "payMethod" text,
    "payTransactionId" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MerchantViolation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MerchantViolation" (
    id text NOT NULL,
    "merchantId" text NOT NULL,
    type public."ViolationSeverity" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    penalty numeric(10,2),
    status public."ViolationStatus" DEFAULT 'PENDING'::public."ViolationStatus" NOT NULL,
    evidence jsonb,
    "handledBy" text,
    "handledAt" timestamp(3) without time zone,
    appeal text,
    "appealAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MiniAppConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MiniAppConfig" (
    id text NOT NULL,
    "appId" text NOT NULL,
    "appName" text NOT NULL,
    type text DEFAULT 'MAIN'::text NOT NULL,
    domain text,
    "h5Domain" text,
    "pathMappings" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "targetType" text,
    "targetId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OfflineCourse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OfflineCourse" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    title text NOT NULL,
    cover text,
    intro text,
    "teacherId" text,
    "courseId" text,
    type text DEFAULT 'OFFLINE'::text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "maxStudents" integer NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    location text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "auditReason" text,
    "auditStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "isRecommended" boolean DEFAULT false NOT NULL,
    "recommendedAt" timestamp(3) without time zone
);


--
-- Name: OfflineCourseRegistration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OfflineCourseRegistration" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "userId" text NOT NULL,
    status text DEFAULT 'REGISTERED'::text NOT NULL,
    "qrCode" text,
    "signedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OperationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperationLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "targetType" text,
    "targetId" text,
    detail jsonb,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Operator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Operator" (
    id text NOT NULL,
    "userId" text NOT NULL,
    level public."OperatorLevel" NOT NULL,
    "containQuota" integer DEFAULT 0 NOT NULL,
    "usedQuota" integer DEFAULT 0 NOT NULL,
    "parentOperatorId" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "purchasedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expireAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "brandLogo" text,
    "brandName" text,
    "brandThemeColor" text DEFAULT '#8B4513'::text,
    "miniAppId" text,
    "miniPages" jsonb,
    "mpAppId" text,
    "totalEarning" numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: OperatorEarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperatorEarning" (
    id text NOT NULL,
    "operatorId" text NOT NULL,
    "orderId" text NOT NULL,
    source text NOT NULL,
    amount numeric(10,2) NOT NULL,
    rate numeric(5,4) NOT NULL,
    earned numeric(10,2) NOT NULL,
    "sourceStationId" text,
    "sourceOperatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."OrderType" NOT NULL,
    "targetId" text NOT NULL,
    "skuId" text,
    amount numeric(10,2) NOT NULL,
    "payAmount" numeric(10,2),
    "couponId" text,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "referrerId" text,
    "tempReferrerId" text,
    "payMethod" text,
    "payTransactionId" text,
    "paidAt" timestamp(3) without time zone,
    "shippedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "refundedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "frozenAmount" numeric(10,2),
    "merchantId" text,
    "promotionType" text,
    "promotionId" text,
    "originalAmount" numeric(10,2),
    CONSTRAINT chk_order_amount_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: TABLE "Order"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."Order" IS '订单';


--
-- Name: COLUMN "Order".type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Order".type IS '类型（PRODUCT/COURSE/MEMBER）';


--
-- Name: COLUMN "Order".amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Order".amount IS '订单金额';


--
-- Name: COLUMN "Order"."payAmount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Order"."payAmount" IS '实付金额';


--
-- Name: COLUMN "Order".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Order".status IS '状态（PAID/SHIPPED/COMPLETED/REFUNDED）';


--
-- Name: OrderLogistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderLogistics" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    company text,
    "logisticsNo" text,
    "contactName" text,
    "contactPhone" text,
    province text,
    city text,
    district text,
    address text,
    "zipCode" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "trackingData" jsonb,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PageContentConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PageContentConfig" (
    id text NOT NULL,
    "pageRoute" text NOT NULL,
    "fieldKey" text NOT NULL,
    content text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PaidQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaidQuestion" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "askerId" text NOT NULL,
    "answererId" text NOT NULL,
    question text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    answer text,
    "priceCoin" integer NOT NULL,
    "peekPriceCoin" integer DEFAULT 0 NOT NULL,
    "peekCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "answeredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "answerAudioUrl" text,
    "isPublic" boolean DEFAULT true NOT NULL,
    "questionTitle" text DEFAULT ''::text NOT NULL,
    "timeoutHours" integer DEFAULT 72 NOT NULL,
    "stationId" text
);


--
-- Name: PaipanGroup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaipanGroup" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "paipanType" text NOT NULL,
    name text NOT NULL,
    color text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PaipanRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaipanRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "clientName" text,
    "clientBirth" text NOT NULL,
    "paipanType" text NOT NULL,
    "inputParams" jsonb NOT NULL,
    "resultData" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "groupName" text
);


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    module text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PlatformFeeRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlatformFeeRecord" (
    id text NOT NULL,
    type text NOT NULL,
    "sourceId" text NOT NULL,
    "sourceAmount" numeric(10,2) NOT NULL,
    "platformRate" numeric(5,4) NOT NULL,
    "platformFee" numeric(10,2) NOT NULL,
    "circleId" text,
    "circleShare" numeric(10,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PlatformKnowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlatformKnowledge" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text,
    "circleId" text,
    tags text[] DEFAULT ARRAY[]::text[],
    category text,
    "qualityScore" double precision,
    "embeddingJson" text,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "exportedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Poetry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Poetry" (
    id text NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    "authorId" text,
    dynasty text NOT NULL,
    form text,
    content text NOT NULL,
    pinyin jsonb,
    translation text,
    appreciation text,
    "aiAppreciation" text,
    notes jsonb,
    "authorIntro" text,
    "authorYears" text,
    "authorTitle" text,
    tags jsonb,
    "categoryId" text,
    "collectionId" text,
    cover text,
    likes integer DEFAULT 0 NOT NULL,
    "collectCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "isRecommended" boolean DEFAULT false NOT NULL,
    "isToday" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PoetryCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PoetryCategory" (
    id text NOT NULL,
    name text NOT NULL,
    icon text,
    intro text,
    "subCategories" jsonb,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PoetryCollection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PoetryCollection" (
    id text NOT NULL,
    title text NOT NULL,
    author text,
    "authorAvatar" text,
    dynasty text,
    excerpt text,
    category text,
    cover text,
    likes integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PointsRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointsRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Post" (
    id text NOT NULL,
    "circleId" text NOT NULL,
    "userId" text NOT NULL,
    type public."PostType" DEFAULT 'TEXT'::public."PostType" NOT NULL,
    title text,
    content text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    "fileUrl" text,
    "linkUrl" text,
    "isEssence" boolean DEFAULT false NOT NULL,
    "isTop" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "scheduledAt" timestamp(3) without time zone,
    "audioUrl" text,
    "audioDuration" integer,
    "isPushHome" boolean DEFAULT false NOT NULL,
    "auditStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "auditReason" text,
    "isRecommended" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp without time zone
)
WITH (autovacuum_vacuum_scale_factor='0.1');


--
-- Name: PricingDemand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PricingDemand" (
    id text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "viewCount24h" integer DEFAULT 0 NOT NULL,
    "purchaseCount24h" integer DEFAULT 0 NOT NULL,
    "cartCount24h" integer DEFAULT 0 NOT NULL,
    "demandLevel" text DEFAULT 'LOW'::text NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PricingRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PricingRule" (
    id text NOT NULL,
    name text NOT NULL,
    "targetType" text NOT NULL,
    "targetIds" text[] DEFAULT ARRAY[]::text[],
    "basePrice" numeric(10,2),
    "minPrice" numeric(10,2),
    "maxPrice" numeric(10,2),
    strategy text NOT NULL,
    "strategyConfig" jsonb NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "startAt" timestamp(3) without time zone,
    "endAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "circleId" text,
    "userId" text,
    title text NOT NULL,
    "categoryId" text,
    intro text,
    detail text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "salesCount" integer DEFAULT 0 NOT NULL,
    "isPlatform" boolean DEFAULT true NOT NULL,
    "supplierType" public."SupplierType" DEFAULT 'PLATFORM'::public."SupplierType" NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stationId" text,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "categoryLevel1" text,
    "categoryLevel2" text,
    "titleEn" text,
    "introEn" text,
    "detailEn" text,
    "originalPrice" numeric(10,2),
    "deletedAt" timestamp without time zone,
    CONSTRAINT chk_product_price_positive CHECK ((price >= (0)::numeric)),
    CONSTRAINT chk_product_stock_positive CHECK ((stock >= 0))
);


--
-- Name: TABLE "Product"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."Product" IS '商品';


--
-- Name: COLUMN "Product".title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product".title IS '商品名称';


--
-- Name: COLUMN "Product".price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product".price IS '售价';


--
-- Name: COLUMN "Product".stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product".stock IS '库存';


--
-- Name: COLUMN "Product"."salesCount"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product"."salesCount" IS '销量';


--
-- Name: COLUMN "Product".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product".status IS '状态（PENDING/ON_SALE/OFF_SHELF）';


--
-- Name: COLUMN "Product"."deletedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."Product"."deletedAt" IS '软删除时间';


--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategory" (
    id text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    level integer DEFAULT 1 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    icon text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductReview" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text,
    rating integer NOT NULL,
    content text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "repliedAt" timestamp(3) without time zone,
    reply text
);


--
-- Name: ProductSku; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductSku" (
    id text NOT NULL,
    "productId" text NOT NULL,
    specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "skuCode" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: PromotionMaterial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PromotionMaterial" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text,
    "imageUrl" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "usageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: QualityScoreRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QualityScoreRecord" (
    id text NOT NULL,
    "contentSnippet" text NOT NULL,
    scene text,
    context text,
    accuracy double precision NOT NULL,
    completeness double precision NOT NULL,
    readability double precision NOT NULL,
    professionalism double precision NOT NULL,
    overall double precision NOT NULL,
    feedback text,
    model text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);


--
-- Name: RagPromptTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RagPromptTemplate" (
    id text NOT NULL,
    scene text NOT NULL,
    "templateName" text NOT NULL,
    "systemPrompt" text NOT NULL,
    "userPromptTemplate" text,
    variables jsonb,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReadingProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReadingProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "chapterId" text NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RecommendLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecommendLog" (
    id text NOT NULL,
    "userId" text,
    scene text NOT NULL,
    "itemType" text NOT NULL,
    "itemId" text NOT NULL,
    "position" integer NOT NULL,
    strategy text NOT NULL,
    "recommendId" text,
    "isClick" boolean DEFAULT false NOT NULL,
    "staySeconds" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RecommendRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecommendRule" (
    id text NOT NULL,
    scene text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "ruleType" text NOT NULL,
    "ruleValue" double precision,
    priority integer DEFAULT 0 NOT NULL,
    "conditionJson" jsonb,
    "startAt" timestamp(3) without time zone,
    "endAt" timestamp(3) without time zone,
    remark text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "position" integer
);


--
-- Name: ReconciliationRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReconciliationRecord" (
    id text NOT NULL,
    source text NOT NULL,
    "billDate" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "matchAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "diffCount" integer DEFAULT 0 NOT NULL,
    detail jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReferralLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferralLink" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    code text NOT NULL,
    channel text DEFAULT 'DIRECT'::text NOT NULL,
    "clickCount" integer DEFAULT 0 NOT NULL,
    "orderCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReferralRelation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferralRelation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "referrerId" text NOT NULL,
    "referrerType" public."ReferrerType" NOT NULL,
    "sourceChannel" text,
    "relationStatus" text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RenewalRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RenewalRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "periodDays" integer DEFAULT 365 NOT NULL,
    "prevExpireAt" timestamp(3) without time zone NOT NULL,
    "newExpireAt" timestamp(3) without time zone NOT NULL,
    "orderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Report" (
    id text NOT NULL,
    "reporterId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    result text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


--
-- Name: RiskAlert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RiskAlert" (
    id text NOT NULL,
    "ruleId" text,
    type text NOT NULL,
    level text DEFAULT 'WARN'::text NOT NULL,
    title text NOT NULL,
    detail jsonb,
    "targetType" text,
    "targetId" text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "handledBy" text,
    "handledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stationId" text
);


--
-- Name: RiskRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RiskRule" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    action text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    "roleType" public."RoleType" NOT NULL,
    "permissionId" text NOT NULL
);


--
-- Name: SearchHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE UNLOGGED TABLE public."SearchHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    keyword text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SearchWeight; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SearchWeight" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "fieldName" text DEFAULT 'all'::text NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SettlementOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SettlementOrder" (
    id text NOT NULL,
    "userId" text NOT NULL,
    period text NOT NULL,
    amount numeric(12,2) NOT NULL,
    detail jsonb,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "approvedBy" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ShippingAddress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShippingAddress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    district text NOT NULL,
    detail text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SiteNotice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SiteNotice" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'INFO'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SmsLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SmsLog" (
    id text NOT NULL,
    phone text NOT NULL,
    scene text DEFAULT 'LOGIN'::text NOT NULL,
    status text DEFAULT 'SUCCESS'::text NOT NULL,
    "errorMsg" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SpecialTeacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SpecialTeacher" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "competitionWins" integer DEFAULT 0 NOT NULL,
    "featuredArticles" integer DEFAULT 0 NOT NULL,
    "totalScore" double precision DEFAULT 0 NOT NULL,
    level text DEFAULT 'candidate'::text NOT NULL,
    certificates text[] DEFAULT '{}'::text[],
    "invitedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Station; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Station" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    intro text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "totalEarning" numeric(12,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    logo text,
    "themeColor" text DEFAULT '#8B4513'::text,
    "miniAppId" text,
    "mpAppId" text,
    "miniPages" jsonb,
    "templateConfig" jsonb,
    "templateId" text DEFAULT 'default'::text,
    "operatorId" text,
    "paipanLink" text,
    "paipanUserId" text,
    "tenantType" text DEFAULT 'INTERNAL'::text NOT NULL,
    "schemaName" text,
    "dbConnString" text,
    "featureFlags" jsonb,
    "apiDailyQuota" integer DEFAULT 0 NOT NULL,
    "dataRetentionDays" integer DEFAULT 90 NOT NULL,
    "paymentConfig" jsonb,
    "autoSuspendOnExpiry" boolean DEFAULT true NOT NULL,
    "expireAt" timestamp(3) without time zone
);


--
-- Name: StationBundleAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationBundleAccess" (
    id text NOT NULL,
    "bundleId" text NOT NULL,
    "stationId" text,
    "operatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StationEarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationEarning" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "orderId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    rate numeric(5,4) NOT NULL,
    earned numeric(10,2) NOT NULL,
    type text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StationOffline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationOffline" (
    id text NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    cover text,
    "ownerUserId" text NOT NULL,
    "depositAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StationOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationOrder" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "orderType" text NOT NULL,
    "targetId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "stationIncome" numeric(10,2) NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StationPick; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationPick" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "contentType" text NOT NULL,
    "contentId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StationProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationProduct" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "productId" text,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "isPlatform" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StationSettlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationSettlement" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    period text NOT NULL,
    "totalIncome" numeric(12,2) NOT NULL,
    "stationShare" numeric(12,2) NOT NULL,
    "platformShare" numeric(12,2) NOT NULL,
    settled boolean DEFAULT false NOT NULL,
    "settledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StationTeacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationTeacher" (
    id text NOT NULL,
    name text NOT NULL,
    avatar text,
    specialties text[] DEFAULT ARRAY[]::text[],
    bio text,
    "stationId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StationTeacherBooking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationTeacherBooking" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "teacherId" text NOT NULL,
    "courseId" text,
    "bookingDate" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    price double precision DEFAULT 0 NOT NULL
);


--
-- Name: StationTeacherRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationTeacherRequest" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "teacherId" text,
    "courseTitle" text,
    "courseIntro" text,
    "proposedFee" numeric(10,2),
    "proposeDate" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL,
    initiator text DEFAULT 'STATION'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StationToolConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StationToolConfig" (
    id text NOT NULL,
    "stationId" text NOT NULL,
    "toolId" text NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "customName" text,
    "customSubtitle" text,
    methods jsonb,
    "feeConfig" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    type public."TaskType" NOT NULL,
    priority public."TaskPriority" DEFAULT 'MEDIUM'::public."TaskPriority" NOT NULL,
    status public."TaskStatus" DEFAULT 'PENDING'::public."TaskStatus" NOT NULL,
    title text NOT NULL,
    description text,
    "executorType" text,
    "executorId" text,
    snapshot jsonb,
    result jsonb,
    "errorLog" text,
    "rollbackData" jsonb,
    "rollbackUrl" text,
    "needsApproval" boolean DEFAULT false NOT NULL,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: TaskTransferLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskTransferLog" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "fromType" text NOT NULL,
    "fromId" text,
    "toType" text NOT NULL,
    "toId" text,
    reason text NOT NULL,
    snapshot jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TemporaryReferralConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TemporaryReferralConfig" (
    id text NOT NULL,
    "stationId" text,
    "operatorId" text,
    "commissionRate" numeric(5,2) NOT NULL,
    "validFrom" timestamp(3) without time zone NOT NULL,
    "validTo" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    "contactName" text NOT NULL,
    "contactPhone" text,
    "contactEmail" text,
    "apiKey" text NOT NULL,
    plan public."TenantPlan" DEFAULT 'BASIC'::public."TenantPlan" NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "quotaTotal" integer DEFAULT 10000 NOT NULL,
    "quotaUsed" integer DEFAULT 0 NOT NULL,
    "quotaResetCycle" text DEFAULT 'MONTHLY'::text NOT NULL,
    "expireAt" timestamp(3) without time zone,
    "ipWhitelist" text[] DEFAULT ARRAY[]::text[],
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TenantApiCall; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TenantApiCall" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "apiType" text NOT NULL,
    endpoint text,
    "tokensUsed" integer,
    cost numeric(10,4) DEFAULT 0 NOT NULL,
    ip text,
    "responseTime" integer,
    status text DEFAULT 'SUCCESS'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TenantUsageRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TenantUsageRecord" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "changeType" text NOT NULL,
    "changeAmount" integer NOT NULL,
    "quotaBefore" integer NOT NULL,
    "quotaAfter" integer NOT NULL,
    "amountRmb" numeric(10,2),
    remark text,
    "operatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ToolFavorite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ToolFavorite" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "toolId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ToolPayRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ToolPayRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "toolId" text NOT NULL,
    "toolRecordId" text NOT NULL,
    "orderId" text,
    amount numeric(10,2) NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ToolRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ToolRecord" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "toolId" text NOT NULL,
    input jsonb NOT NULL,
    result jsonb NOT NULL,
    "stationId" text,
    "durationMs" integer,
    ip text,
    "userAgent" text,
    "sourceScene" text,
    "sourceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ToolShare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ToolShare" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "toolId" text NOT NULL,
    "toolRecordId" text NOT NULL,
    "shareToken" text NOT NULL,
    title text,
    "expiresAt" timestamp(3) without time zone,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TopicTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TopicTag" (
    id text NOT NULL,
    name text NOT NULL,
    category text,
    "postCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    phone text,
    email text,
    nickname text NOT NULL,
    avatar text,
    gender integer,
    birthday timestamp(3) without time zone,
    "memberLevel" public."MemberLevel" DEFAULT 'NONE'::public."MemberLevel" NOT NULL,
    "memberExpire" timestamp(3) without time zone,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    bio text,
    "interestCategories" text[] DEFAULT ARRAY[]::text[],
    "paymentPasswordHash" text,
    "competitionInviteCodeId" text,
    "deleteRequestedAt" timestamp(3) without time zone,
    "deleteScheduledAt" timestamp(3) without time zone,
    "teenModeEnabled" boolean DEFAULT false NOT NULL,
    "teenModeSettings" jsonb,
    "identityVerified" boolean DEFAULT false NOT NULL,
    "identityVerifiedAt" timestamp(3) without time zone,
    timezone text DEFAULT 'Asia/Shanghai'::text,
    "preferredCurrency" text DEFAULT 'CNY'::text,
    "attributionSource" text DEFAULT 'PLATFORM'::text NOT NULL,
    "attributionStationId" text,
    "notifySettings" jsonb
);


--
-- Name: TABLE "User"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."User" IS '用户';


--
-- Name: COLUMN "User".phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."User".phone IS '手机号';


--
-- Name: COLUMN "User".email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."User".email IS '邮箱';


--
-- Name: COLUMN "User".nickname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."User".nickname IS '昵称';


--
-- Name: COLUMN "User"."memberLevel"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."User"."memberLevel" IS '会员等级';


--
-- Name: COLUMN "User".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."User".status IS '状态（ACTIVE/DISABLED/BANNED）';


--
-- Name: UserBehavior; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserBehavior" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    behavior public."BehaviorType" NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    scene text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserBehaviorLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserBehaviorLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "targetType" text,
    "targetId" text,
    meta jsonb,
    ip text,
    "deviceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserCoupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserCoupon" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "couponId" text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserEarning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserEarning" (
    id text NOT NULL,
    "userId" text NOT NULL,
    scene public."EarningScene" NOT NULL,
    "refId" text NOT NULL,
    "amountCoin" integer NOT NULL,
    "amountRmb" numeric(10,2) NOT NULL,
    rate numeric(5,4) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserInterest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserInterest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    tag text NOT NULL,
    score double precision DEFAULT 1.0 NOT NULL,
    source text DEFAULT 'BEHAVIOR'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserKnowledgeInteraction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserKnowledgeInteraction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "knowledgeId" text NOT NULL,
    action text NOT NULL,
    "queryText" text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: UserKnowledgeProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserKnowledgeProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "difficultyLevel" double precision DEFAULT 0.5 NOT NULL,
    "totalQueries" integer DEFAULT 0 NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "topInterests" jsonb,
    "topEntities" jsonb
);


--
-- Name: UserPoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserPoints" (
    id text NOT NULL,
    "userId" text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    "totalEarned" integer DEFAULT 0 NOT NULL,
    "totalSpent" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserRole" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleType" public."RoleType" NOT NULL,
    "bindId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Video; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Video" (
    id text NOT NULL,
    "circleId" text,
    "userId" text NOT NULL,
    title text,
    "videoUrl" text NOT NULL,
    "coverUrl" text,
    duration integer,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "likeCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stationId" text,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "collectCount" integer DEFAULT 0 NOT NULL,
    "commentCount" integer DEFAULT 0 NOT NULL,
    "shareCount" integer DEFAULT 0 NOT NULL,
    "categoryLevel1" text,
    "categoryLevel2" text
);


--
-- Name: VideoProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VideoProduct" (
    id text NOT NULL,
    "videoId" text NOT NULL,
    "productId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: VirtualCoinAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VirtualCoinAccount" (
    id text NOT NULL,
    "userId" text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    "totalRecharged" integer DEFAULT 0 NOT NULL,
    "totalSpent" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    frozen integer DEFAULT 0 NOT NULL
);


--
-- Name: VirtualCoinFrozen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VirtualCoinFrozen" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "amountCoin" integer NOT NULL,
    scene text NOT NULL,
    "refId" text,
    status text DEFAULT 'FROZEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);


--
-- Name: VirtualCoinRecharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VirtualCoinRecharge" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "amountRmb" numeric(10,2) NOT NULL,
    "amountCoin" integer NOT NULL,
    "payMethod" text DEFAULT 'WECHAT'::text NOT NULL,
    "orderNo" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: VirtualCoinTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VirtualCoinTransaction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."CoinTransType" NOT NULL,
    "amountCoin" integer NOT NULL,
    "balanceAfter" integer NOT NULL,
    scene public."CoinScene" NOT NULL,
    "refId" text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WanNianLiDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WanNianLiDay" (
    "solarDate" date NOT NULL,
    "lunarYear" integer NOT NULL,
    "lunarMonth" integer NOT NULL,
    "lunarDay" integer NOT NULL,
    "isLeap" boolean DEFAULT false NOT NULL,
    "nianGan" text NOT NULL,
    "nianZhi" text NOT NULL,
    "yueGan" text NOT NULL,
    "yueZhi" text NOT NULL,
    "riGan" text NOT NULL,
    "riZhi" text NOT NULL,
    "lunarYearGZ" text NOT NULL,
    "lunarMonthGZ" text NOT NULL,
    "lunarDayGZ" text NOT NULL,
    "jieQi" text,
    "erShiBaXiu" text NOT NULL,
    "shengXiao" text NOT NULL,
    "weekDay" integer NOT NULL
);


--
-- Name: TABLE "WanNianLiDay"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."WanNianLiDay" IS '万年历逐日数据';


--
-- Name: COLUMN "WanNianLiDay"."solarDate"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."solarDate" IS '公历日期';


--
-- Name: COLUMN "WanNianLiDay"."lunarYear"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."lunarYear" IS '农历年';


--
-- Name: COLUMN "WanNianLiDay"."lunarMonth"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."lunarMonth" IS '农历月';


--
-- Name: COLUMN "WanNianLiDay"."lunarDay"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."lunarDay" IS '农历日';


--
-- Name: COLUMN "WanNianLiDay"."isLeap"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."isLeap" IS '是否闰月';


--
-- Name: COLUMN "WanNianLiDay"."nianGan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."nianGan" IS '年干';


--
-- Name: COLUMN "WanNianLiDay"."nianZhi"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."nianZhi" IS '年支';


--
-- Name: COLUMN "WanNianLiDay"."yueGan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."yueGan" IS '月干';


--
-- Name: COLUMN "WanNianLiDay"."yueZhi"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."yueZhi" IS '月支';


--
-- Name: COLUMN "WanNianLiDay"."riGan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."riGan" IS '日干';


--
-- Name: COLUMN "WanNianLiDay"."riZhi"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."riZhi" IS '日支';


--
-- Name: COLUMN "WanNianLiDay"."jieQi"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."jieQi" IS '节气';


--
-- Name: COLUMN "WanNianLiDay"."erShiBaXiu"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."erShiBaXiu" IS '二十八宿';


--
-- Name: COLUMN "WanNianLiDay"."shengXiao"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."WanNianLiDay"."shengXiao" IS '生肖';


--
-- Name: WebhookSubscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WebhookSubscription" (
    id text NOT NULL,
    event public."WebhookEvent" NOT NULL,
    url text NOT NULL,
    secret text,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastSentAt" timestamp(3) without time zone,
    "lastStatus" integer,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "maxRetries" integer DEFAULT 3 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Withdrawal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Withdrawal" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "stationId" text,
    amount numeric(10,2) NOT NULL,
    "bankName" text,
    "bankAccount" text,
    "bankHolder" text,
    "alipayAccount" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    remark text,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WithdrawalApplication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WithdrawalApplication" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "payMethod" text NOT NULL,
    "accountInfo" jsonb NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "reviewedBy" text,
    "reviewNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ZiweiKnowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ZiweiKnowledge" (
    id text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    source text,
    "contentHash" text,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: _quality_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._quality_snapshot (
    id bigint NOT NULL,
    check_time timestamp without time zone DEFAULT now() NOT NULL,
    dimension text NOT NULL,
    check_name text NOT NULL,
    status text NOT NULL,
    detail text,
    row_count bigint
);


--
-- Name: _quality_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._quality_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _quality_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._quality_snapshot_id_seq OWNED BY public._quality_snapshot.id;


--
-- Name: merchant_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_settlements (
    id text NOT NULL,
    "merchantId" text NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "orderCount" integer DEFAULT 0 NOT NULL,
    "totalRevenue" integer DEFAULT 0 NOT NULL,
    commission integer DEFAULT 0 NOT NULL,
    "settlementAmount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paidAmount" integer,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _quality_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._quality_snapshot ALTER COLUMN id SET DEFAULT nextval('public._quality_snapshot_id_seq'::regclass);


--
-- Name: ActivityMetrics ActivityMetrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityMetrics"
    ADD CONSTRAINT "ActivityMetrics_pkey" PRIMARY KEY (id);


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: AfterSale AfterSale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AfterSale"
    ADD CONSTRAINT "AfterSale_pkey" PRIMARY KEY (id);


--
-- Name: AiAnalysisRecord AiAnalysisRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiAnalysisRecord"
    ADD CONSTRAINT "AiAnalysisRecord_pkey" PRIMARY KEY (id);


--
-- Name: AiCacheEntry AiCacheEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiCacheEntry"
    ADD CONSTRAINT "AiCacheEntry_pkey" PRIMARY KEY (id);


--
-- Name: AiCapability AiCapability_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiCapability"
    ADD CONSTRAINT "AiCapability_name_key" UNIQUE (name);


--
-- Name: AiCapability AiCapability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiCapability"
    ADD CONSTRAINT "AiCapability_pkey" PRIMARY KEY (id);


--
-- Name: AiCollaboration AiCollaboration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiCollaboration"
    ADD CONSTRAINT "AiCollaboration_pkey" PRIMARY KEY (id);


--
-- Name: AiDecision AiDecision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiDecision"
    ADD CONSTRAINT "AiDecision_pkey" PRIMARY KEY (id);


--
-- Name: AiEvent AiEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiEvent"
    ADD CONSTRAINT "AiEvent_pkey" PRIMARY KEY (id);


--
-- Name: AppVersion AppVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppVersion"
    ADD CONSTRAINT "AppVersion_pkey" PRIMARY KEY (id);


--
-- Name: AppealRecord AppealRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppealRecord"
    ADD CONSTRAINT "AppealRecord_pkey" PRIMARY KEY (id);


--
-- Name: ArticleRecommend ArticleRecommend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleRecommend"
    ADD CONSTRAINT "ArticleRecommend_pkey" PRIMARY KEY (id);


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: AudioCallBilling AudioCallBilling_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallBilling"
    ADD CONSTRAINT "AudioCallBilling_pkey" PRIMARY KEY (id);


--
-- Name: AudioCallRecord AudioCallRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallRecord"
    ADD CONSTRAINT "AudioCallRecord_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Auth Auth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Auth"
    ADD CONSTRAINT "Auth_pkey" PRIMARY KEY (id);


--
-- Name: AutomationPermission AutomationPermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationPermission"
    ADD CONSTRAINT "AutomationPermission_pkey" PRIMARY KEY (id);


--
-- Name: AutomationRoleAssignee AutomationRoleAssignee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRoleAssignee"
    ADD CONSTRAINT "AutomationRoleAssignee_pkey" PRIMARY KEY (id);


--
-- Name: AutomationRolePermission AutomationRolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRolePermission"
    ADD CONSTRAINT "AutomationRolePermission_pkey" PRIMARY KEY (id);


--
-- Name: AutomationRole AutomationRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRole"
    ADD CONSTRAINT "AutomationRole_pkey" PRIMARY KEY (id);


--
-- Name: BaziKnowledge BaziKnowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BaziKnowledge"
    ADD CONSTRAINT "BaziKnowledge_pkey" PRIMARY KEY (id);


--
-- Name: BigScreenToken BigScreenToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BigScreenToken"
    ADD CONSTRAINT "BigScreenToken_pkey" PRIMARY KEY (id);


--
-- Name: Blacklist Blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Blacklist"
    ADD CONSTRAINT "Blacklist_pkey" PRIMARY KEY (id);


--
-- Name: Bookmark Bookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_pkey" PRIMARY KEY (id);


--
-- Name: BotChatLog BotChatLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BotChatLog"
    ADD CONSTRAINT "BotChatLog_pkey" PRIMARY KEY (id);


--
-- Name: BotConfig BotConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BotConfig"
    ADD CONSTRAINT "BotConfig_pkey" PRIMARY KEY (id);


--
-- Name: BotKnowledgeBase BotKnowledgeBase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BotKnowledgeBase"
    ADD CONSTRAINT "BotKnowledgeBase_pkey" PRIMARY KEY (id);


--
-- Name: BountyQuestion BountyQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BountyQuestion"
    ADD CONSTRAINT "BountyQuestion_pkey" PRIMARY KEY (id);


--
-- Name: BountyReview BountyReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BountyReview"
    ADD CONSTRAINT "BountyReview_pkey" PRIMARY KEY (id);


--
-- Name: BrowseHistory BrowseHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BrowseHistory"
    ADD CONSTRAINT "BrowseHistory_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: CelebrityCase CelebrityCase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CelebrityCase"
    ADD CONSTRAINT "CelebrityCase_pkey" PRIMARY KEY (id);


--
-- Name: CheckIn CheckIn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CheckIn"
    ADD CONSTRAINT "CheckIn_pkey" PRIMARY KEY (id);


--
-- Name: ChurnAction ChurnAction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChurnAction"
    ADD CONSTRAINT "ChurnAction_pkey" PRIMARY KEY (id);


--
-- Name: ChurnPrediction ChurnPrediction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChurnPrediction"
    ADD CONSTRAINT "ChurnPrediction_pkey" PRIMARY KEY (id);


--
-- Name: ChurnRule ChurnRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChurnRule"
    ADD CONSTRAINT "ChurnRule_pkey" PRIMARY KEY (id);


--
-- Name: CircleAnnouncementRead CircleAnnouncementRead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleAnnouncementRead"
    ADD CONSTRAINT "CircleAnnouncementRead_pkey" PRIMARY KEY (id);


--
-- Name: CircleAnnouncement CircleAnnouncement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleAnnouncement"
    ADD CONSTRAINT "CircleAnnouncement_pkey" PRIMARY KEY (id);


--
-- Name: CircleBot CircleBot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleBot"
    ADD CONSTRAINT "CircleBot_pkey" PRIMARY KEY (id);


--
-- Name: CircleEvent CircleEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleEvent"
    ADD CONSTRAINT "CircleEvent_pkey" PRIMARY KEY (id);


--
-- Name: CircleExpertBooking CircleExpertBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleExpertBooking"
    ADD CONSTRAINT "CircleExpertBooking_pkey" PRIMARY KEY (id);


--
-- Name: CircleGuestEarning CircleGuestEarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleGuestEarning"
    ADD CONSTRAINT "CircleGuestEarning_pkey" PRIMARY KEY (id);


--
-- Name: CircleInvitation CircleInvitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInvitation"
    ADD CONSTRAINT "CircleInvitation_pkey" PRIMARY KEY (id);


--
-- Name: CircleInviteCode CircleInviteCode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInviteCode"
    ADD CONSTRAINT "CircleInviteCode_pkey" PRIMARY KEY (id);


--
-- Name: CircleKnowledgeCandidate CircleKnowledgeCandidate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledgeCandidate"
    ADD CONSTRAINT "CircleKnowledgeCandidate_pkey" PRIMARY KEY (id);


--
-- Name: CircleKnowledgeDedupDecision CircleKnowledgeDedupDecision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledgeDedupDecision"
    ADD CONSTRAINT "CircleKnowledgeDedupDecision_pkey" PRIMARY KEY (id);


--
-- Name: CircleKnowledgeManual CircleKnowledgeManual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledgeManual"
    ADD CONSTRAINT "CircleKnowledgeManual_pkey" PRIMARY KEY (id);


--
-- Name: CircleKnowledge CircleKnowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledge"
    ADD CONSTRAINT "CircleKnowledge_pkey" PRIMARY KEY (id);


--
-- Name: CircleMemberGroupRelation CircleMemberGroupRelation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMemberGroupRelation"
    ADD CONSTRAINT "CircleMemberGroupRelation_pkey" PRIMARY KEY (id);


--
-- Name: CircleMemberGroup CircleMemberGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMemberGroup"
    ADD CONSTRAINT "CircleMemberGroup_pkey" PRIMARY KEY (id);


--
-- Name: CircleMember CircleMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMember"
    ADD CONSTRAINT "CircleMember_pkey" PRIMARY KEY (id);


--
-- Name: CircleRevenueRecord CircleRevenueRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleRevenueRecord"
    ADD CONSTRAINT "CircleRevenueRecord_pkey" PRIMARY KEY (id);


--
-- Name: CircleRevenueSplit CircleRevenueSplit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleRevenueSplit"
    ADD CONSTRAINT "CircleRevenueSplit_pkey" PRIMARY KEY (id);


--
-- Name: Circle Circle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Circle"
    ADD CONSTRAINT "Circle_pkey" PRIMARY KEY (id);


--
-- Name: ClassicAnnotation ClassicAnnotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicAnnotation"
    ADD CONSTRAINT "ClassicAnnotation_pkey" PRIMARY KEY (id);


--
-- Name: ClassicBook ClassicBook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicBook"
    ADD CONSTRAINT "ClassicBook_pkey" PRIMARY KEY (id);


--
-- Name: ClassicChapter ClassicChapter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicChapter"
    ADD CONSTRAINT "ClassicChapter_pkey" PRIMARY KEY (id);


--
-- Name: ClassicCommentary ClassicCommentary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicCommentary"
    ADD CONSTRAINT "ClassicCommentary_pkey" PRIMARY KEY (id);


--
-- Name: ClassicImage ClassicImage_bookId_pageNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicImage"
    ADD CONSTRAINT "ClassicImage_bookId_pageNumber_key" UNIQUE ("bookId", "pageNumber");


--
-- Name: ClassicImage ClassicImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicImage"
    ADD CONSTRAINT "ClassicImage_pkey" PRIMARY KEY (id);


--
-- Name: ClassicOcrText ClassicOcrText_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicOcrText"
    ADD CONSTRAINT "ClassicOcrText_pkey" PRIMARY KEY (id);


--
-- Name: ClassicReadingNote ClassicReadingNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicReadingNote"
    ADD CONSTRAINT "ClassicReadingNote_pkey" PRIMARY KEY (id);


--
-- Name: Collect Collect_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Collect"
    ADD CONSTRAINT "Collect_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: CommissionConfig CommissionConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommissionConfig"
    ADD CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionAnswer CompetitionAnswer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionAnswer"
    ADD CONSTRAINT "CompetitionAnswer_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionArticle CompetitionArticle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionArticle"
    ADD CONSTRAINT "CompetitionArticle_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionInvitation CompetitionInvitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionInvitation"
    ADD CONSTRAINT "CompetitionInvitation_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionInviteCode CompetitionInviteCode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionInviteCode"
    ADD CONSTRAINT "CompetitionInviteCode_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionQuestion CompetitionQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionQuestion"
    ADD CONSTRAINT "CompetitionQuestion_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionRanking CompetitionRanking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRanking"
    ADD CONSTRAINT "CompetitionRanking_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionRegistration CompetitionRegistration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRegistration"
    ADD CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionRound CompetitionRound_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRound"
    ADD CONSTRAINT "CompetitionRound_pkey" PRIMARY KEY (id);


--
-- Name: CompetitionScore CompetitionScore_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionScore"
    ADD CONSTRAINT "CompetitionScore_pkey" PRIMARY KEY (id);


--
-- Name: Competition Competition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Competition"
    ADD CONSTRAINT "Competition_pkey" PRIMARY KEY (id);


--
-- Name: ConfigSystem ConfigSystem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfigSystem"
    ADD CONSTRAINT "ConfigSystem_pkey" PRIMARY KEY (id);


--
-- Name: ConfigVersion ConfigVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConfigVersion"
    ADD CONSTRAINT "ConfigVersion_pkey" PRIMARY KEY (id);


--
-- Name: ContentAuditRecord ContentAuditRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentAuditRecord"
    ADD CONSTRAINT "ContentAuditRecord_pkey" PRIMARY KEY (id);


--
-- Name: Content Content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_pkey" PRIMARY KEY (id);


--
-- Name: CouponRecord CouponRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CouponRecord"
    ADD CONSTRAINT "CouponRecord_pkey" PRIMARY KEY (id);


--
-- Name: CouponTemplate CouponTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CouponTemplate"
    ADD CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- Name: CourseBundleItem CourseBundleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseBundleItem"
    ADD CONSTRAINT "CourseBundleItem_pkey" PRIMARY KEY (id);


--
-- Name: CourseBundle CourseBundle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseBundle"
    ADD CONSTRAINT "CourseBundle_pkey" PRIMARY KEY (id);


--
-- Name: CourseChapter CourseChapter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseChapter"
    ADD CONSTRAINT "CourseChapter_pkey" PRIMARY KEY (id);


--
-- Name: CourseProgress CourseProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseProgress"
    ADD CONSTRAINT "CourseProgress_pkey" PRIMARY KEY (id);


--
-- Name: CourseQa CourseQa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseQa"
    ADD CONSTRAINT "CourseQa_pkey" PRIMARY KEY (id);


--
-- Name: CourseReview CourseReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseReview"
    ADD CONSTRAINT "CourseReview_pkey" PRIMARY KEY (id);


--
-- Name: CourseWork CourseWork_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseWork"
    ADD CONSTRAINT "CourseWork_pkey" PRIMARY KEY (id);


--
-- Name: Course Course_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY (id);


--
-- Name: DailyTask DailyTask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyTask"
    ADD CONSTRAINT "DailyTask_pkey" PRIMARY KEY (id);


--
-- Name: DeviceFingerprint DeviceFingerprint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceFingerprint"
    ADD CONSTRAINT "DeviceFingerprint_pkey" PRIMARY KEY (id);


--
-- Name: DiscountActivity DiscountActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiscountActivity"
    ADD CONSTRAINT "DiscountActivity_pkey" PRIMARY KEY (id);


--
-- Name: EbookBookmark EbookBookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookBookmark"
    ADD CONSTRAINT "EbookBookmark_pkey" PRIMARY KEY (id);


--
-- Name: EbookCategory EbookCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookCategory"
    ADD CONSTRAINT "EbookCategory_pkey" PRIMARY KEY (id);


--
-- Name: EbookChapter EbookChapter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookChapter"
    ADD CONSTRAINT "EbookChapter_pkey" PRIMARY KEY (id);


--
-- Name: EbookNote EbookNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookNote"
    ADD CONSTRAINT "EbookNote_pkey" PRIMARY KEY (id);


--
-- Name: EbookProgress EbookProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookProgress"
    ADD CONSTRAINT "EbookProgress_pkey" PRIMARY KEY (id);


--
-- Name: EbookPurchase EbookPurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookPurchase"
    ADD CONSTRAINT "EbookPurchase_pkey" PRIMARY KEY (id);


--
-- Name: EbookReadingSession EbookReadingSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReadingSession"
    ADD CONSTRAINT "EbookReadingSession_pkey" PRIMARY KEY (id);


--
-- Name: EbookReview EbookReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReview"
    ADD CONSTRAINT "EbookReview_pkey" PRIMARY KEY (id);


--
-- Name: Ebook Ebook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ebook"
    ADD CONSTRAINT "Ebook_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (id);


--
-- Name: Feedback Feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY (id);


--
-- Name: FinancialReport FinancialReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FinancialReport"
    ADD CONSTRAINT "FinancialReport_pkey" PRIMARY KEY (id);


--
-- Name: FlashSaleItem FlashSaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashSaleItem"
    ADD CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY (id);


--
-- Name: FlashSale FlashSale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashSale"
    ADD CONSTRAINT "FlashSale_pkey" PRIMARY KEY (id);


--
-- Name: Follow Follow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_pkey" PRIMARY KEY (id);


--
-- Name: FortuneRecord FortuneRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FortuneRecord"
    ADD CONSTRAINT "FortuneRecord_pkey" PRIMARY KEY (id);


--
-- Name: FortuneSubscription FortuneSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FortuneSubscription"
    ADD CONSTRAINT "FortuneSubscription_pkey" PRIMARY KEY (id);


--
-- Name: FraudDetection FraudDetection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FraudDetection"
    ADD CONSTRAINT "FraudDetection_pkey" PRIMARY KEY (id);


--
-- Name: FreightTemplate FreightTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FreightTemplate"
    ADD CONSTRAINT "FreightTemplate_pkey" PRIMARY KEY (id);


--
-- Name: FullReductionRule FullReductionRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FullReductionRule"
    ADD CONSTRAINT "FullReductionRule_pkey" PRIMARY KEY (id);


--
-- Name: GiftRecord GiftRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftRecord"
    ADD CONSTRAINT "GiftRecord_pkey" PRIMARY KEY (id);


--
-- Name: Gift Gift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Gift"
    ADD CONSTRAINT "Gift_pkey" PRIMARY KEY (id);


--
-- Name: GroupBuyParticipant GroupBuyParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupBuyParticipant"
    ADD CONSTRAINT "GroupBuyParticipant_pkey" PRIMARY KEY (id);


--
-- Name: GroupBuy GroupBuy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupBuy"
    ADD CONSTRAINT "GroupBuy_pkey" PRIMARY KEY (id);


--
-- Name: GrowthRecord GrowthRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GrowthRecord"
    ADD CONSTRAINT "GrowthRecord_pkey" PRIMARY KEY (id);


--
-- Name: GrowthValue GrowthValue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GrowthValue"
    ADD CONSTRAINT "GrowthValue_pkey" PRIMARY KEY (id);


--
-- Name: HuifuConfig HuifuConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HuifuConfig"
    ADD CONSTRAINT "HuifuConfig_pkey" PRIMARY KEY (id);


--
-- Name: HuifuSettlement HuifuSettlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HuifuSettlement"
    ADD CONSTRAINT "HuifuSettlement_pkey" PRIMARY KEY (id);


--
-- Name: HuifuSplitRecord HuifuSplitRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HuifuSplitRecord"
    ADD CONSTRAINT "HuifuSplitRecord_pkey" PRIMARY KEY (id);


--
-- Name: InstituteContentPurchase InstituteContentPurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteContentPurchase"
    ADD CONSTRAINT "InstituteContentPurchase_pkey" PRIMARY KEY (id);


--
-- Name: InstituteContent InstituteContent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteContent"
    ADD CONSTRAINT "InstituteContent_pkey" PRIMARY KEY (id);


--
-- Name: InstituteCourseRegistration InstituteCourseRegistration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteCourseRegistration"
    ADD CONSTRAINT "InstituteCourseRegistration_pkey" PRIMARY KEY (id);


--
-- Name: InstituteCourse InstituteCourse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteCourse"
    ADD CONSTRAINT "InstituteCourse_pkey" PRIMARY KEY (id);


--
-- Name: InstituteDividend InstituteDividend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteDividend"
    ADD CONSTRAINT "InstituteDividend_pkey" PRIMARY KEY (id);


--
-- Name: InstituteEvent InstituteEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteEvent"
    ADD CONSTRAINT "InstituteEvent_pkey" PRIMARY KEY (id);


--
-- Name: InstituteMember InstituteMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteMember"
    ADD CONSTRAINT "InstituteMember_pkey" PRIMARY KEY (id);


--
-- Name: InstituteRevenue InstituteRevenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteRevenue"
    ADD CONSTRAINT "InstituteRevenue_pkey" PRIMARY KEY (id);


--
-- Name: InstituteTaskTemplate InstituteTaskTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteTaskTemplate"
    ADD CONSTRAINT "InstituteTaskTemplate_pkey" PRIMARY KEY (id);


--
-- Name: InstituteTask InstituteTask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteTask"
    ADD CONSTRAINT "InstituteTask_pkey" PRIMARY KEY (id);


--
-- Name: Institute Institute_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Institute"
    ADD CONSTRAINT "Institute_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: KnowledgeEdge KnowledgeEdge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KnowledgeEdge"
    ADD CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY (id);


--
-- Name: KnowledgeEntity KnowledgeEntity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KnowledgeEntity"
    ADD CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY (id);


--
-- Name: LegalDocument LegalDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LegalDocument"
    ADD CONSTRAINT "LegalDocument_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (id);


--
-- Name: LiveAuditLog LiveAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveAuditLog"
    ADD CONSTRAINT "LiveAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: LiveFlashSale LiveFlashSale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveFlashSale"
    ADD CONSTRAINT "LiveFlashSale_pkey" PRIMARY KEY (id);


--
-- Name: LiveMic LiveMic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveMic"
    ADD CONSTRAINT "LiveMic_pkey" PRIMARY KEY (id);


--
-- Name: LiveMinuteData LiveMinuteData_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveMinuteData"
    ADD CONSTRAINT "LiveMinuteData_pkey" PRIMARY KEY (id);


--
-- Name: LiveMutedUser LiveMutedUser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveMutedUser"
    ADD CONSTRAINT "LiveMutedUser_pkey" PRIMARY KEY (id);


--
-- Name: LiveProduct LiveProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveProduct"
    ADD CONSTRAINT "LiveProduct_pkey" PRIMARY KEY (id);


--
-- Name: LiveRoom LiveRoom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveRoom"
    ADD CONSTRAINT "LiveRoom_pkey" PRIMARY KEY (id);


--
-- Name: LiveSlide LiveSlide_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveSlide"
    ADD CONSTRAINT "LiveSlide_pkey" PRIMARY KEY (id);


--
-- Name: LoginDevice LoginDevice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LoginDevice"
    ADD CONSTRAINT "LoginDevice_pkey" PRIMARY KEY (id);


--
-- Name: MarketingPageComponent MarketingPageComponent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarketingPageComponent"
    ADD CONSTRAINT "MarketingPageComponent_pkey" PRIMARY KEY (id);


--
-- Name: MarketingPage MarketingPage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarketingPage"
    ADD CONSTRAINT "MarketingPage_pkey" PRIMARY KEY (id);


--
-- Name: MemberConfig MemberConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MemberConfig"
    ADD CONSTRAINT "MemberConfig_pkey" PRIMARY KEY (id);


--
-- Name: MemberPurchase MemberPurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MemberPurchase"
    ADD CONSTRAINT "MemberPurchase_pkey" PRIMARY KEY (id);


--
-- Name: MerchantAgreement MerchantAgreement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantAgreement"
    ADD CONSTRAINT "MerchantAgreement_pkey" PRIMARY KEY (id);


--
-- Name: MerchantDepositRecord MerchantDepositRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantDepositRecord"
    ADD CONSTRAINT "MerchantDepositRecord_pkey" PRIMARY KEY (id);


--
-- Name: MerchantViolation MerchantViolation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantViolation"
    ADD CONSTRAINT "MerchantViolation_pkey" PRIMARY KEY (id);


--
-- Name: Merchant Merchant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Merchant"
    ADD CONSTRAINT "Merchant_pkey" PRIMARY KEY (id);


--
-- Name: MiniAppConfig MiniAppConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MiniAppConfig"
    ADD CONSTRAINT "MiniAppConfig_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OfflineCourseRegistration OfflineCourseRegistration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineCourseRegistration"
    ADD CONSTRAINT "OfflineCourseRegistration_pkey" PRIMARY KEY (id);


--
-- Name: OfflineCourse OfflineCourse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineCourse"
    ADD CONSTRAINT "OfflineCourse_pkey" PRIMARY KEY (id);


--
-- Name: OperationLog OperationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationLog"
    ADD CONSTRAINT "OperationLog_pkey" PRIMARY KEY (id);


--
-- Name: OperatorEarning OperatorEarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperatorEarning"
    ADD CONSTRAINT "OperatorEarning_pkey" PRIMARY KEY (id);


--
-- Name: Operator Operator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operator"
    ADD CONSTRAINT "Operator_pkey" PRIMARY KEY (id);


--
-- Name: OrderLogistics OrderLogistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderLogistics"
    ADD CONSTRAINT "OrderLogistics_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_payTransactionId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_payTransactionId_key" UNIQUE ("payTransactionId");


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: PageContentConfig PageContentConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PageContentConfig"
    ADD CONSTRAINT "PageContentConfig_pkey" PRIMARY KEY (id);


--
-- Name: PaidQuestion PaidQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaidQuestion"
    ADD CONSTRAINT "PaidQuestion_pkey" PRIMARY KEY (id);


--
-- Name: PaipanGroup PaipanGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaipanGroup"
    ADD CONSTRAINT "PaipanGroup_pkey" PRIMARY KEY (id);


--
-- Name: PaipanRecord PaipanRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaipanRecord"
    ADD CONSTRAINT "PaipanRecord_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PlatformFeeRecord PlatformFeeRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlatformFeeRecord"
    ADD CONSTRAINT "PlatformFeeRecord_pkey" PRIMARY KEY (id);


--
-- Name: PlatformKnowledge PlatformKnowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlatformKnowledge"
    ADD CONSTRAINT "PlatformKnowledge_pkey" PRIMARY KEY (id);


--
-- Name: PoetryCategory PoetryCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PoetryCategory"
    ADD CONSTRAINT "PoetryCategory_pkey" PRIMARY KEY (id);


--
-- Name: PoetryCollection PoetryCollection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PoetryCollection"
    ADD CONSTRAINT "PoetryCollection_pkey" PRIMARY KEY (id);


--
-- Name: Poetry Poetry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Poetry"
    ADD CONSTRAINT "Poetry_pkey" PRIMARY KEY (id);


--
-- Name: PointsRecord PointsRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointsRecord"
    ADD CONSTRAINT "PointsRecord_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: PricingDemand PricingDemand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingDemand"
    ADD CONSTRAINT "PricingDemand_pkey" PRIMARY KEY (id);


--
-- Name: PricingRule PricingRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PricingRule"
    ADD CONSTRAINT "PricingRule_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: ProductReview ProductReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductReview"
    ADD CONSTRAINT "ProductReview_pkey" PRIMARY KEY (id);


--
-- Name: ProductSku ProductSku_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSku"
    ADD CONSTRAINT "ProductSku_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: PromotionMaterial PromotionMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PromotionMaterial"
    ADD CONSTRAINT "PromotionMaterial_pkey" PRIMARY KEY (id);


--
-- Name: QualityScoreRecord QualityScoreRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityScoreRecord"
    ADD CONSTRAINT "QualityScoreRecord_pkey" PRIMARY KEY (id);


--
-- Name: RagPromptTemplate RagPromptTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RagPromptTemplate"
    ADD CONSTRAINT "RagPromptTemplate_pkey" PRIMARY KEY (id);


--
-- Name: ReadingProgress ReadingProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY (id);


--
-- Name: RecommendLog RecommendLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecommendLog"
    ADD CONSTRAINT "RecommendLog_pkey" PRIMARY KEY (id);


--
-- Name: RecommendRule RecommendRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecommendRule"
    ADD CONSTRAINT "RecommendRule_pkey" PRIMARY KEY (id);


--
-- Name: ReconciliationRecord ReconciliationRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReconciliationRecord"
    ADD CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY (id);


--
-- Name: ReferralLink ReferralLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralLink"
    ADD CONSTRAINT "ReferralLink_pkey" PRIMARY KEY (id);


--
-- Name: ReferralRelation ReferralRelation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralRelation"
    ADD CONSTRAINT "ReferralRelation_pkey" PRIMARY KEY (id);


--
-- Name: RenewalRecord RenewalRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RenewalRecord"
    ADD CONSTRAINT "RenewalRecord_pkey" PRIMARY KEY (id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: RiskAlert RiskAlert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RiskAlert"
    ADD CONSTRAINT "RiskAlert_pkey" PRIMARY KEY (id);


--
-- Name: RiskRule RiskRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RiskRule"
    ADD CONSTRAINT "RiskRule_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: SearchHistory SearchHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SearchHistory"
    ADD CONSTRAINT "SearchHistory_pkey" PRIMARY KEY (id);


--
-- Name: SearchWeight SearchWeight_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SearchWeight"
    ADD CONSTRAINT "SearchWeight_pkey" PRIMARY KEY (id);


--
-- Name: SettlementOrder SettlementOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SettlementOrder"
    ADD CONSTRAINT "SettlementOrder_pkey" PRIMARY KEY (id);


--
-- Name: ShippingAddress ShippingAddress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShippingAddress"
    ADD CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY (id);


--
-- Name: SiteNotice SiteNotice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SiteNotice"
    ADD CONSTRAINT "SiteNotice_pkey" PRIMARY KEY (id);


--
-- Name: SmsLog SmsLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsLog"
    ADD CONSTRAINT "SmsLog_pkey" PRIMARY KEY (id);


--
-- Name: SpecialTeacher SpecialTeacher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpecialTeacher"
    ADD CONSTRAINT "SpecialTeacher_pkey" PRIMARY KEY (id);


--
-- Name: StationBundleAccess StationBundleAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationBundleAccess"
    ADD CONSTRAINT "StationBundleAccess_pkey" PRIMARY KEY (id);


--
-- Name: StationEarning StationEarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationEarning"
    ADD CONSTRAINT "StationEarning_pkey" PRIMARY KEY (id);


--
-- Name: StationOffline StationOffline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationOffline"
    ADD CONSTRAINT "StationOffline_pkey" PRIMARY KEY (id);


--
-- Name: StationOrder StationOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationOrder"
    ADD CONSTRAINT "StationOrder_pkey" PRIMARY KEY (id);


--
-- Name: StationPick StationPick_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationPick"
    ADD CONSTRAINT "StationPick_pkey" PRIMARY KEY (id);


--
-- Name: StationProduct StationProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationProduct"
    ADD CONSTRAINT "StationProduct_pkey" PRIMARY KEY (id);


--
-- Name: StationSettlement StationSettlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationSettlement"
    ADD CONSTRAINT "StationSettlement_pkey" PRIMARY KEY (id);


--
-- Name: StationTeacherBooking StationTeacherBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacherBooking"
    ADD CONSTRAINT "StationTeacherBooking_pkey" PRIMARY KEY (id);


--
-- Name: StationTeacherRequest StationTeacherRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacherRequest"
    ADD CONSTRAINT "StationTeacherRequest_pkey" PRIMARY KEY (id);


--
-- Name: StationTeacher StationTeacher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacher"
    ADD CONSTRAINT "StationTeacher_pkey" PRIMARY KEY (id);


--
-- Name: StationToolConfig StationToolConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationToolConfig"
    ADD CONSTRAINT "StationToolConfig_pkey" PRIMARY KEY (id);


--
-- Name: Station Station_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Station"
    ADD CONSTRAINT "Station_pkey" PRIMARY KEY (id);


--
-- Name: TaskTransferLog TaskTransferLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTransferLog"
    ADD CONSTRAINT "TaskTransferLog_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: TemporaryReferralConfig TemporaryReferralConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemporaryReferralConfig"
    ADD CONSTRAINT "TemporaryReferralConfig_pkey" PRIMARY KEY (id);


--
-- Name: TenantApiCall TenantApiCall_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantApiCall"
    ADD CONSTRAINT "TenantApiCall_pkey" PRIMARY KEY (id);


--
-- Name: TenantUsageRecord TenantUsageRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantUsageRecord"
    ADD CONSTRAINT "TenantUsageRecord_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: ToolFavorite ToolFavorite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolFavorite"
    ADD CONSTRAINT "ToolFavorite_pkey" PRIMARY KEY (id);


--
-- Name: ToolPayRecord ToolPayRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolPayRecord"
    ADD CONSTRAINT "ToolPayRecord_pkey" PRIMARY KEY (id);


--
-- Name: ToolRecord ToolRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolRecord"
    ADD CONSTRAINT "ToolRecord_pkey" PRIMARY KEY (id);


--
-- Name: ToolShare ToolShare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolShare"
    ADD CONSTRAINT "ToolShare_pkey" PRIMARY KEY (id);


--
-- Name: TopicTag TopicTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TopicTag"
    ADD CONSTRAINT "TopicTag_pkey" PRIMARY KEY (id);


--
-- Name: UserBehaviorLog UserBehaviorLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBehaviorLog"
    ADD CONSTRAINT "UserBehaviorLog_pkey" PRIMARY KEY (id);


--
-- Name: UserBehavior UserBehavior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBehavior"
    ADD CONSTRAINT "UserBehavior_pkey" PRIMARY KEY (id);


--
-- Name: UserCoupon UserCoupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCoupon"
    ADD CONSTRAINT "UserCoupon_pkey" PRIMARY KEY (id);


--
-- Name: UserEarning UserEarning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserEarning"
    ADD CONSTRAINT "UserEarning_pkey" PRIMARY KEY (id);


--
-- Name: UserInterest UserInterest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserInterest"
    ADD CONSTRAINT "UserInterest_pkey" PRIMARY KEY (id);


--
-- Name: UserKnowledgeInteraction UserKnowledgeInteraction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserKnowledgeInteraction"
    ADD CONSTRAINT "UserKnowledgeInteraction_pkey" PRIMARY KEY (id);


--
-- Name: UserKnowledgeProfile UserKnowledgeProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserKnowledgeProfile"
    ADD CONSTRAINT "UserKnowledgeProfile_pkey" PRIMARY KEY (id);


--
-- Name: UserKnowledgeProfile UserKnowledgeProfile_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserKnowledgeProfile"
    ADD CONSTRAINT "UserKnowledgeProfile_userId_key" UNIQUE ("userId");


--
-- Name: UserPoints UserPoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPoints"
    ADD CONSTRAINT "UserPoints_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VideoProduct VideoProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VideoProduct"
    ADD CONSTRAINT "VideoProduct_pkey" PRIMARY KEY (id);


--
-- Name: Video Video_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_pkey" PRIMARY KEY (id);


--
-- Name: VirtualCoinAccount VirtualCoinAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinAccount"
    ADD CONSTRAINT "VirtualCoinAccount_pkey" PRIMARY KEY (id);


--
-- Name: VirtualCoinFrozen VirtualCoinFrozen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinFrozen"
    ADD CONSTRAINT "VirtualCoinFrozen_pkey" PRIMARY KEY (id);


--
-- Name: VirtualCoinRecharge VirtualCoinRecharge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinRecharge"
    ADD CONSTRAINT "VirtualCoinRecharge_pkey" PRIMARY KEY (id);


--
-- Name: VirtualCoinTransaction VirtualCoinTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinTransaction"
    ADD CONSTRAINT "VirtualCoinTransaction_pkey" PRIMARY KEY (id);


--
-- Name: WanNianLiDay WanNianLiDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WanNianLiDay"
    ADD CONSTRAINT "WanNianLiDay_pkey" PRIMARY KEY ("solarDate");


--
-- Name: WebhookSubscription WebhookSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WebhookSubscription"
    ADD CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY (id);


--
-- Name: WithdrawalApplication WithdrawalApplication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WithdrawalApplication"
    ADD CONSTRAINT "WithdrawalApplication_pkey" PRIMARY KEY (id);


--
-- Name: Withdrawal Withdrawal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Withdrawal"
    ADD CONSTRAINT "Withdrawal_pkey" PRIMARY KEY (id);


--
-- Name: ZiweiKnowledge ZiweiKnowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ZiweiKnowledge"
    ADD CONSTRAINT "ZiweiKnowledge_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: _quality_snapshot _quality_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._quality_snapshot
    ADD CONSTRAINT _quality_snapshot_pkey PRIMARY KEY (id);


--
-- Name: merchant_settlements merchant_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_settlements
    ADD CONSTRAINT merchant_settlements_pkey PRIMARY KEY (id);


--
-- Name: ActivityMetrics_activityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ActivityMetrics_activityId_key" ON public."ActivityMetrics" USING btree ("activityId");


--
-- Name: Activity_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_status_startTime_idx" ON public."Activity" USING btree (status, "startTime");


--
-- Name: AfterSale_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AfterSale_orderId_idx" ON public."AfterSale" USING btree ("orderId");


--
-- Name: AfterSale_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AfterSale_status_idx" ON public."AfterSale" USING btree (status);


--
-- Name: AfterSale_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AfterSale_userId_idx" ON public."AfterSale" USING btree ("userId");


--
-- Name: AfterSale_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AfterSale_userId_status_idx" ON public."AfterSale" USING btree ("userId", status);


--
-- Name: AiAnalysisRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiAnalysisRecord_createdAt_idx" ON public."AiAnalysisRecord" USING btree ("createdAt");


--
-- Name: AiAnalysisRecord_modelUsed_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiAnalysisRecord_modelUsed_createdAt_idx" ON public."AiAnalysisRecord" USING btree ("modelUsed", "createdAt");


--
-- Name: AiAnalysisRecord_paipanRecordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiAnalysisRecord_paipanRecordId_idx" ON public."AiAnalysisRecord" USING btree ("paipanRecordId");


--
-- Name: AiAnalysisRecord_scene_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiAnalysisRecord_scene_createdAt_idx" ON public."AiAnalysisRecord" USING btree (scene, "createdAt");


--
-- Name: AiAnalysisRecord_userId_analyzeType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiAnalysisRecord_userId_analyzeType_createdAt_idx" ON public."AiAnalysisRecord" USING btree ("userId", "analyzeType", "createdAt");


--
-- Name: AiCacheEntry_hitCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCacheEntry_hitCount_idx" ON public."AiCacheEntry" USING btree ("hitCount");


--
-- Name: AiCacheEntry_scene_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCacheEntry_scene_expiresAt_idx" ON public."AiCacheEntry" USING btree (scene, "expiresAt");


--
-- Name: AiCacheEntry_scene_queryHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCacheEntry_scene_queryHash_idx" ON public."AiCacheEntry" USING btree (scene, "queryHash");


--
-- Name: AiCapability_capabilityType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCapability_capabilityType_idx" ON public."AiCapability" USING btree ("capabilityType");


--
-- Name: AiCapability_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCapability_provider_idx" ON public."AiCapability" USING btree (provider);


--
-- Name: AiCapability_scene_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCapability_scene_idx" ON public."AiCapability" USING btree (scene);


--
-- Name: AiCapability_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCapability_status_idx" ON public."AiCapability" USING btree (status);


--
-- Name: AiCollaboration_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCollaboration_createdAt_idx" ON public."AiCollaboration" USING btree ("createdAt");


--
-- Name: AiCollaboration_proposedBy_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCollaboration_proposedBy_createdAt_idx" ON public."AiCollaboration" USING btree ("proposedBy", "createdAt");


--
-- Name: AiCollaboration_riskLevel_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCollaboration_riskLevel_status_idx" ON public."AiCollaboration" USING btree ("riskLevel", status);


--
-- Name: AiCollaboration_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCollaboration_status_createdAt_idx" ON public."AiCollaboration" USING btree (status, "createdAt");


--
-- Name: AiCollaboration_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiCollaboration_type_createdAt_idx" ON public."AiCollaboration" USING btree (type, "createdAt");


--
-- Name: AiDecision_agentId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiDecision_agentId_createdAt_idx" ON public."AiDecision" USING btree ("agentId", "createdAt");


--
-- Name: AiDecision_capabilityId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiDecision_capabilityId_createdAt_idx" ON public."AiDecision" USING btree ("capabilityId", "createdAt");


--
-- Name: AiDecision_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiDecision_createdAt_idx" ON public."AiDecision" USING btree ("createdAt");


--
-- Name: AiDecision_humanAction_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiDecision_humanAction_createdAt_idx" ON public."AiDecision" USING btree ("humanAction", "createdAt");


--
-- Name: AiDecision_riskLevel_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiDecision_riskLevel_createdAt_idx" ON public."AiDecision" USING btree ("riskLevel", "createdAt");


--
-- Name: AiEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiEvent_createdAt_idx" ON public."AiEvent" USING btree ("createdAt");


--
-- Name: AiEvent_severity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiEvent_severity_createdAt_idx" ON public."AiEvent" USING btree (severity, "createdAt");


--
-- Name: AiEvent_source_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiEvent_source_createdAt_idx" ON public."AiEvent" USING btree (source, "createdAt");


--
-- Name: AiEvent_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiEvent_status_createdAt_idx" ON public."AiEvent" USING btree (status, "createdAt");


--
-- Name: AiEvent_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiEvent_type_createdAt_idx" ON public."AiEvent" USING btree (type, "createdAt");


--
-- Name: AppVersion_platform_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppVersion_platform_publishedAt_idx" ON public."AppVersion" USING btree (platform, "publishedAt");


--
-- Name: AppealRecord_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppealRecord_status_createdAt_idx" ON public."AppealRecord" USING btree (status, "createdAt");


--
-- Name: AppealRecord_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AppealRecord_userId_status_idx" ON public."AppealRecord" USING btree ("userId", status);


--
-- Name: ArticleRecommend_articleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ArticleRecommend_articleId_idx" ON public."ArticleRecommend" USING btree ("articleId");


--
-- Name: Article_auditStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_auditStatus_createdAt_idx" ON public."Article" USING btree ("auditStatus", "createdAt");


--
-- Name: Article_circleId_auditStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_circleId_auditStatus_createdAt_idx" ON public."Article" USING btree ("circleId", "auditStatus", "createdAt");


--
-- Name: Article_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_deletedAt_idx" ON public."Article" USING btree ("deletedAt");


--
-- Name: Article_isPushHome_auditStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_isPushHome_auditStatus_idx" ON public."Article" USING btree ("isPushHome", "auditStatus");


--
-- Name: Article_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_stationId_idx" ON public."Article" USING btree ("stationId");


--
-- Name: Article_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Article_userId_createdAt_idx" ON public."Article" USING btree ("userId", "createdAt");


--
-- Name: AudioCallBilling_callRecordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AudioCallBilling_callRecordId_idx" ON public."AudioCallBilling" USING btree ("callRecordId");


--
-- Name: AudioCallRecord_calleeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AudioCallRecord_calleeId_idx" ON public."AudioCallRecord" USING btree ("calleeId");


--
-- Name: AudioCallRecord_callerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AudioCallRecord_callerId_createdAt_idx" ON public."AudioCallRecord" USING btree ("callerId", "createdAt");


--
-- Name: AudioCallRecord_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AudioCallRecord_stationId_idx" ON public."AudioCallRecord" USING btree ("stationId");


--
-- Name: AudioCallRecord_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AudioCallRecord_status_idx" ON public."AudioCallRecord" USING btree (status);


--
-- Name: AuditLog_createdAt_brin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_brin_idx" ON public."AuditLog" USING brin ("createdAt");


--
-- Name: AuditLog_executor_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_executor_createdAt_idx" ON public."AuditLog" USING btree (executor, "createdAt");


--
-- Name: AuditLog_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_targetType_targetId_idx" ON public."AuditLog" USING btree ("targetType", "targetId");


--
-- Name: AuditLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_createdAt_idx" ON public."AuditLog" USING btree ("userId", "createdAt");


--
-- Name: Auth_openId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Auth_openId_key" ON public."Auth" USING btree ("openId");


--
-- Name: Auth_userId_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Auth_userId_provider_idx" ON public."Auth" USING btree ("userId", provider);


--
-- Name: AutomationPermission_resource_action_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AutomationPermission_resource_action_key" ON public."AutomationPermission" USING btree (resource, action);


--
-- Name: AutomationRoleAssignee_roleId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AutomationRoleAssignee_roleId_userId_key" ON public."AutomationRoleAssignee" USING btree ("roleId", "userId");


--
-- Name: AutomationRoleAssignee_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AutomationRoleAssignee_userId_idx" ON public."AutomationRoleAssignee" USING btree ("userId");


--
-- Name: AutomationRolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AutomationRolePermission_roleId_permissionId_key" ON public."AutomationRolePermission" USING btree ("roleId", "permissionId");


--
-- Name: AutomationRole_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AutomationRole_name_key" ON public."AutomationRole" USING btree (name);


--
-- Name: BaziKnowledge_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BaziKnowledge_category_idx" ON public."BaziKnowledge" USING btree (category);


--
-- Name: BaziKnowledge_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BaziKnowledge_createdAt_idx" ON public."BaziKnowledge" USING btree ("createdAt");


--
-- Name: BaziKnowledge_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BaziKnowledge_status_idx" ON public."BaziKnowledge" USING btree (status);


--
-- Name: BaziKnowledge_title_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BaziKnowledge_title_category_key" ON public."BaziKnowledge" USING btree (title, category);


--
-- Name: BigScreenToken_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BigScreenToken_status_idx" ON public."BigScreenToken" USING btree (status);


--
-- Name: BigScreenToken_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BigScreenToken_token_idx" ON public."BigScreenToken" USING btree (token);


--
-- Name: BigScreenToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BigScreenToken_token_key" ON public."BigScreenToken" USING btree (token);


--
-- Name: BigScreenToken_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BigScreenToken_validTo_idx" ON public."BigScreenToken" USING btree ("validTo");


--
-- Name: Blacklist_blockedUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Blacklist_blockedUserId_idx" ON public."Blacklist" USING btree ("blockedUserId");


--
-- Name: Blacklist_userId_blockedUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Blacklist_userId_blockedUserId_key" ON public."Blacklist" USING btree ("userId", "blockedUserId");


--
-- Name: Blacklist_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Blacklist_userId_idx" ON public."Blacklist" USING btree ("userId");


--
-- Name: Bookmark_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bookmark_chapterId_idx" ON public."Bookmark" USING btree ("chapterId");


--
-- Name: Bookmark_userId_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bookmark_userId_bookId_idx" ON public."Bookmark" USING btree ("userId", "bookId");


--
-- Name: BotChatLog_botConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotChatLog_botConfigId_idx" ON public."BotChatLog" USING btree ("botConfigId");


--
-- Name: BotChatLog_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotChatLog_conversationId_idx" ON public."BotChatLog" USING btree ("conversationId");


--
-- Name: BotChatLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotChatLog_createdAt_idx" ON public."BotChatLog" USING btree ("createdAt");


--
-- Name: BotChatLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotChatLog_userId_createdAt_idx" ON public."BotChatLog" USING btree ("userId", "createdAt");


--
-- Name: BotConfig_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotConfig_sortOrder_idx" ON public."BotConfig" USING btree ("sortOrder");


--
-- Name: BotConfig_status_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotConfig_status_type_idx" ON public."BotConfig" USING btree (status, type);


--
-- Name: BotKnowledgeBase_botConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BotKnowledgeBase_botConfigId_idx" ON public."BotKnowledgeBase" USING btree ("botConfigId");


--
-- Name: BountyQuestion_answererId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyQuestion_answererId_idx" ON public."BountyQuestion" USING btree ("answererId");


--
-- Name: BountyQuestion_askerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyQuestion_askerId_createdAt_idx" ON public."BountyQuestion" USING btree ("askerId", "createdAt");


--
-- Name: BountyQuestion_category_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyQuestion_category_status_idx" ON public."BountyQuestion" USING btree (category, status);


--
-- Name: BountyQuestion_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyQuestion_stationId_idx" ON public."BountyQuestion" USING btree ("stationId");


--
-- Name: BountyQuestion_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyQuestion_status_createdAt_idx" ON public."BountyQuestion" USING btree (status, "createdAt");


--
-- Name: BountyReview_questionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BountyReview_questionId_idx" ON public."BountyReview" USING btree ("questionId");


--
-- Name: BrowseHistory_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BrowseHistory_userId_createdAt_idx" ON public."BrowseHistory" USING btree ("userId", "createdAt");


--
-- Name: BrowseHistory_userId_targetType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BrowseHistory_userId_targetType_createdAt_idx" ON public."BrowseHistory" USING btree ("userId", "targetType", "createdAt");


--
-- Name: Category_level_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_level_sortOrder_idx" ON public."Category" USING btree (level, "sortOrder");


--
-- Name: Category_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_parentId_idx" ON public."Category" USING btree ("parentId");


--
-- Name: CelebrityCase_letter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CelebrityCase_letter_idx" ON public."CelebrityCase" USING btree (letter);


--
-- Name: CelebrityCase_primaryCat_secondaryCat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CelebrityCase_primaryCat_secondaryCat_idx" ON public."CelebrityCase" USING btree ("primaryCat", "secondaryCat");


--
-- Name: CelebrityCase_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CelebrityCase_sortOrder_idx" ON public."CelebrityCase" USING btree ("sortOrder");


--
-- Name: CheckIn_userId_checkInDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CheckIn_userId_checkInDate_idx" ON public."CheckIn" USING btree ("userId", "checkInDate");


--
-- Name: CheckIn_userId_checkInDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CheckIn_userId_checkInDate_key" ON public."CheckIn" USING btree ("userId", "checkInDate");


--
-- Name: ChurnAction_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChurnAction_status_idx" ON public."ChurnAction" USING btree (status);


--
-- Name: ChurnAction_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChurnAction_userId_createdAt_idx" ON public."ChurnAction" USING btree ("userId", "createdAt");


--
-- Name: ChurnPrediction_activityScore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChurnPrediction_activityScore_idx" ON public."ChurnPrediction" USING btree ("activityScore");


--
-- Name: ChurnPrediction_riskLevel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChurnPrediction_riskLevel_idx" ON public."ChurnPrediction" USING btree ("riskLevel");


--
-- Name: ChurnPrediction_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ChurnPrediction_userId_key" ON public."ChurnPrediction" USING btree ("userId");


--
-- Name: ChurnRule_riskLevel_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChurnRule_riskLevel_isActive_idx" ON public."ChurnRule" USING btree ("riskLevel", "isActive");


--
-- Name: CircleAnnouncementRead_announcementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleAnnouncementRead_announcementId_idx" ON public."CircleAnnouncementRead" USING btree ("announcementId");


--
-- Name: CircleAnnouncementRead_announcementId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleAnnouncementRead_announcementId_userId_key" ON public."CircleAnnouncementRead" USING btree ("announcementId", "userId");


--
-- Name: CircleAnnouncementRead_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleAnnouncementRead_userId_idx" ON public."CircleAnnouncementRead" USING btree ("userId");


--
-- Name: CircleAnnouncement_circleId_isTop_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleAnnouncement_circleId_isTop_createdAt_idx" ON public."CircleAnnouncement" USING btree ("circleId", "isTop", "createdAt");


--
-- Name: CircleAnnouncement_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleAnnouncement_userId_idx" ON public."CircleAnnouncement" USING btree ("userId");


--
-- Name: CircleBot_botConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleBot_botConfigId_idx" ON public."CircleBot" USING btree ("botConfigId");


--
-- Name: CircleBot_circleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleBot_circleId_key" ON public."CircleBot" USING btree ("circleId");


--
-- Name: CircleEvent_circleId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleEvent_circleId_date_idx" ON public."CircleEvent" USING btree ("circleId", date);


--
-- Name: CircleExpertBooking_bookerUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleExpertBooking_bookerUserId_idx" ON public."CircleExpertBooking" USING btree ("bookerUserId");


--
-- Name: CircleExpertBooking_circleId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleExpertBooking_circleId_status_idx" ON public."CircleExpertBooking" USING btree ("circleId", status);


--
-- Name: CircleExpertBooking_expertUserId_slotDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleExpertBooking_expertUserId_slotDate_idx" ON public."CircleExpertBooking" USING btree ("expertUserId", "slotDate");


--
-- Name: CircleGuestEarning_circleId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleGuestEarning_circleId_createdAt_idx" ON public."CircleGuestEarning" USING btree ("circleId", "createdAt");


--
-- Name: CircleGuestEarning_guestId_settled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleGuestEarning_guestId_settled_idx" ON public."CircleGuestEarning" USING btree ("guestId", settled);


--
-- Name: CircleGuestEarning_scene_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleGuestEarning_scene_idx" ON public."CircleGuestEarning" USING btree (scene);


--
-- Name: CircleGuestEarning_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleGuestEarning_sourceId_idx" ON public."CircleGuestEarning" USING btree ("sourceId");


--
-- Name: CircleInvitation_circleId_inviteeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleInvitation_circleId_inviteeId_key" ON public."CircleInvitation" USING btree ("circleId", "inviteeId");


--
-- Name: CircleInvitation_circleId_inviterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleInvitation_circleId_inviterId_idx" ON public."CircleInvitation" USING btree ("circleId", "inviterId");


--
-- Name: CircleInvitation_inviteCodeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleInvitation_inviteCodeId_idx" ON public."CircleInvitation" USING btree ("inviteCodeId");


--
-- Name: CircleInvitation_inviteeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleInvitation_inviteeId_idx" ON public."CircleInvitation" USING btree ("inviteeId");


--
-- Name: CircleInviteCode_circleId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleInviteCode_circleId_userId_idx" ON public."CircleInviteCode" USING btree ("circleId", "userId");


--
-- Name: CircleInviteCode_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleInviteCode_code_idx" ON public."CircleInviteCode" USING btree (code);


--
-- Name: CircleInviteCode_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleInviteCode_code_key" ON public."CircleInviteCode" USING btree (code);


--
-- Name: CircleKnowledgeCandidate_circleId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledgeCandidate_circleId_status_idx" ON public."CircleKnowledgeCandidate" USING btree ("circleId", status);


--
-- Name: CircleKnowledgeDedupDecision_candidateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledgeDedupDecision_candidateId_idx" ON public."CircleKnowledgeDedupDecision" USING btree ("candidateId");


--
-- Name: CircleKnowledgeDedupDecision_decidedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledgeDedupDecision_decidedAt_idx" ON public."CircleKnowledgeDedupDecision" USING btree ("decidedAt");


--
-- Name: CircleKnowledgeManual_circleId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledgeManual_circleId_createdAt_idx" ON public."CircleKnowledgeManual" USING btree ("circleId", "createdAt");


--
-- Name: CircleKnowledge_circleId_sourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledge_circleId_sourceType_idx" ON public."CircleKnowledge" USING btree ("circleId", "sourceType");


--
-- Name: CircleKnowledge_circleId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledge_circleId_status_idx" ON public."CircleKnowledge" USING btree ("circleId", status);


--
-- Name: CircleKnowledge_scope_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleKnowledge_scope_status_idx" ON public."CircleKnowledge" USING btree (scope, status);


--
-- Name: CircleMemberGroupRelation_groupId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleMemberGroupRelation_groupId_userId_key" ON public."CircleMemberGroupRelation" USING btree ("groupId", "userId");


--
-- Name: CircleMemberGroupRelation_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleMemberGroupRelation_userId_idx" ON public."CircleMemberGroupRelation" USING btree ("userId");


--
-- Name: CircleMemberGroup_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleMemberGroup_circleId_idx" ON public."CircleMemberGroup" USING btree ("circleId");


--
-- Name: CircleMember_circleId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON public."CircleMember" USING btree ("circleId", "userId");


--
-- Name: CircleMember_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleMember_userId_idx" ON public."CircleMember" USING btree ("userId");


--
-- Name: CircleMember_userId_joinedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleMember_userId_joinedAt_idx" ON public."CircleMember" USING btree ("userId", "joinedAt");


--
-- Name: CircleRevenueRecord_circleId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleRevenueRecord_circleId_createdAt_idx" ON public."CircleRevenueRecord" USING btree ("circleId", "createdAt");


--
-- Name: CircleRevenueRecord_settled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleRevenueRecord_settled_idx" ON public."CircleRevenueRecord" USING btree (settled);


--
-- Name: CircleRevenueRecord_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleRevenueRecord_type_idx" ON public."CircleRevenueRecord" USING btree (type);


--
-- Name: CircleRevenueSplit_circleId_guestId_scene_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CircleRevenueSplit_circleId_guestId_scene_key" ON public."CircleRevenueSplit" USING btree ("circleId", "guestId", scene);


--
-- Name: CircleRevenueSplit_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleRevenueSplit_circleId_idx" ON public."CircleRevenueSplit" USING btree ("circleId");


--
-- Name: CircleRevenueSplit_guestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CircleRevenueSplit_guestId_idx" ON public."CircleRevenueSplit" USING btree ("guestId");


--
-- Name: Circle_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Circle_deletedAt_idx" ON public."Circle" USING btree ("deletedAt");


--
-- Name: Circle_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Circle_ownerId_idx" ON public."Circle" USING btree ("ownerId");


--
-- Name: Circle_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Circle_stationId_idx" ON public."Circle" USING btree ("stationId");


--
-- Name: Circle_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Circle_status_idx" ON public."Circle" USING btree (status);


--
-- Name: ClassicAnnotation_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicAnnotation_bookId_idx" ON public."ClassicAnnotation" USING btree ("bookId");


--
-- Name: ClassicAnnotation_bookId_startPos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicAnnotation_bookId_startPos_idx" ON public."ClassicAnnotation" USING btree ("bookId", "startPos");


--
-- Name: ClassicAnnotation_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicAnnotation_chapterId_idx" ON public."ClassicAnnotation" USING btree ("chapterId");


--
-- Name: ClassicBook_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicBook_deletedAt_idx" ON public."ClassicBook" USING btree ("deletedAt");


--
-- Name: ClassicBook_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicBook_status_idx" ON public."ClassicBook" USING btree (status);


--
-- Name: ClassicBook_title_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicBook_title_idx" ON public."ClassicBook" USING btree (title);


--
-- Name: ClassicBook_title_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicBook_title_trgm_idx" ON public."ClassicBook" USING gin (title public.gin_trgm_ops);


--
-- Name: ClassicChapter_bookId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicChapter_bookId_sortOrder_idx" ON public."ClassicChapter" USING btree ("bookId", "sortOrder");


--
-- Name: ClassicChapter_createdAt_brin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicChapter_createdAt_brin_idx" ON public."ClassicChapter" USING brin ("createdAt");


--
-- Name: ClassicChapter_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicChapter_deletedAt_idx" ON public."ClassicChapter" USING btree ("deletedAt");


--
-- Name: ClassicChapter_title_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicChapter_title_trgm_idx" ON public."ClassicChapter" USING gin (title public.gin_trgm_ops);


--
-- Name: ClassicCommentary_bookId_chapterId_author_title_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClassicCommentary_bookId_chapterId_author_title_key" ON public."ClassicCommentary" USING btree ("bookId", "chapterId", author, title);


--
-- Name: ClassicCommentary_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicCommentary_bookId_idx" ON public."ClassicCommentary" USING btree ("bookId");


--
-- Name: ClassicCommentary_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicCommentary_chapterId_idx" ON public."ClassicCommentary" USING btree ("chapterId");


--
-- Name: ClassicCommentary_school_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicCommentary_school_idx" ON public."ClassicCommentary" USING btree (school);


--
-- Name: ClassicCommentary_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicCommentary_type_idx" ON public."ClassicCommentary" USING btree (type);


--
-- Name: ClassicImage_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicImage_bookId_idx" ON public."ClassicImage" USING btree ("bookId");


--
-- Name: ClassicOcrText_imageId_lineNumber_charIndex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicOcrText_imageId_lineNumber_charIndex_idx" ON public."ClassicOcrText" USING btree ("imageId", "lineNumber", "charIndex");


--
-- Name: ClassicOcrText_imageId_pageNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicOcrText_imageId_pageNumber_idx" ON public."ClassicOcrText" USING btree ("imageId", "pageNumber");


--
-- Name: ClassicReadingNote_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicReadingNote_chapterId_idx" ON public."ClassicReadingNote" USING btree ("chapterId");


--
-- Name: ClassicReadingNote_userId_bookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicReadingNote_userId_bookId_idx" ON public."ClassicReadingNote" USING btree ("userId", "bookId");


--
-- Name: ClassicReadingNote_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClassicReadingNote_userId_idx" ON public."ClassicReadingNote" USING btree ("userId");


--
-- Name: Collect_targetType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Collect_targetType_createdAt_idx" ON public."Collect" USING btree ("targetType", "createdAt");


--
-- Name: Collect_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Collect_targetType_targetId_idx" ON public."Collect" USING btree ("targetType", "targetId");


--
-- Name: Collect_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Collect_userId_createdAt_idx" ON public."Collect" USING btree ("userId", "createdAt");


--
-- Name: Collect_userId_targetType_targetId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Collect_userId_targetType_targetId_key" ON public."Collect" USING btree ("userId", "targetType", "targetId");


--
-- Name: Comment_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_deletedAt_idx" ON public."Comment" USING btree ("deletedAt");


--
-- Name: Comment_parentId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_parentId_createdAt_idx" ON public."Comment" USING btree ("parentId", "createdAt");


--
-- Name: Comment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_status_idx" ON public."Comment" USING btree (status);


--
-- Name: Comment_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_userId_createdAt_idx" ON public."Comment" USING btree ("userId", "createdAt");


--
-- Name: CommissionConfig_configKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CommissionConfig_configKey_key" ON public."CommissionConfig" USING btree ("configKey");


--
-- Name: CompetitionAnswer_registrationId_questionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionAnswer_registrationId_questionId_key" ON public."CompetitionAnswer" USING btree ("registrationId", "questionId");


--
-- Name: CompetitionAnswer_roundId_registrationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionAnswer_roundId_registrationId_idx" ON public."CompetitionAnswer" USING btree ("roundId", "registrationId");


--
-- Name: CompetitionArticle_competitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionArticle_competitionId_idx" ON public."CompetitionArticle" USING btree ("competitionId");


--
-- Name: CompetitionArticle_isFeatured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionArticle_isFeatured_idx" ON public."CompetitionArticle" USING btree ("isFeatured");


--
-- Name: CompetitionArticle_qualityRating_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionArticle_qualityRating_idx" ON public."CompetitionArticle" USING btree ("qualityRating");


--
-- Name: CompetitionArticle_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionArticle_userId_idx" ON public."CompetitionArticle" USING btree ("userId");


--
-- Name: CompetitionInvitation_competitionId_inviteeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionInvitation_competitionId_inviteeId_key" ON public."CompetitionInvitation" USING btree ("competitionId", "inviteeId");


--
-- Name: CompetitionInvitation_competitionId_inviterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionInvitation_competitionId_inviterId_idx" ON public."CompetitionInvitation" USING btree ("competitionId", "inviterId");


--
-- Name: CompetitionInvitation_inviteCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionInvitation_inviteCode_idx" ON public."CompetitionInvitation" USING btree ("inviteCode");


--
-- Name: CompetitionInvitation_inviteCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionInvitation_inviteCode_key" ON public."CompetitionInvitation" USING btree ("inviteCode");


--
-- Name: CompetitionInviteCode_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionInviteCode_code_idx" ON public."CompetitionInviteCode" USING btree (code);


--
-- Name: CompetitionInviteCode_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionInviteCode_code_key" ON public."CompetitionInviteCode" USING btree (code);


--
-- Name: CompetitionInviteCode_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionInviteCode_userId_key" ON public."CompetitionInviteCode" USING btree ("userId");


--
-- Name: CompetitionQuestion_competitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionQuestion_competitionId_idx" ON public."CompetitionQuestion" USING btree ("competitionId");


--
-- Name: CompetitionQuestion_difficulty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionQuestion_difficulty_idx" ON public."CompetitionQuestion" USING btree (difficulty);


--
-- Name: CompetitionQuestion_roundId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionQuestion_roundId_idx" ON public."CompetitionQuestion" USING btree ("roundId");


--
-- Name: CompetitionQuestion_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionQuestion_type_idx" ON public."CompetitionQuestion" USING btree (type);


--
-- Name: CompetitionRanking_competitionId_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionRanking_competitionId_rank_idx" ON public."CompetitionRanking" USING btree ("competitionId", rank);


--
-- Name: CompetitionRanking_competitionId_userId_roundId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionRanking_competitionId_userId_roundId_key" ON public."CompetitionRanking" USING btree ("competitionId", "userId", "roundId");


--
-- Name: CompetitionRanking_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionRanking_userId_idx" ON public."CompetitionRanking" USING btree ("userId");


--
-- Name: CompetitionRegistration_competitionId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionRegistration_competitionId_status_idx" ON public."CompetitionRegistration" USING btree ("competitionId", status);


--
-- Name: CompetitionRegistration_competitionId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionRegistration_competitionId_userId_key" ON public."CompetitionRegistration" USING btree ("competitionId", "userId");


--
-- Name: CompetitionRegistration_inviterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionRegistration_inviterId_idx" ON public."CompetitionRegistration" USING btree ("inviterId");


--
-- Name: CompetitionRound_competitionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionRound_competitionId_sortOrder_idx" ON public."CompetitionRound" USING btree ("competitionId", "sortOrder");


--
-- Name: CompetitionScore_registrationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionScore_registrationId_idx" ON public."CompetitionScore" USING btree ("registrationId");


--
-- Name: CompetitionScore_registrationId_roundId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CompetitionScore_registrationId_roundId_key" ON public."CompetitionScore" USING btree ("registrationId", "roundId");


--
-- Name: CompetitionScore_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CompetitionScore_userId_idx" ON public."CompetitionScore" USING btree ("userId");


--
-- Name: Competition_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Competition_createdAt_idx" ON public."Competition" USING btree ("createdAt");


--
-- Name: Competition_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Competition_level_idx" ON public."Competition" USING btree (level);


--
-- Name: Competition_organizerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Competition_organizerId_idx" ON public."Competition" USING btree ("organizerId");


--
-- Name: Competition_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Competition_status_idx" ON public."Competition" USING btree (status);


--
-- Name: Competition_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Competition_type_idx" ON public."Competition" USING btree (type);


--
-- Name: ConfigSystem_configKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ConfigSystem_configKey_key" ON public."ConfigSystem" USING btree ("configKey");


--
-- Name: ConfigVersion_configKey_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConfigVersion_configKey_version_idx" ON public."ConfigVersion" USING btree ("configKey", version);


--
-- Name: ContentAuditRecord_circleId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_circleId_createdAt_idx" ON public."ContentAuditRecord" USING btree ("circleId", "createdAt");


--
-- Name: ContentAuditRecord_contentType_contentId_createdAt_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContentAuditRecord_contentType_contentId_createdAt_key" ON public."ContentAuditRecord" USING btree ("contentType", "contentId", "createdAt");


--
-- Name: ContentAuditRecord_contentType_contentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_contentType_contentId_idx" ON public."ContentAuditRecord" USING btree ("contentType", "contentId");


--
-- Name: ContentAuditRecord_finalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_finalStatus_idx" ON public."ContentAuditRecord" USING btree ("finalStatus");


--
-- Name: ContentAuditRecord_humanAuditorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_humanAuditorId_idx" ON public."ContentAuditRecord" USING btree ("humanAuditorId");


--
-- Name: ContentAuditRecord_isRecommended_finalStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_isRecommended_finalStatus_createdAt_idx" ON public."ContentAuditRecord" USING btree ("isRecommended", "finalStatus", "createdAt");


--
-- Name: ContentAuditRecord_submitterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentAuditRecord_submitterId_idx" ON public."ContentAuditRecord" USING btree ("submitterId");


--
-- Name: Content_categoryLevel1_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_categoryLevel1_status_idx" ON public."Content" USING btree ("categoryLevel1", status);


--
-- Name: Content_categoryLevel2_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_categoryLevel2_status_idx" ON public."Content" USING btree ("categoryLevel2", status);


--
-- Name: Content_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_stationId_idx" ON public."Content" USING btree ("stationId");


--
-- Name: Content_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_status_idx" ON public."Content" USING btree (status);


--
-- Name: Content_status_likeCount_viewCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_status_likeCount_viewCount_idx" ON public."Content" USING btree (status, "likeCount", "viewCount");


--
-- Name: Content_status_viewCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Content_status_viewCount_idx" ON public."Content" USING btree (status, "viewCount");


--
-- Name: CouponRecord_couponId_userId_status_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CouponRecord_couponId_userId_status_key" ON public."CouponRecord" USING btree ("couponId", "userId", status);


--
-- Name: CouponRecord_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CouponRecord_userId_idx" ON public."CouponRecord" USING btree ("userId");


--
-- Name: CouponTemplate_status_endTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CouponTemplate_status_endTime_idx" ON public."CouponTemplate" USING btree (status, "endTime");


--
-- Name: Coupon_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_active_idx" ON public."Coupon" USING btree (status) WHERE (status = 'ACTIVE'::text);


--
-- Name: Coupon_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_status_idx" ON public."Coupon" USING btree (status);


--
-- Name: Coupon_validStart_validEnd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_validStart_validEnd_idx" ON public."Coupon" USING btree ("validStart", "validEnd");


--
-- Name: CourseBundleItem_bundleId_itemType_itemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CourseBundleItem_bundleId_itemType_itemId_key" ON public."CourseBundleItem" USING btree ("bundleId", "itemType", "itemId");


--
-- Name: CourseBundleItem_bundleId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseBundleItem_bundleId_sortOrder_idx" ON public."CourseBundleItem" USING btree ("bundleId", "sortOrder");


--
-- Name: CourseBundle_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseBundle_status_idx" ON public."CourseBundle" USING btree (status);


--
-- Name: CourseBundle_target_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseBundle_target_type_status_idx" ON public."CourseBundle" USING btree (target, type, status);


--
-- Name: CourseBundle_type_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseBundle_type_target_idx" ON public."CourseBundle" USING btree (type, target);


--
-- Name: CourseChapter_courseId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseChapter_courseId_sortOrder_idx" ON public."CourseChapter" USING btree ("courseId", "sortOrder");


--
-- Name: CourseProgress_userId_chapterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CourseProgress_userId_chapterId_key" ON public."CourseProgress" USING btree ("userId", "chapterId");


--
-- Name: CourseProgress_userId_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseProgress_userId_courseId_idx" ON public."CourseProgress" USING btree ("userId", "courseId");


--
-- Name: CourseQa_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseQa_chapterId_idx" ON public."CourseQa" USING btree ("chapterId");


--
-- Name: CourseQa_courseId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseQa_courseId_status_idx" ON public."CourseQa" USING btree ("courseId", status);


--
-- Name: CourseQa_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseQa_userId_idx" ON public."CourseQa" USING btree ("userId");


--
-- Name: CourseReview_courseId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseReview_courseId_createdAt_idx" ON public."CourseReview" USING btree ("courseId", "createdAt");


--
-- Name: CourseReview_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseReview_userId_idx" ON public."CourseReview" USING btree ("userId");


--
-- Name: CourseWork_chapterId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseWork_chapterId_userId_idx" ON public."CourseWork" USING btree ("chapterId", "userId");


--
-- Name: CourseWork_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CourseWork_courseId_idx" ON public."CourseWork" USING btree ("courseId");


--
-- Name: Course_auditStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_auditStatus_idx" ON public."Course" USING btree ("auditStatus");


--
-- Name: Course_auditStatus_studentCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_auditStatus_studentCount_idx" ON public."Course" USING btree ("auditStatus", "studentCount");


--
-- Name: Course_circleId_auditStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_circleId_auditStatus_createdAt_idx" ON public."Course" USING btree ("circleId", "auditStatus", "createdAt");


--
-- Name: Course_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_circleId_idx" ON public."Course" USING btree ("circleId");


--
-- Name: Course_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_deletedAt_idx" ON public."Course" USING btree ("deletedAt");


--
-- Name: Course_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_stationId_idx" ON public."Course" USING btree ("stationId");


--
-- Name: Course_type_auditStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_type_auditStatus_idx" ON public."Course" USING btree (type, "auditStatus");


--
-- Name: Course_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Course_userId_createdAt_idx" ON public."Course" USING btree ("userId", "createdAt");


--
-- Name: DailyTask_userId_taskDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyTask_userId_taskDate_idx" ON public."DailyTask" USING btree ("userId", "taskDate");


--
-- Name: DailyTask_userId_taskType_taskDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DailyTask_userId_taskType_taskDate_key" ON public."DailyTask" USING btree ("userId", "taskType", "taskDate");


--
-- Name: DeviceFingerprint_deviceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviceFingerprint_deviceId_idx" ON public."DeviceFingerprint" USING btree ("deviceId");


--
-- Name: DeviceFingerprint_userId_deviceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DeviceFingerprint_userId_deviceId_key" ON public."DeviceFingerprint" USING btree ("userId", "deviceId");


--
-- Name: DiscountActivity_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DiscountActivity_status_startTime_idx" ON public."DiscountActivity" USING btree (status, "startTime");


--
-- Name: EbookBookmark_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookBookmark_chapterId_idx" ON public."EbookBookmark" USING btree ("chapterId");


--
-- Name: EbookBookmark_userId_ebookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookBookmark_userId_ebookId_idx" ON public."EbookBookmark" USING btree ("userId", "ebookId");


--
-- Name: EbookCategory_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EbookCategory_name_key" ON public."EbookCategory" USING btree (name);


--
-- Name: EbookChapter_ebookId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookChapter_ebookId_sortOrder_idx" ON public."EbookChapter" USING btree ("ebookId", "sortOrder");


--
-- Name: EbookNote_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookNote_chapterId_idx" ON public."EbookNote" USING btree ("chapterId");


--
-- Name: EbookNote_ebookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookNote_ebookId_idx" ON public."EbookNote" USING btree ("ebookId");


--
-- Name: EbookNote_userId_ebookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookNote_userId_ebookId_idx" ON public."EbookNote" USING btree ("userId", "ebookId");


--
-- Name: EbookProgress_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookProgress_chapterId_idx" ON public."EbookProgress" USING btree ("chapterId");


--
-- Name: EbookProgress_userId_ebookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EbookProgress_userId_ebookId_key" ON public."EbookProgress" USING btree ("userId", "ebookId");


--
-- Name: EbookProgress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookProgress_userId_idx" ON public."EbookProgress" USING btree ("userId");


--
-- Name: EbookPurchase_userId_ebookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EbookPurchase_userId_ebookId_key" ON public."EbookPurchase" USING btree ("userId", "ebookId");


--
-- Name: EbookPurchase_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookPurchase_userId_idx" ON public."EbookPurchase" USING btree ("userId");


--
-- Name: EbookReadingSession_ebookId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookReadingSession_ebookId_idx" ON public."EbookReadingSession" USING btree ("ebookId");


--
-- Name: EbookReadingSession_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookReadingSession_userId_date_idx" ON public."EbookReadingSession" USING btree ("userId", date);


--
-- Name: EbookReadingSession_userId_ebookId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EbookReadingSession_userId_ebookId_date_key" ON public."EbookReadingSession" USING btree ("userId", "ebookId", date);


--
-- Name: EbookReview_ebookId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EbookReview_ebookId_createdAt_idx" ON public."EbookReview" USING btree ("ebookId", "createdAt");


--
-- Name: EbookReview_userId_ebookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EbookReview_userId_ebookId_key" ON public."EbookReview" USING btree ("userId", "ebookId");


--
-- Name: Ebook_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ebook_categoryId_idx" ON public."Ebook" USING btree ("categoryId");


--
-- Name: Ebook_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Ebook_status_idx" ON public."Ebook" USING btree (status);


--
-- Name: FeatureFlag_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON public."FeatureFlag" USING btree (key);


--
-- Name: Feedback_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_status_idx" ON public."Feedback" USING btree (status);


--
-- Name: Feedback_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_type_createdAt_idx" ON public."Feedback" USING btree (type, "createdAt");


--
-- Name: Feedback_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_userId_createdAt_idx" ON public."Feedback" USING btree ("userId", "createdAt");


--
-- Name: FinancialReport_type_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FinancialReport_type_period_key" ON public."FinancialReport" USING btree (type, period);


--
-- Name: FlashSaleItem_flashSaleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FlashSaleItem_flashSaleId_idx" ON public."FlashSaleItem" USING btree ("flashSaleId");


--
-- Name: FlashSaleItem_flashSaleId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_productId_key" ON public."FlashSaleItem" USING btree ("flashSaleId", "productId");


--
-- Name: FlashSale_scope_scopePageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FlashSale_scope_scopePageId_idx" ON public."FlashSale" USING btree (scope, "scopePageId");


--
-- Name: FlashSale_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FlashSale_status_startTime_idx" ON public."FlashSale" USING btree (status, "startTime");


--
-- Name: Follow_followedUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Follow_followedUserId_createdAt_idx" ON public."Follow" USING btree ("followedUserId", "createdAt");


--
-- Name: Follow_followedUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Follow_followedUserId_idx" ON public."Follow" USING btree ("followedUserId");


--
-- Name: Follow_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Follow_userId_createdAt_idx" ON public."Follow" USING btree ("userId", "createdAt");


--
-- Name: Follow_userId_followedUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Follow_userId_followedUserId_key" ON public."Follow" USING btree ("userId", "followedUserId");


--
-- Name: FortuneRecord_userId_fortuneType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FortuneRecord_userId_fortuneType_idx" ON public."FortuneRecord" USING btree ("userId", "fortuneType");


--
-- Name: FortuneRecord_userId_fortuneType_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FortuneRecord_userId_fortuneType_period_key" ON public."FortuneRecord" USING btree ("userId", "fortuneType", period);


--
-- Name: FortuneSubscription_userId_fortuneType_pushChannel_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FortuneSubscription_userId_fortuneType_pushChannel_key" ON public."FortuneSubscription" USING btree ("userId", "fortuneType", "pushChannel");


--
-- Name: FortuneSubscription_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FortuneSubscription_userId_idx" ON public."FortuneSubscription" USING btree ("userId");


--
-- Name: FraudDetection_stationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FraudDetection_stationId_status_idx" ON public."FraudDetection" USING btree ("stationId", status);


--
-- Name: FraudDetection_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FraudDetection_status_createdAt_idx" ON public."FraudDetection" USING btree (status, "createdAt");


--
-- Name: FraudDetection_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FraudDetection_userId_idx" ON public."FraudDetection" USING btree ("userId");


--
-- Name: FullReductionRule_status_startTime_endTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FullReductionRule_status_startTime_endTime_idx" ON public."FullReductionRule" USING btree (status, "startTime", "endTime");


--
-- Name: GiftRecord_giftId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftRecord_giftId_idx" ON public."GiftRecord" USING btree ("giftId");


--
-- Name: GiftRecord_liveRoomId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftRecord_liveRoomId_createdAt_idx" ON public."GiftRecord" USING btree ("liveRoomId", "createdAt");


--
-- Name: GiftRecord_toUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftRecord_toUserId_idx" ON public."GiftRecord" USING btree ("toUserId");


--
-- Name: GiftRecord_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftRecord_userId_idx" ON public."GiftRecord" USING btree ("userId");


--
-- Name: GroupBuyParticipant_groupBuyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupBuyParticipant_groupBuyId_idx" ON public."GroupBuyParticipant" USING btree ("groupBuyId");


--
-- Name: GroupBuyParticipant_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupBuyParticipant_groupId_idx" ON public."GroupBuyParticipant" USING btree ("groupId");


--
-- Name: GroupBuyParticipant_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupBuyParticipant_userId_idx" ON public."GroupBuyParticipant" USING btree ("userId");


--
-- Name: GroupBuy_scope_scopePageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupBuy_scope_scopePageId_idx" ON public."GroupBuy" USING btree (scope, "scopePageId");


--
-- Name: GroupBuy_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GroupBuy_status_idx" ON public."GroupBuy" USING btree (status);


--
-- Name: GrowthRecord_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GrowthRecord_userId_createdAt_idx" ON public."GrowthRecord" USING btree ("userId", "createdAt");


--
-- Name: GrowthValue_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GrowthValue_userId_key" ON public."GrowthValue" USING btree ("userId");


--
-- Name: HuifuConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HuifuConfig_key_key" ON public."HuifuConfig" USING btree (key);


--
-- Name: HuifuSettlement_settleBatchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HuifuSettlement_settleBatchId_key" ON public."HuifuSettlement" USING btree ("settleBatchId");


--
-- Name: HuifuSettlement_settleDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HuifuSettlement_settleDate_idx" ON public."HuifuSettlement" USING btree ("settleDate");


--
-- Name: HuifuSettlement_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HuifuSettlement_status_idx" ON public."HuifuSettlement" USING btree (status);


--
-- Name: HuifuSplitRecord_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HuifuSplitRecord_orderId_idx" ON public."HuifuSplitRecord" USING btree ("orderId");


--
-- Name: HuifuSplitRecord_orderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HuifuSplitRecord_orderId_key" ON public."HuifuSplitRecord" USING btree ("orderId");


--
-- Name: HuifuSplitRecord_outTradeNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HuifuSplitRecord_outTradeNo_idx" ON public."HuifuSplitRecord" USING btree ("outTradeNo");


--
-- Name: HuifuSplitRecord_outTradeNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HuifuSplitRecord_outTradeNo_key" ON public."HuifuSplitRecord" USING btree ("outTradeNo");


--
-- Name: HuifuSplitRecord_splitStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HuifuSplitRecord_splitStatus_idx" ON public."HuifuSplitRecord" USING btree ("splitStatus");


--
-- Name: InstituteContentPurchase_contentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteContentPurchase_contentId_idx" ON public."InstituteContentPurchase" USING btree ("contentId");


--
-- Name: InstituteContentPurchase_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteContentPurchase_userId_idx" ON public."InstituteContentPurchase" USING btree ("userId");


--
-- Name: InstituteContent_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteContent_authorId_idx" ON public."InstituteContent" USING btree ("authorId");


--
-- Name: InstituteContent_instituteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteContent_instituteId_idx" ON public."InstituteContent" USING btree ("instituteId");


--
-- Name: InstituteContent_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteContent_status_idx" ON public."InstituteContent" USING btree (status);


--
-- Name: InstituteCourseRegistration_courseId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InstituteCourseRegistration_courseId_userId_key" ON public."InstituteCourseRegistration" USING btree ("courseId", "userId");


--
-- Name: InstituteCourseRegistration_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteCourseRegistration_userId_idx" ON public."InstituteCourseRegistration" USING btree ("userId");


--
-- Name: InstituteCourse_instituteId_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteCourse_instituteId_startTime_idx" ON public."InstituteCourse" USING btree ("instituteId", "startTime");


--
-- Name: InstituteCourse_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteCourse_teacherId_idx" ON public."InstituteCourse" USING btree ("teacherId");


--
-- Name: InstituteDividend_instituteId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteDividend_instituteId_period_idx" ON public."InstituteDividend" USING btree ("instituteId", period);


--
-- Name: InstituteDividend_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteDividend_type_idx" ON public."InstituteDividend" USING btree (type);


--
-- Name: InstituteDividend_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteDividend_userId_idx" ON public."InstituteDividend" USING btree ("userId");


--
-- Name: InstituteEvent_instituteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteEvent_instituteId_idx" ON public."InstituteEvent" USING btree ("instituteId");


--
-- Name: InstituteEvent_lecturerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteEvent_lecturerId_idx" ON public."InstituteEvent" USING btree ("lecturerId");


--
-- Name: InstituteEvent_scheduleAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteEvent_scheduleAt_idx" ON public."InstituteEvent" USING btree ("scheduleAt");


--
-- Name: InstituteEvent_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteEvent_type_status_idx" ON public."InstituteEvent" USING btree (type, status);


--
-- Name: InstituteMember_instituteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteMember_instituteId_idx" ON public."InstituteMember" USING btree ("instituteId");


--
-- Name: InstituteMember_joinYear_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteMember_joinYear_idx" ON public."InstituteMember" USING btree ("joinYear");


--
-- Name: InstituteMember_role_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteMember_role_status_idx" ON public."InstituteMember" USING btree (role, status);


--
-- Name: InstituteMember_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InstituteMember_userId_key" ON public."InstituteMember" USING btree ("userId");


--
-- Name: InstituteRevenue_instituteId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteRevenue_instituteId_createdAt_idx" ON public."InstituteRevenue" USING btree ("instituteId", "createdAt");


--
-- Name: InstituteRevenue_sourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteRevenue_sourceType_idx" ON public."InstituteRevenue" USING btree ("sourceType");


--
-- Name: InstituteTaskTemplate_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteTaskTemplate_status_idx" ON public."InstituteTaskTemplate" USING btree (status);


--
-- Name: InstituteTaskTemplate_taskType_periodUnit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteTaskTemplate_taskType_periodUnit_idx" ON public."InstituteTaskTemplate" USING btree ("taskType", "periodUnit");


--
-- Name: InstituteTask_memberId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InstituteTask_memberId_status_idx" ON public."InstituteTask" USING btree ("memberId", status);


--
-- Name: Institute_adminUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Institute_adminUserId_idx" ON public."Institute" USING btree ("adminUserId");


--
-- Name: Institute_circleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Institute_circleId_key" ON public."Institute" USING btree ("circleId");


--
-- Name: Institute_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Institute_status_idx" ON public."Institute" USING btree (status);


--
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- Name: Invoice_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_userId_idx" ON public."Invoice" USING btree ("userId");


--
-- Name: KnowledgeEdge_fromId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeEdge_fromId_idx" ON public."KnowledgeEdge" USING btree ("fromId");


--
-- Name: KnowledgeEdge_knowledgeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeEdge_knowledgeId_idx" ON public."KnowledgeEdge" USING btree ("knowledgeId");


--
-- Name: KnowledgeEdge_toId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeEdge_toId_idx" ON public."KnowledgeEdge" USING btree ("toId");


--
-- Name: KnowledgeEntity_name_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "KnowledgeEntity_name_type_key" ON public."KnowledgeEntity" USING btree (name, type);


--
-- Name: KnowledgeEntity_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeEntity_type_idx" ON public."KnowledgeEntity" USING btree (type);


--
-- Name: LegalDocument_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LegalDocument_type_status_idx" ON public."LegalDocument" USING btree (type, status);


--
-- Name: Like_targetType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Like_targetType_createdAt_idx" ON public."Like" USING btree ("targetType", "createdAt");


--
-- Name: Like_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Like_targetType_targetId_idx" ON public."Like" USING btree ("targetType", "targetId");


--
-- Name: Like_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Like_userId_createdAt_idx" ON public."Like" USING btree ("userId", "createdAt");


--
-- Name: Like_userId_targetType_targetId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Like_userId_targetType_targetId_key" ON public."Like" USING btree ("userId", "targetType", "targetId");


--
-- Name: LiveAuditLog_liveRoomId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveAuditLog_liveRoomId_createdAt_idx" ON public."LiveAuditLog" USING btree ("liveRoomId", "createdAt");


--
-- Name: LiveFlashSale_liveRoomId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveFlashSale_liveRoomId_status_idx" ON public."LiveFlashSale" USING btree ("liveRoomId", status);


--
-- Name: LiveFlashSale_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveFlashSale_productId_idx" ON public."LiveFlashSale" USING btree ("productId");


--
-- Name: LiveMic_liveRoomId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMic_liveRoomId_idx" ON public."LiveMic" USING btree ("liveRoomId");


--
-- Name: LiveMic_liveRoomId_position_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LiveMic_liveRoomId_position_key" ON public."LiveMic" USING btree ("liveRoomId", "position");


--
-- Name: LiveMic_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMic_userId_idx" ON public."LiveMic" USING btree ("userId");


--
-- Name: LiveMinuteData_minute_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMinuteData_minute_idx" ON public."LiveMinuteData" USING btree (minute);


--
-- Name: LiveMinuteData_roomId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMinuteData_roomId_idx" ON public."LiveMinuteData" USING btree ("roomId");


--
-- Name: LiveMinuteData_roomId_minute_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMinuteData_roomId_minute_idx" ON public."LiveMinuteData" USING btree ("roomId", minute);


--
-- Name: LiveMutedUser_liveRoomId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveMutedUser_liveRoomId_idx" ON public."LiveMutedUser" USING btree ("liveRoomId");


--
-- Name: LiveMutedUser_liveRoomId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LiveMutedUser_liveRoomId_userId_key" ON public."LiveMutedUser" USING btree ("liveRoomId", "userId");


--
-- Name: LiveProduct_liveId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LiveProduct_liveId_productId_key" ON public."LiveProduct" USING btree ("liveId", "productId");


--
-- Name: LiveProduct_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveProduct_productId_idx" ON public."LiveProduct" USING btree ("productId");


--
-- Name: LiveRoom_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_circleId_idx" ON public."LiveRoom" USING btree ("circleId");


--
-- Name: LiveRoom_circleId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_circleId_status_idx" ON public."LiveRoom" USING btree ("circleId", status);


--
-- Name: LiveRoom_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_courseId_idx" ON public."LiveRoom" USING btree ("courseId");


--
-- Name: LiveRoom_hostUserId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_hostUserId_status_idx" ON public."LiveRoom" USING btree ("hostUserId", status);


--
-- Name: LiveRoom_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_stationId_idx" ON public."LiveRoom" USING btree ("stationId");


--
-- Name: LiveRoom_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_status_idx" ON public."LiveRoom" USING btree (status);


--
-- Name: LiveRoom_status_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_status_startTime_idx" ON public."LiveRoom" USING btree (status, "startTime");


--
-- Name: LiveRoom_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveRoom_userId_idx" ON public."LiveRoom" USING btree ("userId");


--
-- Name: LiveSlide_liveRoomId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LiveSlide_liveRoomId_idx" ON public."LiveSlide" USING btree ("liveRoomId");


--
-- Name: LoginDevice_userId_isCurrent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LoginDevice_userId_isCurrent_idx" ON public."LoginDevice" USING btree ("userId", "isCurrent");


--
-- Name: LoginDevice_userId_lastLogin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LoginDevice_userId_lastLogin_idx" ON public."LoginDevice" USING btree ("userId", "lastLogin");


--
-- Name: MarketingPageComponent_pageId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MarketingPageComponent_pageId_sortOrder_idx" ON public."MarketingPageComponent" USING btree ("pageId", "sortOrder");


--
-- Name: MarketingPage_route_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MarketingPage_route_key" ON public."MarketingPage" USING btree (route);


--
-- Name: MarketingPage_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MarketingPage_stationId_idx" ON public."MarketingPage" USING btree ("stationId");


--
-- Name: MemberConfig_level_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MemberConfig_level_key" ON public."MemberConfig" USING btree (level);


--
-- Name: MemberPurchase_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MemberPurchase_userId_idx" ON public."MemberPurchase" USING btree ("userId");


--
-- Name: MerchantAgreement_merchantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MerchantAgreement_merchantId_idx" ON public."MerchantAgreement" USING btree ("merchantId");


--
-- Name: MerchantDepositRecord_merchantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MerchantDepositRecord_merchantId_idx" ON public."MerchantDepositRecord" USING btree ("merchantId");


--
-- Name: MerchantViolation_merchantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MerchantViolation_merchantId_idx" ON public."MerchantViolation" USING btree ("merchantId");


--
-- Name: MerchantViolation_merchantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MerchantViolation_merchantId_status_idx" ON public."MerchantViolation" USING btree ("merchantId", status);


--
-- Name: MerchantViolation_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MerchantViolation_status_idx" ON public."MerchantViolation" USING btree (status);


--
-- Name: Merchant_shopName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Merchant_shopName_idx" ON public."Merchant" USING btree ("shopName");


--
-- Name: Merchant_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Merchant_status_createdAt_idx" ON public."Merchant" USING btree (status, "createdAt");


--
-- Name: Merchant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Merchant_status_idx" ON public."Merchant" USING btree (status);


--
-- Name: Merchant_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Merchant_userId_key" ON public."Merchant" USING btree ("userId");


--
-- Name: MiniAppConfig_appId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MiniAppConfig_appId_key" ON public."MiniAppConfig" USING btree ("appId");


--
-- Name: MiniAppConfig_type_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MiniAppConfig_type_isActive_idx" ON public."MiniAppConfig" USING btree (type, "isActive");


--
-- Name: Notification_userId_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_type_createdAt_idx" ON public."Notification" USING btree ("userId", type, "createdAt");


--
-- Name: OfflineCourseRegistration_courseId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OfflineCourseRegistration_courseId_userId_key" ON public."OfflineCourseRegistration" USING btree ("courseId", "userId");


--
-- Name: OfflineCourseRegistration_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineCourseRegistration_userId_idx" ON public."OfflineCourseRegistration" USING btree ("userId");


--
-- Name: OfflineCourse_auditStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineCourse_auditStatus_idx" ON public."OfflineCourse" USING btree ("auditStatus");


--
-- Name: OfflineCourse_stationId_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OfflineCourse_stationId_startTime_idx" ON public."OfflineCourse" USING btree ("stationId", "startTime");


--
-- Name: OperationLog_action_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperationLog_action_createdAt_idx" ON public."OperationLog" USING btree (action, "createdAt");


--
-- Name: OperationLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperationLog_createdAt_idx" ON public."OperationLog" USING btree ("createdAt");


--
-- Name: OperationLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperationLog_userId_createdAt_idx" ON public."OperationLog" USING btree ("userId", "createdAt");


--
-- Name: OperatorEarning_operatorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperatorEarning_operatorId_createdAt_idx" ON public."OperatorEarning" USING btree ("operatorId", "createdAt");


--
-- Name: OperatorEarning_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OperatorEarning_orderId_idx" ON public."OperatorEarning" USING btree ("orderId");


--
-- Name: Operator_parentOperatorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operator_parentOperatorId_idx" ON public."Operator" USING btree ("parentOperatorId");


--
-- Name: Operator_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Operator_userId_key" ON public."Operator" USING btree ("userId");


--
-- Name: OrderLogistics_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderLogistics_orderId_idx" ON public."OrderLogistics" USING btree ("orderId");


--
-- Name: OrderLogistics_orderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderLogistics_orderId_key" ON public."OrderLogistics" USING btree ("orderId");


--
-- Name: Order_merchantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_merchantId_status_idx" ON public."Order" USING btree ("merchantId", status);


--
-- Name: Order_referrerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_referrerId_idx" ON public."Order" USING btree ("referrerId");


--
-- Name: Order_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_createdAt_idx" ON public."Order" USING btree (status, "createdAt");


--
-- Name: Order_tempReferrerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_tempReferrerId_idx" ON public."Order" USING btree ("tempReferrerId");


--
-- Name: Order_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_type_idx" ON public."Order" USING btree (type);


--
-- Name: Order_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_type_status_idx" ON public."Order" USING btree (type, status);


--
-- Name: Order_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_userId_createdAt_idx" ON public."Order" USING btree ("userId", "createdAt");


--
-- Name: Order_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_userId_status_idx" ON public."Order" USING btree ("userId", status);


--
-- Name: Order_userId_type_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_userId_type_status_createdAt_idx" ON public."Order" USING btree ("userId", type, status, "createdAt");


--
-- Name: Order_userId_type_targetId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_userId_type_targetId_status_idx" ON public."Order" USING btree ("userId", type, "targetId", status);


--
-- Name: PageContentConfig_pageRoute_fieldKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PageContentConfig_pageRoute_fieldKey_key" ON public."PageContentConfig" USING btree ("pageRoute", "fieldKey");


--
-- Name: PaidQuestion_answererId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaidQuestion_answererId_idx" ON public."PaidQuestion" USING btree ("answererId");


--
-- Name: PaidQuestion_askerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaidQuestion_askerId_idx" ON public."PaidQuestion" USING btree ("askerId");


--
-- Name: PaidQuestion_circleId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaidQuestion_circleId_status_idx" ON public."PaidQuestion" USING btree ("circleId", status);


--
-- Name: PaidQuestion_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaidQuestion_stationId_idx" ON public."PaidQuestion" USING btree ("stationId");


--
-- Name: PaipanGroup_userId_paipanType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaipanGroup_userId_paipanType_idx" ON public."PaipanGroup" USING btree ("userId", "paipanType");


--
-- Name: PaipanGroup_userId_paipanType_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PaipanGroup_userId_paipanType_name_key" ON public."PaipanGroup" USING btree ("userId", "paipanType", name);


--
-- Name: PaipanRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaipanRecord_createdAt_idx" ON public."PaipanRecord" USING btree ("createdAt");


--
-- Name: PaipanRecord_paipanType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaipanRecord_paipanType_idx" ON public."PaipanRecord" USING btree ("paipanType");


--
-- Name: PaipanRecord_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaipanRecord_userId_createdAt_idx" ON public."PaipanRecord" USING btree ("userId", "createdAt");


--
-- Name: PaipanRecord_userId_paipanType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaipanRecord_userId_paipanType_createdAt_idx" ON public."PaipanRecord" USING btree ("userId", "paipanType", "createdAt");


--
-- Name: Permission_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_key_key" ON public."Permission" USING btree (key);


--
-- Name: PlatformFeeRecord_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformFeeRecord_circleId_idx" ON public."PlatformFeeRecord" USING btree ("circleId");


--
-- Name: PlatformFeeRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformFeeRecord_createdAt_idx" ON public."PlatformFeeRecord" USING btree ("createdAt");


--
-- Name: PlatformFeeRecord_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformFeeRecord_type_idx" ON public."PlatformFeeRecord" USING btree (type);


--
-- Name: PlatformKnowledge_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformKnowledge_category_idx" ON public."PlatformKnowledge" USING btree (category);


--
-- Name: PlatformKnowledge_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformKnowledge_createdAt_idx" ON public."PlatformKnowledge" USING btree ("createdAt");


--
-- Name: PlatformKnowledge_qualityScore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformKnowledge_qualityScore_idx" ON public."PlatformKnowledge" USING btree ("qualityScore");


--
-- Name: PlatformKnowledge_sourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformKnowledge_sourceType_idx" ON public."PlatformKnowledge" USING btree ("sourceType");


--
-- Name: PlatformKnowledge_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformKnowledge_sourceType_sourceId_idx" ON public."PlatformKnowledge" USING btree ("sourceType", "sourceId");


--
-- Name: PoetryCategory_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PoetryCategory_name_key" ON public."PoetryCategory" USING btree (name);


--
-- Name: PoetryCategory_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PoetryCategory_sortOrder_idx" ON public."PoetryCategory" USING btree ("sortOrder");


--
-- Name: PoetryCollection_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PoetryCollection_sortOrder_idx" ON public."PoetryCollection" USING btree ("sortOrder");


--
-- Name: PoetryCollection_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PoetryCollection_status_idx" ON public."PoetryCollection" USING btree (status);


--
-- Name: Poetry_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_author_idx" ON public."Poetry" USING btree (author);


--
-- Name: Poetry_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_categoryId_idx" ON public."Poetry" USING btree ("categoryId");


--
-- Name: Poetry_collectionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_collectionId_idx" ON public."Poetry" USING btree ("collectionId");


--
-- Name: Poetry_dynasty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_dynasty_idx" ON public."Poetry" USING btree (dynasty);


--
-- Name: Poetry_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_status_idx" ON public."Poetry" USING btree (status);


--
-- Name: Poetry_status_isRecommended_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_status_isRecommended_idx" ON public."Poetry" USING btree (status, "isRecommended");


--
-- Name: Poetry_status_likes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Poetry_status_likes_idx" ON public."Poetry" USING btree (status, likes);


--
-- Name: PointsRecord_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PointsRecord_userId_createdAt_idx" ON public."PointsRecord" USING btree ("userId", "createdAt");


--
-- Name: Post_circleId_isPushHome_auditStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_circleId_isPushHome_auditStatus_createdAt_idx" ON public."Post" USING btree ("circleId", "isPushHome", "auditStatus", "createdAt");


--
-- Name: Post_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_deletedAt_idx" ON public."Post" USING btree ("deletedAt");


--
-- Name: Post_isRecommended_auditStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_isRecommended_auditStatus_createdAt_idx" ON public."Post" USING btree ("isRecommended", "auditStatus", "createdAt");


--
-- Name: Post_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_userId_idx" ON public."Post" USING btree ("userId");


--
-- Name: PricingDemand_targetType_targetId_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingDemand_targetType_targetId_recordedAt_idx" ON public."PricingDemand" USING btree ("targetType", "targetId", "recordedAt");


--
-- Name: PricingRule_targetType_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PricingRule_targetType_isActive_idx" ON public."PricingRule" USING btree ("targetType", "isActive");


--
-- Name: ProductCategory_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCategory_parentId_idx" ON public."ProductCategory" USING btree ("parentId");


--
-- Name: ProductReview_productId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductReview_productId_createdAt_idx" ON public."ProductReview" USING btree ("productId", "createdAt");


--
-- Name: ProductReview_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductReview_userId_idx" ON public."ProductReview" USING btree ("userId");


--
-- Name: ProductSku_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductSku_productId_idx" ON public."ProductSku" USING btree ("productId");


--
-- Name: Product_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_active_idx" ON public."Product" USING btree (status) WHERE (status = 'ON_SALE'::text);


--
-- Name: Product_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_categoryId_idx" ON public."Product" USING btree ("categoryId");


--
-- Name: Product_circleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_circleId_idx" ON public."Product" USING btree ("circleId");


--
-- Name: Product_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_deletedAt_idx" ON public."Product" USING btree ("deletedAt");


--
-- Name: Product_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_stationId_idx" ON public."Product" USING btree ("stationId");


--
-- Name: Product_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_createdAt_idx" ON public."Product" USING btree (status, "createdAt");


--
-- Name: Product_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_idx" ON public."Product" USING btree (status);


--
-- Name: Product_status_salesCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_salesCount_idx" ON public."Product" USING btree (status, "salesCount");


--
-- Name: Product_supplierType_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_supplierType_status_idx" ON public."Product" USING btree ("supplierType", status);


--
-- Name: PromotionMaterial_stationId_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PromotionMaterial_stationId_type_idx" ON public."PromotionMaterial" USING btree ("stationId", type);


--
-- Name: QualityScoreRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityScoreRecord_createdAt_idx" ON public."QualityScoreRecord" USING btree ("createdAt");


--
-- Name: QualityScoreRecord_overall_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityScoreRecord_overall_idx" ON public."QualityScoreRecord" USING btree (overall);


--
-- Name: QualityScoreRecord_scene_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityScoreRecord_scene_createdAt_idx" ON public."QualityScoreRecord" USING btree (scene, "createdAt");


--
-- Name: RagPromptTemplate_scene_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RagPromptTemplate_scene_idx" ON public."RagPromptTemplate" USING btree (scene);


--
-- Name: RagPromptTemplate_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RagPromptTemplate_status_idx" ON public."RagPromptTemplate" USING btree (status);


--
-- Name: ReadingProgress_chapterId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReadingProgress_chapterId_idx" ON public."ReadingProgress" USING btree ("chapterId");


--
-- Name: ReadingProgress_userId_bookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReadingProgress_userId_bookId_key" ON public."ReadingProgress" USING btree ("userId", "bookId");


--
-- Name: ReadingProgress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReadingProgress_userId_idx" ON public."ReadingProgress" USING btree ("userId");


--
-- Name: RecommendLog_recommendId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendLog_recommendId_idx" ON public."RecommendLog" USING btree ("recommendId");


--
-- Name: RecommendLog_scene_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendLog_scene_createdAt_idx" ON public."RecommendLog" USING btree (scene, "createdAt");


--
-- Name: RecommendLog_strategy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendLog_strategy_idx" ON public."RecommendLog" USING btree (strategy);


--
-- Name: RecommendLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendLog_userId_createdAt_idx" ON public."RecommendLog" USING btree ("userId", "createdAt");


--
-- Name: RecommendRule_ruleType_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendRule_ruleType_priority_idx" ON public."RecommendRule" USING btree ("ruleType", priority);


--
-- Name: RecommendRule_scene_ruleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendRule_scene_ruleType_idx" ON public."RecommendRule" USING btree (scene, "ruleType");


--
-- Name: RecommendRule_scene_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecommendRule_scene_targetType_targetId_idx" ON public."RecommendRule" USING btree (scene, "targetType", "targetId");


--
-- Name: ReconciliationRecord_source_billDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReconciliationRecord_source_billDate_idx" ON public."ReconciliationRecord" USING btree (source, "billDate");


--
-- Name: ReconciliationRecord_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReconciliationRecord_status_idx" ON public."ReconciliationRecord" USING btree (status);


--
-- Name: ReferralLink_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralLink_code_idx" ON public."ReferralLink" USING btree (code);


--
-- Name: ReferralLink_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReferralLink_code_key" ON public."ReferralLink" USING btree (code);


--
-- Name: ReferralLink_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralLink_userId_createdAt_idx" ON public."ReferralLink" USING btree ("userId", "createdAt");


--
-- Name: ReferralRelation_referrerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralRelation_referrerId_idx" ON public."ReferralRelation" USING btree ("referrerId");


--
-- Name: ReferralRelation_userId_referrerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReferralRelation_userId_referrerId_key" ON public."ReferralRelation" USING btree ("userId", "referrerId");


--
-- Name: ReferralRelation_userId_relationStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralRelation_userId_relationStatus_idx" ON public."ReferralRelation" USING btree ("userId", "relationStatus");


--
-- Name: RenewalRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RenewalRecord_createdAt_idx" ON public."RenewalRecord" USING btree ("createdAt");


--
-- Name: RenewalRecord_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RenewalRecord_targetType_targetId_idx" ON public."RenewalRecord" USING btree ("targetType", "targetId");


--
-- Name: RenewalRecord_userId_targetType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RenewalRecord_userId_targetType_idx" ON public."RenewalRecord" USING btree ("userId", "targetType");


--
-- Name: Report_reporterId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Report_reporterId_createdAt_idx" ON public."Report" USING btree ("reporterId", "createdAt");


--
-- Name: Report_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Report_status_idx" ON public."Report" USING btree (status);


--
-- Name: Report_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Report_targetType_targetId_idx" ON public."Report" USING btree ("targetType", "targetId");


--
-- Name: RiskAlert_stationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RiskAlert_stationId_status_idx" ON public."RiskAlert" USING btree ("stationId", status);


--
-- Name: RiskAlert_status_level_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RiskAlert_status_level_createdAt_idx" ON public."RiskAlert" USING btree (status, level, "createdAt");


--
-- Name: RiskAlert_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RiskAlert_type_createdAt_idx" ON public."RiskAlert" USING btree (type, "createdAt");


--
-- Name: RiskRule_type_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RiskRule_type_enabled_idx" ON public."RiskRule" USING btree (type, enabled);


--
-- Name: RolePermission_roleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RolePermission_roleType_idx" ON public."RolePermission" USING btree ("roleType");


--
-- Name: RolePermission_roleType_permissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RolePermission_roleType_permissionId_key" ON public."RolePermission" USING btree ("roleType", "permissionId");


--
-- Name: SearchHistory_createdAt_brin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SearchHistory_createdAt_brin_idx" ON public."SearchHistory" USING brin ("createdAt");


--
-- Name: SearchHistory_keyword_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SearchHistory_keyword_idx" ON public."SearchHistory" USING btree (keyword);


--
-- Name: SearchHistory_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SearchHistory_userId_createdAt_idx" ON public."SearchHistory" USING btree ("userId", "createdAt");


--
-- Name: SearchWeight_entityType_fieldName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SearchWeight_entityType_fieldName_key" ON public."SearchWeight" USING btree ("entityType", "fieldName");


--
-- Name: SettlementOrder_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SettlementOrder_status_idx" ON public."SettlementOrder" USING btree (status);


--
-- Name: SettlementOrder_userId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SettlementOrder_userId_period_idx" ON public."SettlementOrder" USING btree ("userId", period);


--
-- Name: ShippingAddress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ShippingAddress_userId_idx" ON public."ShippingAddress" USING btree ("userId");


--
-- Name: SiteNotice_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SiteNotice_isActive_idx" ON public."SiteNotice" USING btree ("isActive");


--
-- Name: SmsLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsLog_createdAt_idx" ON public."SmsLog" USING btree ("createdAt");


--
-- Name: SmsLog_phone_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsLog_phone_createdAt_idx" ON public."SmsLog" USING btree (phone, "createdAt");


--
-- Name: SmsLog_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsLog_status_createdAt_idx" ON public."SmsLog" USING btree (status, "createdAt");


--
-- Name: SpecialTeacher_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpecialTeacher_level_idx" ON public."SpecialTeacher" USING btree (level);


--
-- Name: SpecialTeacher_totalScore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SpecialTeacher_totalScore_idx" ON public."SpecialTeacher" USING btree ("totalScore");


--
-- Name: SpecialTeacher_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SpecialTeacher_userId_key" ON public."SpecialTeacher" USING btree ("userId");


--
-- Name: StationBundleAccess_bundleId_operatorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StationBundleAccess_bundleId_operatorId_key" ON public."StationBundleAccess" USING btree ("bundleId", "operatorId");


--
-- Name: StationBundleAccess_bundleId_stationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StationBundleAccess_bundleId_stationId_key" ON public."StationBundleAccess" USING btree ("bundleId", "stationId");


--
-- Name: StationBundleAccess_operatorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationBundleAccess_operatorId_idx" ON public."StationBundleAccess" USING btree ("operatorId");


--
-- Name: StationBundleAccess_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationBundleAccess_stationId_idx" ON public."StationBundleAccess" USING btree ("stationId");


--
-- Name: StationEarning_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationEarning_orderId_idx" ON public."StationEarning" USING btree ("orderId");


--
-- Name: StationEarning_stationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationEarning_stationId_createdAt_idx" ON public."StationEarning" USING btree ("stationId", "createdAt");


--
-- Name: StationOffline_ownerUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StationOffline_ownerUserId_key" ON public."StationOffline" USING btree ("ownerUserId");


--
-- Name: StationOrder_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationOrder_stationId_idx" ON public."StationOrder" USING btree ("stationId");


--
-- Name: StationPick_stationId_contentType_contentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StationPick_stationId_contentType_contentId_key" ON public."StationPick" USING btree ("stationId", "contentType", "contentId");


--
-- Name: StationPick_stationId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationPick_stationId_sortOrder_idx" ON public."StationPick" USING btree ("stationId", "sortOrder");


--
-- Name: StationProduct_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationProduct_stationId_idx" ON public."StationProduct" USING btree ("stationId");


--
-- Name: StationSettlement_stationId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationSettlement_stationId_period_idx" ON public."StationSettlement" USING btree ("stationId", period);


--
-- Name: StationTeacherBooking_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacherBooking_stationId_idx" ON public."StationTeacherBooking" USING btree ("stationId");


--
-- Name: StationTeacherBooking_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacherBooking_teacherId_idx" ON public."StationTeacherBooking" USING btree ("teacherId");


--
-- Name: StationTeacherRequest_stationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacherRequest_stationId_status_idx" ON public."StationTeacherRequest" USING btree ("stationId", status);


--
-- Name: StationTeacherRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacherRequest_status_idx" ON public."StationTeacherRequest" USING btree (status);


--
-- Name: StationTeacherRequest_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacherRequest_teacherId_idx" ON public."StationTeacherRequest" USING btree ("teacherId");


--
-- Name: StationTeacher_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationTeacher_stationId_idx" ON public."StationTeacher" USING btree ("stationId");


--
-- Name: StationToolConfig_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StationToolConfig_stationId_idx" ON public."StationToolConfig" USING btree ("stationId");


--
-- Name: StationToolConfig_stationId_toolId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StationToolConfig_stationId_toolId_key" ON public."StationToolConfig" USING btree ("stationId", "toolId");


--
-- Name: Station_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Station_active_idx" ON public."Station" USING btree (status) WHERE (status = 'ACTIVE'::text);


--
-- Name: Station_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Station_code_idx" ON public."Station" USING btree (code);


--
-- Name: Station_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Station_code_key" ON public."Station" USING btree (code);


--
-- Name: Station_operatorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Station_operatorId_idx" ON public."Station" USING btree ("operatorId");


--
-- Name: Station_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Station_userId_key" ON public."Station" USING btree ("userId");


--
-- Name: TaskTransferLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTransferLog_createdAt_idx" ON public."TaskTransferLog" USING btree ("createdAt");


--
-- Name: TaskTransferLog_taskId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTransferLog_taskId_idx" ON public."TaskTransferLog" USING btree ("taskId");


--
-- Name: Task_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_createdAt_idx" ON public."Task" USING btree ("createdAt");


--
-- Name: Task_executorType_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_executorType_status_idx" ON public."Task" USING btree ("executorType", status);


--
-- Name: Task_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_priority_idx" ON public."Task" USING btree (priority);


--
-- Name: Task_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_status_idx" ON public."Task" USING btree (status);


--
-- Name: TemporaryReferralConfig_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TemporaryReferralConfig_stationId_idx" ON public."TemporaryReferralConfig" USING btree ("stationId");


--
-- Name: TemporaryReferralConfig_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TemporaryReferralConfig_validFrom_validTo_idx" ON public."TemporaryReferralConfig" USING btree ("validFrom", "validTo");


--
-- Name: TenantApiCall_apiType_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantApiCall_apiType_createdAt_idx" ON public."TenantApiCall" USING btree ("apiType", "createdAt");


--
-- Name: TenantApiCall_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantApiCall_tenantId_createdAt_idx" ON public."TenantApiCall" USING btree ("tenantId", "createdAt");


--
-- Name: TenantUsageRecord_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TenantUsageRecord_tenantId_createdAt_idx" ON public."TenantUsageRecord" USING btree ("tenantId", "createdAt");


--
-- Name: Tenant_apiKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tenant_apiKey_idx" ON public."Tenant" USING btree ("apiKey");


--
-- Name: Tenant_apiKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_apiKey_key" ON public."Tenant" USING btree ("apiKey");


--
-- Name: Tenant_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_name_key" ON public."Tenant" USING btree (name);


--
-- Name: Tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tenant_status_idx" ON public."Tenant" USING btree (status);


--
-- Name: ToolFavorite_userId_toolId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ToolFavorite_userId_toolId_key" ON public."ToolFavorite" USING btree ("userId", "toolId");


--
-- Name: ToolPayRecord_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolPayRecord_orderId_idx" ON public."ToolPayRecord" USING btree ("orderId");


--
-- Name: ToolPayRecord_toolRecordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolPayRecord_toolRecordId_idx" ON public."ToolPayRecord" USING btree ("toolRecordId");


--
-- Name: ToolPayRecord_userId_toolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolPayRecord_userId_toolId_idx" ON public."ToolPayRecord" USING btree ("userId", "toolId");


--
-- Name: ToolRecord_stationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolRecord_stationId_createdAt_idx" ON public."ToolRecord" USING btree ("stationId", "createdAt");


--
-- Name: ToolRecord_toolId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolRecord_toolId_createdAt_idx" ON public."ToolRecord" USING btree ("toolId", "createdAt");


--
-- Name: ToolRecord_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolRecord_userId_createdAt_idx" ON public."ToolRecord" USING btree ("userId", "createdAt");


--
-- Name: ToolRecord_userId_toolId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolRecord_userId_toolId_createdAt_idx" ON public."ToolRecord" USING btree ("userId", "toolId", "createdAt");


--
-- Name: ToolShare_shareToken_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolShare_shareToken_idx" ON public."ToolShare" USING btree ("shareToken");


--
-- Name: ToolShare_shareToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ToolShare_shareToken_key" ON public."ToolShare" USING btree ("shareToken");


--
-- Name: ToolShare_toolRecordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolShare_toolRecordId_idx" ON public."ToolShare" USING btree ("toolRecordId");


--
-- Name: ToolShare_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ToolShare_userId_idx" ON public."ToolShare" USING btree ("userId");


--
-- Name: TopicTag_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TopicTag_name_key" ON public."TopicTag" USING btree (name);


--
-- Name: TopicTag_postCount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TopicTag_postCount_idx" ON public."TopicTag" USING btree ("postCount");


--
-- Name: UserBehaviorLog_action_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehaviorLog_action_createdAt_idx" ON public."UserBehaviorLog" USING btree (action, "createdAt");


--
-- Name: UserBehaviorLog_deviceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehaviorLog_deviceId_idx" ON public."UserBehaviorLog" USING btree ("deviceId");


--
-- Name: UserBehaviorLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehaviorLog_userId_createdAt_idx" ON public."UserBehaviorLog" USING btree ("userId", "createdAt");


--
-- Name: UserBehavior_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehavior_createdAt_idx" ON public."UserBehavior" USING btree ("createdAt");


--
-- Name: UserBehavior_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehavior_targetType_targetId_idx" ON public."UserBehavior" USING btree ("targetType", "targetId");


--
-- Name: UserBehavior_userId_behavior_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehavior_userId_behavior_createdAt_idx" ON public."UserBehavior" USING btree ("userId", behavior, "createdAt");


--
-- Name: UserBehavior_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBehavior_userId_createdAt_idx" ON public."UserBehavior" USING btree ("userId", "createdAt");


--
-- Name: UserCoupon_couponId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserCoupon_couponId_idx" ON public."UserCoupon" USING btree ("couponId");


--
-- Name: UserCoupon_userId_used_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserCoupon_userId_used_idx" ON public."UserCoupon" USING btree ("userId", used);


--
-- Name: UserEarning_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserEarning_refId_idx" ON public."UserEarning" USING btree ("refId");


--
-- Name: UserEarning_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserEarning_userId_createdAt_idx" ON public."UserEarning" USING btree ("userId", "createdAt");


--
-- Name: UserInterest_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserInterest_tag_idx" ON public."UserInterest" USING btree (tag);


--
-- Name: UserInterest_tag_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserInterest_tag_score_idx" ON public."UserInterest" USING btree (tag, score);


--
-- Name: UserInterest_userId_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserInterest_userId_score_idx" ON public."UserInterest" USING btree ("userId", score);


--
-- Name: UserInterest_userId_tag_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserInterest_userId_tag_key" ON public."UserInterest" USING btree ("userId", tag);


--
-- Name: UserKnowledgeInteraction_knowledgeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserKnowledgeInteraction_knowledgeId_idx" ON public."UserKnowledgeInteraction" USING btree ("knowledgeId");


--
-- Name: UserKnowledgeInteraction_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserKnowledgeInteraction_userId_createdAt_idx" ON public."UserKnowledgeInteraction" USING btree ("userId", "createdAt");


--
-- Name: UserKnowledgeProfile_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserKnowledgeProfile_userId_idx" ON public."UserKnowledgeProfile" USING btree ("userId");


--
-- Name: UserPoints_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserPoints_userId_key" ON public."UserPoints" USING btree ("userId");


--
-- Name: UserRole_roleType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserRole_roleType_idx" ON public."UserRole" USING btree ("roleType");


--
-- Name: UserRole_userId_roleType_bindId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserRole_userId_roleType_bindId_key" ON public."UserRole" USING btree ("userId", "roleType", "bindId");


--
-- Name: User_attributionSource_attributionStationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_attributionSource_attributionStationId_idx" ON public."User" USING btree ("attributionSource", "attributionStationId");


--
-- Name: User_attributionStationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_attributionStationId_idx" ON public."User" USING btree ("attributionStationId");


--
-- Name: User_competitionInviteCodeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_competitionInviteCodeId_idx" ON public."User" USING btree ("competitionInviteCodeId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_memberLevel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_memberLevel_idx" ON public."User" USING btree ("memberLevel");


--
-- Name: User_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_phone_idx" ON public."User" USING btree (phone);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_status_createdAt_idx" ON public."User" USING btree (status, "createdAt");


--
-- Name: VideoProduct_videoId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VideoProduct_videoId_productId_key" ON public."VideoProduct" USING btree ("videoId", "productId");


--
-- Name: Video_circleId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Video_circleId_status_createdAt_idx" ON public."Video" USING btree ("circleId", status, "createdAt");


--
-- Name: Video_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Video_stationId_idx" ON public."Video" USING btree ("stationId");


--
-- Name: Video_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Video_status_createdAt_idx" ON public."Video" USING btree (status, "createdAt");


--
-- Name: Video_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Video_status_idx" ON public."Video" USING btree (status);


--
-- Name: Video_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Video_userId_idx" ON public."Video" USING btree ("userId");


--
-- Name: VirtualCoinAccount_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VirtualCoinAccount_userId_key" ON public."VirtualCoinAccount" USING btree ("userId");


--
-- Name: VirtualCoinFrozen_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinFrozen_refId_idx" ON public."VirtualCoinFrozen" USING btree ("refId");


--
-- Name: VirtualCoinFrozen_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinFrozen_userId_status_idx" ON public."VirtualCoinFrozen" USING btree ("userId", status);


--
-- Name: VirtualCoinRecharge_orderNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinRecharge_orderNo_idx" ON public."VirtualCoinRecharge" USING btree ("orderNo");


--
-- Name: VirtualCoinRecharge_orderNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VirtualCoinRecharge_orderNo_key" ON public."VirtualCoinRecharge" USING btree ("orderNo");


--
-- Name: VirtualCoinRecharge_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinRecharge_userId_createdAt_idx" ON public."VirtualCoinRecharge" USING btree ("userId", "createdAt");


--
-- Name: VirtualCoinTransaction_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinTransaction_refId_idx" ON public."VirtualCoinTransaction" USING btree ("refId");


--
-- Name: VirtualCoinTransaction_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinTransaction_userId_createdAt_idx" ON public."VirtualCoinTransaction" USING btree ("userId", "createdAt");


--
-- Name: VirtualCoinTransaction_userId_type_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCoinTransaction_userId_type_createdAt_idx" ON public."VirtualCoinTransaction" USING btree ("userId", type, "createdAt");


--
-- Name: WanNianLiDay_jieQi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WanNianLiDay_jieQi_idx" ON public."WanNianLiDay" USING btree ("jieQi");


--
-- Name: WanNianLiDay_nianGan_nianZhi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WanNianLiDay_nianGan_nianZhi_idx" ON public."WanNianLiDay" USING btree ("nianGan", "nianZhi");


--
-- Name: WanNianLiDay_riGan_riZhi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WanNianLiDay_riGan_riZhi_idx" ON public."WanNianLiDay" USING btree ("riGan", "riZhi");


--
-- Name: WebhookSubscription_event_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WebhookSubscription_event_isActive_idx" ON public."WebhookSubscription" USING btree (event, "isActive");


--
-- Name: WebhookSubscription_url_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WebhookSubscription_url_idx" ON public."WebhookSubscription" USING btree (url);


--
-- Name: WithdrawalApplication_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WithdrawalApplication_status_createdAt_idx" ON public."WithdrawalApplication" USING btree (status, "createdAt");


--
-- Name: WithdrawalApplication_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WithdrawalApplication_userId_status_idx" ON public."WithdrawalApplication" USING btree ("userId", status);


--
-- Name: Withdrawal_stationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Withdrawal_stationId_idx" ON public."Withdrawal" USING btree ("stationId");


--
-- Name: Withdrawal_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Withdrawal_status_idx" ON public."Withdrawal" USING btree (status);


--
-- Name: Withdrawal_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Withdrawal_userId_idx" ON public."Withdrawal" USING btree ("userId");


--
-- Name: ZiweiKnowledge_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ZiweiKnowledge_category_idx" ON public."ZiweiKnowledge" USING btree (category);


--
-- Name: ZiweiKnowledge_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ZiweiKnowledge_status_idx" ON public."ZiweiKnowledge" USING btree (status);


--
-- Name: ZiweiKnowledge_title_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ZiweiKnowledge_title_category_key" ON public."ZiweiKnowledge" USING btree (title, category);


--
-- Name: _quality_snapshot_dim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _quality_snapshot_dim_idx ON public._quality_snapshot USING btree (dimension);


--
-- Name: _quality_snapshot_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX _quality_snapshot_time_idx ON public._quality_snapshot USING btree (check_time);


--
-- Name: idx_user_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_target ON public."UserBehavior" USING btree ("userId", "targetType", "targetId");


--
-- Name: merchant_settlements_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "merchant_settlements_createdAt_idx" ON public.merchant_settlements USING btree ("createdAt");


--
-- Name: merchant_settlements_merchantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "merchant_settlements_merchantId_idx" ON public.merchant_settlements USING btree ("merchantId");


--
-- Name: merchant_settlements_merchantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "merchant_settlements_merchantId_status_idx" ON public.merchant_settlements USING btree ("merchantId", status);


--
-- Name: ActivityMetrics ActivityMetrics_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityMetrics"
    ADD CONSTRAINT "ActivityMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."Activity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AiAnalysisRecord AiAnalysisRecord_paipanRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiAnalysisRecord"
    ADD CONSTRAINT "AiAnalysisRecord_paipanRecordId_fkey" FOREIGN KEY ("paipanRecordId") REFERENCES public."PaipanRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AiAnalysisRecord AiAnalysisRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiAnalysisRecord"
    ADD CONSTRAINT "AiAnalysisRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleRecommend ArticleRecommend_articleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleRecommend"
    ADD CONSTRAINT "ArticleRecommend_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Article Article_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Article Article_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Article Article_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AudioCallBilling AudioCallBilling_callRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallBilling"
    ADD CONSTRAINT "AudioCallBilling_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES public."AudioCallRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AudioCallRecord AudioCallRecord_calleeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallRecord"
    ADD CONSTRAINT "AudioCallRecord_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AudioCallRecord AudioCallRecord_callerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallRecord"
    ADD CONSTRAINT "AudioCallRecord_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AudioCallRecord AudioCallRecord_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AudioCallRecord"
    ADD CONSTRAINT "AudioCallRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Auth Auth_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Auth"
    ADD CONSTRAINT "Auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomationRoleAssignee AutomationRoleAssignee_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRoleAssignee"
    ADD CONSTRAINT "AutomationRoleAssignee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."AutomationRole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomationRolePermission AutomationRolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRolePermission"
    ADD CONSTRAINT "AutomationRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."AutomationPermission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomationRolePermission AutomationRolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AutomationRolePermission"
    ADD CONSTRAINT "AutomationRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."AutomationRole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Blacklist Blacklist_blockedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Blacklist"
    ADD CONSTRAINT "Blacklist_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Blacklist Blacklist_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Blacklist"
    ADD CONSTRAINT "Blacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bookmark Bookmark_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bookmark Bookmark_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."ClassicChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bookmark Bookmark_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BotKnowledgeBase BotKnowledgeBase_botConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BotKnowledgeBase"
    ADD CONSTRAINT "BotKnowledgeBase_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES public."BotConfig"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BountyQuestion BountyQuestion_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BountyQuestion"
    ADD CONSTRAINT "BountyQuestion_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BrowseHistory BrowseHistory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BrowseHistory"
    ADD CONSTRAINT "BrowseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CheckIn CheckIn_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CheckIn"
    ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleAnnouncement CircleAnnouncement_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleAnnouncement"
    ADD CONSTRAINT "CircleAnnouncement_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleAnnouncement CircleAnnouncement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleAnnouncement"
    ADD CONSTRAINT "CircleAnnouncement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleBot CircleBot_botConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleBot"
    ADD CONSTRAINT "CircleBot_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES public."BotConfig"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CircleBot CircleBot_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleBot"
    ADD CONSTRAINT "CircleBot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleEvent CircleEvent_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleEvent"
    ADD CONSTRAINT "CircleEvent_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleGuestEarning CircleGuestEarning_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleGuestEarning"
    ADD CONSTRAINT "CircleGuestEarning_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleInvitation CircleInvitation_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInvitation"
    ADD CONSTRAINT "CircleInvitation_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleInvitation CircleInvitation_inviteCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInvitation"
    ADD CONSTRAINT "CircleInvitation_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES public."CircleInviteCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CircleInvitation CircleInvitation_inviteeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInvitation"
    ADD CONSTRAINT "CircleInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CircleInvitation CircleInvitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInvitation"
    ADD CONSTRAINT "CircleInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CircleInviteCode CircleInviteCode_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInviteCode"
    ADD CONSTRAINT "CircleInviteCode_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleInviteCode CircleInviteCode_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleInviteCode"
    ADD CONSTRAINT "CircleInviteCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleKnowledgeDedupDecision CircleKnowledgeDedupDecision_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledgeDedupDecision"
    ADD CONSTRAINT "CircleKnowledgeDedupDecision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."CircleKnowledgeCandidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleKnowledge CircleKnowledge_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleKnowledge"
    ADD CONSTRAINT "CircleKnowledge_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleMemberGroupRelation CircleMemberGroupRelation_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMemberGroupRelation"
    ADD CONSTRAINT "CircleMemberGroupRelation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."CircleMemberGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleMember CircleMember_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMember"
    ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleMember CircleMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleMember"
    ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleRevenueRecord CircleRevenueRecord_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleRevenueRecord"
    ADD CONSTRAINT "CircleRevenueRecord_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CircleRevenueSplit CircleRevenueSplit_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CircleRevenueSplit"
    ADD CONSTRAINT "CircleRevenueSplit_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Circle Circle_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Circle"
    ADD CONSTRAINT "Circle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Circle Circle_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Circle"
    ADD CONSTRAINT "Circle_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClassicAnnotation ClassicAnnotation_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicAnnotation"
    ADD CONSTRAINT "ClassicAnnotation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicAnnotation ClassicAnnotation_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicAnnotation"
    ADD CONSTRAINT "ClassicAnnotation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."ClassicChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClassicChapter ClassicChapter_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicChapter"
    ADD CONSTRAINT "ClassicChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicCommentary ClassicCommentary_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicCommentary"
    ADD CONSTRAINT "ClassicCommentary_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicCommentary ClassicCommentary_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicCommentary"
    ADD CONSTRAINT "ClassicCommentary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."ClassicChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClassicImage ClassicImage_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicImage"
    ADD CONSTRAINT "ClassicImage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicOcrText ClassicOcrText_imageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicOcrText"
    ADD CONSTRAINT "ClassicOcrText_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES public."ClassicImage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicReadingNote ClassicReadingNote_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicReadingNote"
    ADD CONSTRAINT "ClassicReadingNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicReadingNote ClassicReadingNote_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicReadingNote"
    ADD CONSTRAINT "ClassicReadingNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."ClassicChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClassicReadingNote ClassicReadingNote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClassicReadingNote"
    ADD CONSTRAINT "ClassicReadingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Collect Collect_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Collect"
    ADD CONSTRAINT "Collect_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Comment Comment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionAnswer CompetitionAnswer_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionAnswer"
    ADD CONSTRAINT "CompetitionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."CompetitionQuestion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompetitionAnswer CompetitionAnswer_registrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionAnswer"
    ADD CONSTRAINT "CompetitionAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES public."CompetitionRegistration"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionAnswer CompetitionAnswer_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionAnswer"
    ADD CONSTRAINT "CompetitionAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."CompetitionRound"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompetitionArticle CompetitionArticle_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionArticle"
    ADD CONSTRAINT "CompetitionArticle_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionArticle CompetitionArticle_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionArticle"
    ADD CONSTRAINT "CompetitionArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionInvitation CompetitionInvitation_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionInvitation"
    ADD CONSTRAINT "CompetitionInvitation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionInvitation CompetitionInvitation_inviteeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionInvitation"
    ADD CONSTRAINT "CompetitionInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompetitionInvitation CompetitionInvitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionInvitation"
    ADD CONSTRAINT "CompetitionInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompetitionQuestion CompetitionQuestion_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionQuestion"
    ADD CONSTRAINT "CompetitionQuestion_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionQuestion CompetitionQuestion_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionQuestion"
    ADD CONSTRAINT "CompetitionQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."CompetitionRound"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompetitionRanking CompetitionRanking_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRanking"
    ADD CONSTRAINT "CompetitionRanking_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionRanking CompetitionRanking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRanking"
    ADD CONSTRAINT "CompetitionRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionRegistration CompetitionRegistration_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRegistration"
    ADD CONSTRAINT "CompetitionRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionRegistration CompetitionRegistration_inviterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRegistration"
    ADD CONSTRAINT "CompetitionRegistration_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompetitionRegistration CompetitionRegistration_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRegistration"
    ADD CONSTRAINT "CompetitionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionRound CompetitionRound_competitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionRound"
    ADD CONSTRAINT "CompetitionRound_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES public."Competition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionScore CompetitionScore_registrationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionScore"
    ADD CONSTRAINT "CompetitionScore_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES public."CompetitionRegistration"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompetitionScore CompetitionScore_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompetitionScore"
    ADD CONSTRAINT "CompetitionScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Content Content_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CouponRecord CouponRecord_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CouponRecord"
    ADD CONSTRAINT "CouponRecord_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."CouponTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseBundleItem CourseBundleItem_bundleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseBundleItem"
    ADD CONSTRAINT "CourseBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES public."CourseBundle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseChapter CourseChapter_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseChapter"
    ADD CONSTRAINT "CourseChapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseProgress CourseProgress_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseProgress"
    ADD CONSTRAINT "CourseProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."CourseChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseProgress CourseProgress_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseProgress"
    ADD CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseQa CourseQa_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseQa"
    ADD CONSTRAINT "CourseQa_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."CourseChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CourseQa CourseQa_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseQa"
    ADD CONSTRAINT "CourseQa_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseQa CourseQa_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseQa"
    ADD CONSTRAINT "CourseQa_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseReview CourseReview_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseReview"
    ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseReview CourseReview_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseReview"
    ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseWork CourseWork_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseWork"
    ADD CONSTRAINT "CourseWork_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."CourseChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseWork CourseWork_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseWork"
    ADD CONSTRAINT "CourseWork_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseWork CourseWork_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CourseWork"
    ADD CONSTRAINT "CourseWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Course Course_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Course Course_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Course Course_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DailyTask DailyTask_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyTask"
    ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookBookmark EbookBookmark_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookBookmark"
    ADD CONSTRAINT "EbookBookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."EbookChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EbookBookmark EbookBookmark_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookBookmark"
    ADD CONSTRAINT "EbookBookmark_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookBookmark EbookBookmark_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookBookmark"
    ADD CONSTRAINT "EbookBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookChapter EbookChapter_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookChapter"
    ADD CONSTRAINT "EbookChapter_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookNote EbookNote_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookNote"
    ADD CONSTRAINT "EbookNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."EbookChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EbookNote EbookNote_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookNote"
    ADD CONSTRAINT "EbookNote_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookNote EbookNote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookNote"
    ADD CONSTRAINT "EbookNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookProgress EbookProgress_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookProgress"
    ADD CONSTRAINT "EbookProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."EbookChapter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EbookProgress EbookProgress_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookProgress"
    ADD CONSTRAINT "EbookProgress_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookProgress EbookProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookProgress"
    ADD CONSTRAINT "EbookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookPurchase EbookPurchase_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookPurchase"
    ADD CONSTRAINT "EbookPurchase_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookPurchase EbookPurchase_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookPurchase"
    ADD CONSTRAINT "EbookPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookReadingSession EbookReadingSession_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReadingSession"
    ADD CONSTRAINT "EbookReadingSession_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookReadingSession EbookReadingSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReadingSession"
    ADD CONSTRAINT "EbookReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookReview EbookReview_ebookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReview"
    ADD CONSTRAINT "EbookReview_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES public."Ebook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EbookReview EbookReview_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EbookReview"
    ADD CONSTRAINT "EbookReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ebook Ebook_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ebook"
    ADD CONSTRAINT "Ebook_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."EbookCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Feedback Feedback_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FlashSaleItem FlashSaleItem_flashSaleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashSaleItem"
    ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES public."FlashSale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_followedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followedUserId_fkey" FOREIGN KEY ("followedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GiftRecord GiftRecord_giftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftRecord"
    ADD CONSTRAINT "GiftRecord_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES public."Gift"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GiftRecord GiftRecord_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftRecord"
    ADD CONSTRAINT "GiftRecord_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GiftRecord GiftRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftRecord"
    ADD CONSTRAINT "GiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GroupBuyParticipant GroupBuyParticipant_groupBuyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GroupBuyParticipant"
    ADD CONSTRAINT "GroupBuyParticipant_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES public."GroupBuy"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InstituteContentPurchase InstituteContentPurchase_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteContentPurchase"
    ADD CONSTRAINT "InstituteContentPurchase_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."InstituteContent"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InstituteCourseRegistration InstituteCourseRegistration_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteCourseRegistration"
    ADD CONSTRAINT "InstituteCourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."InstituteCourse"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InstituteCourse InstituteCourse_instituteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteCourse"
    ADD CONSTRAINT "InstituteCourse_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InstituteDividend InstituteDividend_instituteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteDividend"
    ADD CONSTRAINT "InstituteDividend_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InstituteDividend InstituteDividend_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteDividend"
    ADD CONSTRAINT "InstituteDividend_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InstituteEvent InstituteEvent_instituteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteEvent"
    ADD CONSTRAINT "InstituteEvent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InstituteMember InstituteMember_instituteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteMember"
    ADD CONSTRAINT "InstituteMember_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InstituteMember InstituteMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteMember"
    ADD CONSTRAINT "InstituteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InstituteRevenue InstituteRevenue_instituteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteRevenue"
    ADD CONSTRAINT "InstituteRevenue_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES public."Institute"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InstituteTask InstituteTask_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InstituteTask"
    ADD CONSTRAINT "InstituteTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."InstituteMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Institute Institute_adminUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Institute"
    ADD CONSTRAINT "Institute_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Institute Institute_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Institute"
    ADD CONSTRAINT "Institute_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: KnowledgeEdge KnowledgeEdge_fromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KnowledgeEdge"
    ADD CONSTRAINT "KnowledgeEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES public."KnowledgeEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KnowledgeEdge KnowledgeEdge_toId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KnowledgeEdge"
    ADD CONSTRAINT "KnowledgeEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES public."KnowledgeEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveAuditLog LiveAuditLog_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveAuditLog"
    ADD CONSTRAINT "LiveAuditLog_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveFlashSale LiveFlashSale_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveFlashSale"
    ADD CONSTRAINT "LiveFlashSale_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveMic LiveMic_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveMic"
    ADD CONSTRAINT "LiveMic_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveMutedUser LiveMutedUser_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveMutedUser"
    ADD CONSTRAINT "LiveMutedUser_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveProduct LiveProduct_liveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveProduct"
    ADD CONSTRAINT "LiveProduct_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LiveRoom LiveRoom_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveRoom"
    ADD CONSTRAINT "LiveRoom_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LiveRoom LiveRoom_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveRoom"
    ADD CONSTRAINT "LiveRoom_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LiveRoom LiveRoom_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveRoom"
    ADD CONSTRAINT "LiveRoom_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LiveRoom LiveRoom_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveRoom"
    ADD CONSTRAINT "LiveRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LiveSlide LiveSlide_liveRoomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LiveSlide"
    ADD CONSTRAINT "LiveSlide_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES public."LiveRoom"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoginDevice LoginDevice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LoginDevice"
    ADD CONSTRAINT "LoginDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MarketingPageComponent MarketingPageComponent_pageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarketingPageComponent"
    ADD CONSTRAINT "MarketingPageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES public."MarketingPage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MarketingPage MarketingPage_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MarketingPage"
    ADD CONSTRAINT "MarketingPage_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MemberPurchase MemberPurchase_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MemberPurchase"
    ADD CONSTRAINT "MemberPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MerchantAgreement MerchantAgreement_merchantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantAgreement"
    ADD CONSTRAINT "MerchantAgreement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES public."Merchant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MerchantDepositRecord MerchantDepositRecord_merchantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantDepositRecord"
    ADD CONSTRAINT "MerchantDepositRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES public."Merchant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MerchantViolation MerchantViolation_merchantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MerchantViolation"
    ADD CONSTRAINT "MerchantViolation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES public."Merchant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Merchant Merchant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Merchant"
    ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OfflineCourseRegistration OfflineCourseRegistration_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineCourseRegistration"
    ADD CONSTRAINT "OfflineCourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."OfflineCourse"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OfflineCourse OfflineCourse_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OfflineCourse"
    ADD CONSTRAINT "OfflineCourse_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperatorEarning OperatorEarning_operatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperatorEarning"
    ADD CONSTRAINT "OperatorEarning_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Operator Operator_parentOperatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operator"
    ADD CONSTRAINT "Operator_parentOperatorId_fkey" FOREIGN KEY ("parentOperatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Operator Operator_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operator"
    ADD CONSTRAINT "Operator_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaidQuestion PaidQuestion_answererId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaidQuestion"
    ADD CONSTRAINT "PaidQuestion_answererId_fkey" FOREIGN KEY ("answererId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaidQuestion PaidQuestion_askerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaidQuestion"
    ADD CONSTRAINT "PaidQuestion_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaidQuestion PaidQuestion_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaidQuestion"
    ADD CONSTRAINT "PaidQuestion_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaidQuestion PaidQuestion_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaidQuestion"
    ADD CONSTRAINT "PaidQuestion_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaipanRecord PaipanRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaipanRecord"
    ADD CONSTRAINT "PaipanRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Poetry Poetry_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Poetry"
    ADD CONSTRAINT "Poetry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."PoetryCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Poetry Poetry_collectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Poetry"
    ADD CONSTRAINT "Poetry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES public."PoetryCollection"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Post Post_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Post Post_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductReview ProductReview_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductReview"
    ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductSku ProductSku_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSku"
    ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ReadingProgress ReadingProgress_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."ClassicBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReadingProgress ReadingProgress_chapterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES public."ClassicChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReadingProgress ReadingProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferralLink ReferralLink_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralLink"
    ADD CONSTRAINT "ReferralLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferralRelation ReferralRelation_referrerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralRelation"
    ADD CONSTRAINT "ReferralRelation_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferralRelation ReferralRelation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralRelation"
    ADD CONSTRAINT "ReferralRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RenewalRecord RenewalRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RenewalRecord"
    ADD CONSTRAINT "RenewalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Report Report_reporterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SearchHistory SearchHistory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SearchHistory"
    ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SpecialTeacher SpecialTeacher_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SpecialTeacher"
    ADD CONSTRAINT "SpecialTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StationBundleAccess StationBundleAccess_bundleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationBundleAccess"
    ADD CONSTRAINT "StationBundleAccess_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES public."CourseBundle"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StationEarning StationEarning_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationEarning"
    ADD CONSTRAINT "StationEarning_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StationOffline StationOffline_ownerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationOffline"
    ADD CONSTRAINT "StationOffline_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationOrder StationOrder_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationOrder"
    ADD CONSTRAINT "StationOrder_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationPick StationPick_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationPick"
    ADD CONSTRAINT "StationPick_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StationProduct StationProduct_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationProduct"
    ADD CONSTRAINT "StationProduct_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationSettlement StationSettlement_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationSettlement"
    ADD CONSTRAINT "StationSettlement_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationTeacherBooking StationTeacherBooking_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacherBooking"
    ADD CONSTRAINT "StationTeacherBooking_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationTeacherBooking StationTeacherBooking_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacherBooking"
    ADD CONSTRAINT "StationTeacherBooking_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."StationTeacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationTeacherRequest StationTeacherRequest_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacherRequest"
    ADD CONSTRAINT "StationTeacherRequest_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationTeacher StationTeacher_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationTeacher"
    ADD CONSTRAINT "StationTeacher_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."StationOffline"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StationToolConfig StationToolConfig_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StationToolConfig"
    ADD CONSTRAINT "StationToolConfig_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Station Station_operatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Station"
    ADD CONSTRAINT "Station_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Station Station_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Station"
    ADD CONSTRAINT "Station_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskTransferLog TaskTransferLog_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTransferLog"
    ADD CONSTRAINT "TaskTransferLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TenantApiCall TenantApiCall_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantApiCall"
    ADD CONSTRAINT "TenantApiCall_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TenantUsageRecord TenantUsageRecord_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TenantUsageRecord"
    ADD CONSTRAINT "TenantUsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ToolFavorite ToolFavorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolFavorite"
    ADD CONSTRAINT "ToolFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ToolPayRecord ToolPayRecord_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolPayRecord"
    ADD CONSTRAINT "ToolPayRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ToolPayRecord ToolPayRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolPayRecord"
    ADD CONSTRAINT "ToolPayRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ToolRecord ToolRecord_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolRecord"
    ADD CONSTRAINT "ToolRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ToolRecord ToolRecord_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolRecord"
    ADD CONSTRAINT "ToolRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ToolShare ToolShare_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ToolShare"
    ADD CONSTRAINT "ToolShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserCoupon UserCoupon_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCoupon"
    ADD CONSTRAINT "UserCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_competitionInviteCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_competitionInviteCodeId_fkey" FOREIGN KEY ("competitionInviteCodeId") REFERENCES public."CompetitionInviteCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VideoProduct VideoProduct_videoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VideoProduct"
    ADD CONSTRAINT "VideoProduct_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES public."Video"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Video Video_circleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES public."Circle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Video Video_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Video Video_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Video"
    ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VirtualCoinAccount VirtualCoinAccount_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinAccount"
    ADD CONSTRAINT "VirtualCoinAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VirtualCoinRecharge VirtualCoinRecharge_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinRecharge"
    ADD CONSTRAINT "VirtualCoinRecharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VirtualCoinTransaction VirtualCoinTransaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCoinTransaction"
    ADD CONSTRAINT "VirtualCoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Withdrawal Withdrawal_stationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Withdrawal"
    ADD CONSTRAINT "Withdrawal_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES public."Station"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Withdrawal Withdrawal_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Withdrawal"
    ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: merchant_settlements merchant_settlements_merchantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_settlements
    ADD CONSTRAINT "merchant_settlements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES public."Merchant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1XYaubpXcVnrPXRJUgE4EWqGPKa3vSGsTwTSecC66r2kx8uO3DAVXOmfArSiUsr

