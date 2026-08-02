\set ON_ERROR_STOP on

-- 迁移后业务完整性门禁。所有检查只读，不修复数据；任何异常都必须在切流前处理。
CREATE OR REPLACE FUNCTION pg_temp.assert_zero(check_name text, check_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  invalid_count bigint;
BEGIN
  EXECUTE check_sql INTO invalid_count;
  IF invalid_count <> 0 THEN
    RAISE EXCEPTION '%：发现 % 条异常记录', check_name, invalid_count;
  END IF;
  RAISE NOTICE 'PASS %', check_name;
END;
$$;

SELECT pg_temp.assert_zero(
  '未验证的外键或检查约束',
  $query$
    SELECT count(*)
    FROM pg_constraint constraint_record
    JOIN pg_namespace namespace_record
      ON namespace_record.oid = constraint_record.connamespace
    WHERE namespace_record.nspname = 'public'
      AND constraint_record.contype IN ('f', 'c')
      AND NOT constraint_record.convalidated
  $query$
);

SELECT pg_temp.assert_zero(
  '无效或未就绪索引',
  $query$
    SELECT count(*)
    FROM pg_index index_record
    JOIN pg_class table_record ON table_record.oid = index_record.indrelid
    JOIN pg_namespace namespace_record ON namespace_record.oid = table_record.relnamespace
    WHERE namespace_record.nspname = 'public'
      AND (NOT index_record.indisvalid OR NOT index_record.indisready)
  $query$
);

SELECT pg_temp.assert_zero(
  '未完成或已回滚的 Prisma 迁移',
  $query$
    SELECT count(*)
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
  $query$
);

-- unionId 字段作为旧数据和排障冗余依然必须保持跨账号一致；新模型还会额外检查 WECHAT_UNION 锚点。
SELECT pg_temp.assert_zero(
  '微信 unionId 跨账号冲突',
  $query$
    SELECT count(*)
    FROM (
      SELECT "unionId"
      FROM "Auth"
      WHERE provider = 'WECHAT'
        AND NULLIF(btrim(COALESCE("unionId", '')), '') IS NOT NULL
      GROUP BY "unionId"
      HAVING count(DISTINCT "userId") > 1
    ) conflict_record
  $query$
);

SELECT pg_temp.assert_zero(
  '微信认证缺少 openId',
  $query$
    SELECT count(*)
    FROM "Auth"
    WHERE provider = 'WECHAT'
      AND NULLIF(btrim(COALESCE("openId", '')), '') IS NULL
  $query$
);

SELECT pg_temp.assert_zero(
  '密码认证缺少 credential',
  $query$
    SELECT count(*)
    FROM "Auth"
    WHERE provider = 'PASSWORD'
      AND NULLIF(btrim(COALESCE(credential, '')), '') IS NULL
  $query$
);

-- 兼容旧版“每用户每提供方一行”和新版“提供方 + 应用作用域 + 稳定主体”身份模型。
-- 新模型允许同一用户在多个微信应用中各有一条 WECHAT 身份，不得再按 userId + provider 误报。
DO $$
DECLARE
  scoped_identity_enabled boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Auth' AND column_name = 'namespace'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Auth' AND column_name = 'subject'
    )
  INTO scoped_identity_enabled;

  IF scoped_identity_enabled THEN
    PERFORM pg_temp.assert_zero(
      '认证作用域身份缺少 namespace 或 subject',
      $query$
        SELECT count(*)
        FROM "Auth"
        WHERE NULLIF(btrim(COALESCE("namespace", '')), '') IS NULL
           OR NULLIF(btrim(COALESCE("subject", '')), '') IS NULL
      $query$
    );

    PERFORM pg_temp.assert_zero(
      '认证作用域身份重复或跨账号冲突',
      $query$
        SELECT count(*)
        FROM (
          SELECT provider, "namespace", "subject"
          FROM "Auth"
          GROUP BY provider, "namespace", "subject"
          HAVING count(*) > 1 OR count(DISTINCT "userId") > 1
        ) conflict_record
      $query$
    );

    PERFORM pg_temp.assert_zero(
      '微信开放平台锚点跨账号冲突',
      $query$
        SELECT count(*)
        FROM (
          SELECT "namespace", "subject"
          FROM "Auth"
          WHERE provider = 'WECHAT_UNION'
          GROUP BY "namespace", "subject"
          HAVING count(DISTINCT "userId") > 1
        ) conflict_record
      $query$
    );
  ELSE
    PERFORM pg_temp.assert_zero(
      '同一用户存在重复认证提供方',
      $query$
        SELECT count(*)
        FROM (
          SELECT "userId", provider
          FROM "Auth"
          GROUP BY "userId", provider
          HAVING count(*) > 1
        ) duplicate_record
      $query$
    );
  END IF;
END;
$$;

SELECT pg_temp.assert_zero(
  '商品或 SKU 负库存',
  $query$
    SELECT
      (SELECT count(*) FROM "Product" WHERE stock < 0) +
      (SELECT count(*) FROM "ProductSku" WHERE stock < 0)
  $query$
);

SELECT pg_temp.assert_zero(
  '库存流水前后余额不守恒',
  $query$
    SELECT count(*)
    FROM "InventoryMovement"
    WHERE "beforeStock" < 0
       OR "afterStock" < 0
       OR "afterStock" - "beforeStock" <> quantity
  $query$
);

