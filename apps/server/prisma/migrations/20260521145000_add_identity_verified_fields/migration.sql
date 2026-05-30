-- User: 添加实名认证状态字段
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'identityVerified'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'identityVerifiedAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);
  END IF;
END $$;
