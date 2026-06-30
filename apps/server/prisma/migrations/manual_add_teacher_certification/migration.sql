-- 讲师认证（线上课程上传资格审核）
CREATE TABLE IF NOT EXISTS "TeacherCertification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "title" TEXT,
    "intro" TEXT,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedTitle" TEXT,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherCertification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherCertification_userId_key" ON "TeacherCertification"("userId");
CREATE INDEX IF NOT EXISTS "TeacherCertification_status_idx" ON "TeacherCertification"("status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCertification_userId_fkey'
    ) THEN
        ALTER TABLE "TeacherCertification"
            ADD CONSTRAINT "TeacherCertification_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
