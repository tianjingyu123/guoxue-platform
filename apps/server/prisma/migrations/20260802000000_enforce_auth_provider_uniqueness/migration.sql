-- 每个用户只能保留一种认证提供方的一条绑定记录。
-- 历史重复身份无法安全猜测归属；迁移必须停止并由人工核验，而不是静默删行或合并账号资产。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Auth"
    GROUP BY "userId", provider
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Auth 存在同一用户重复认证提供方，请先人工核验并清理后再迁移';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Auth_userId_provider_key"
  ON "Auth"("userId", provider);