SELECT pg_temp.assert_zero(
  '订单数量或金额非法',
  $query$
    SELECT count(*)
    FROM "Order"
    WHERE quantity <= 0
       OR amount < 0
       OR COALESCE("payAmount", 0) < 0
       OR COALESCE("originalAmount", 0) < 0
       OR COALESCE("frozenAmount", 0) < 0
  $query$
);

SELECT pg_temp.assert_zero(
  '已支付订单缺少支付时间',
  $query$
    SELECT count(*)
    FROM "Order"
    WHERE status IN ('PAID', 'SHIPPED', 'COMPLETED', 'REFUNDED')
      AND "paidAt" IS NULL
  $query$
);

SELECT pg_temp.assert_zero(
  '退款完成订单缺少退款时间',
  $query$
    SELECT count(*)
    FROM "Order"
    WHERE status = 'REFUNDED' AND "refundedAt" IS NULL
  $query$
);

-- 权益中心为增量上线：旧库尚未创建权益表时跳过，新库则强制检查余额和退款冲正。
DO $$
BEGIN
  IF to_regclass('public."EntitlementBalance"') IS NOT NULL THEN
    PERFORM pg_temp.assert_zero(
      '有限权益余额为负或版本号非法',
      $query$
        SELECT count(*)
        FROM "EntitlementBalance"
        WHERE (NOT unlimited AND quantity < 0)
           OR version < 0
      $query$
    );
  END IF;

  IF to_regclass('public."EntitlementLedger"') IS NOT NULL THEN
    PERFORM pg_temp.assert_zero(
      '已退款订单的发放权益缺少 REVOKE 冲正',
      $query$
        SELECT count(*)
        FROM "EntitlementLedger" grant_record
        JOIN "Order" order_record
          ON order_record.id = grant_record."sourceId"
        WHERE grant_record.action = 'GRANT'
          AND grant_record."sourceType" = 'ORDER'
          AND order_record.status = 'REFUNDED'
          AND NOT EXISTS (
            SELECT 1
            FROM "EntitlementLedger" revoke_record
            WHERE revoke_record.action = 'REVOKE'
              AND revoke_record."reversesLedgerId" = grant_record.id
          )
      $query$
    );
  END IF;
END;
$$;

SELECT pg_temp.assert_zero(
  '内容归因类型与内容 ID 不成对',
  $query$
    SELECT count(*)
    FROM "Order"
    WHERE ("sourceContentType" IS NULL) <> ("sourceContentId" IS NULL)
  $query$
);

SELECT pg_temp.assert_zero(
  '经营中商家缺少上线必需资质',
  $query$
    SELECT count(*)
    FROM "Merchant"
    WHERE status = 'ACTIVE'
      AND (
        NULLIF(btrim(COALESCE("businessLicense", '')), '') IS NULL
        OR NULLIF(btrim(COALESCE("unifiedSocialCreditCode", '')), '') IS NULL
        OR "privacyConsentAt" IS NULL
        OR "complianceDeclarationAt" IS NULL
        OR "qualificationStatus" <> 'APPROVED'
      )
  $query$
);

SELECT pg_temp.assert_zero(
  '已审核文章缺少首图',
  $query$
    SELECT count(*)
    FROM "Article"
    WHERE "auditStatus" = 'APPROVED'
      AND "deletedAt" IS NULL
      AND NULLIF(btrim(COALESCE(cover, '')), '') IS NULL
  $query$
);

-- 恢复后序列若落后于表内最大值，下一次写入会撞主键；逐个检查所有 serial/identity 列。
DO $$
DECLARE
  sequence_record record;
  maximum_value numeric;
  current_value numeric;
BEGIN
  FOR sequence_record IN
    SELECT
      namespace_record.nspname AS schema_name,
      table_record.relname AS table_name,
      attribute_record.attname AS column_name,
      pg_get_serial_sequence(
        format('%I.%I', namespace_record.nspname, table_record.relname),
        attribute_record.attname
      ) AS sequence_name
    FROM pg_class table_record
    JOIN pg_namespace namespace_record ON namespace_record.oid = table_record.relnamespace
    JOIN pg_attribute attribute_record ON attribute_record.attrelid = table_record.oid
    WHERE namespace_record.nspname = 'public'
      AND table_record.relkind IN ('r', 'p')
      AND attribute_record.attnum > 0
      AND NOT attribute_record.attisdropped
      AND pg_get_serial_sequence(
        format('%I.%I', namespace_record.nspname, table_record.relname),
        attribute_record.attname
      ) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT COALESCE(max(%I)::numeric, 0) FROM %I.%I',
      sequence_record.column_name,
      sequence_record.schema_name,
      sequence_record.table_name
    ) INTO maximum_value;
    EXECUTE format('SELECT last_value::numeric FROM %s', sequence_record.sequence_name)
      INTO current_value;
    IF current_value < maximum_value THEN
      RAISE EXCEPTION '序列 % 落后：last_value=%，表最大值=%',
        sequence_record.sequence_name,
        current_value,
        maximum_value;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS serial/identity 序列不落后于数据';
END;
$$;

SELECT '业务完整性门禁通过' AS result;
