-- 八字案例库（爱好者练手 / 同类八字参考）
--
-- 与旧的 CelebrityCase 的区别：那张表只有「谁 + 八字 + 分类」，没有案例库真正的价值所在 ——
-- 【真实人生经历】。董事长定的口径：**答案 = 这个八字的真实人生经历，断语和思路只是参考。**
-- 所以本表的核心是 life（分维度）+ events（大事年表，用来验应期），
-- commentary（断语）只是附带参考，不是答案。
--
-- 合规硬约束（不做成可选项）：
--   consent      —— 投稿人必须确认「本人 / 已获当事人授权」
--   desensitized —— 一律脱敏：不存真名、精确地点、联系方式
--   status       —— 必须审核通过才对外可见（假案例会污染整个库）
-- 名人 / 古籍案例只取公开史料，realName 才允许有值；用户投稿一律匿名。
--
-- 全部 additive：IF NOT EXISTS，无 DROP。

CREATE TABLE IF NOT EXISTS "BaziCase" (
  "id"            TEXT PRIMARY KEY,

  -- ── 八字：四柱拆列存储，三柱匹配要走索引，不能塞进数组里扫全表 ──
  "gender"        TEXT NOT NULL,              -- male / female
  "yearPillar"    TEXT NOT NULL,              -- 甲子
  "monthPillar"   TEXT NOT NULL,
  "dayPillar"     TEXT NOT NULL,              -- 🔴 匹配时日柱必须相同（日柱=命主自身）
  "hourPillar"    TEXT NOT NULL,
  -- 生辰（古籍案例常常只留八字，没有确切生辰 → 允许空）
  "birthYear"     INTEGER,
  "birthMonth"    INTEGER,
  "birthDay"      INTEGER,
  "birthHour"     INTEGER,

  -- ── 身份（脱敏后）──
  "source"        TEXT NOT NULL,              -- CELEBRITY / CLASSIC / CURATED / USER
  "title"         TEXT NOT NULL,              -- 「某商界人士」/「李世民」/「《滴天髓》案例三」
  "realName"      TEXT,                       -- 仅名人/古籍（公开史料）；用户投稿恒为 NULL
  "era"           TEXT,                       -- 朝代 / 年代
  "tags"          TEXT[] NOT NULL DEFAULT '{}',

  -- ── 答案：真实人生经历（本表存在的理由）──
  "life"          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {career,marriage,wealth,health,family,character}
  "events"        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{year,ganzhi,event,category}] 大事年表 → 验应期

  -- ── 参考（明确不是答案）──
  "commentary"    TEXT,                       -- 断语 / 思路
  "commentarySrc" TEXT,                       -- 出处（古籍篇名 / 大师名）

  -- ── 投稿 / 审核 / 合规 ──
  "contributorId" TEXT,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING / APPROVED / REJECTED
  "reviewNote"    TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "reviewedBy"    TEXT,
  "consent"       BOOLEAN NOT NULL DEFAULT false,   -- 本人/已获授权
  "desensitized"  BOOLEAN NOT NULL DEFAULT true,    -- 已脱敏

  -- 质量分（有大事年表 + 维度齐全的才是好案例）→ 决定国学币档位与是否精品
  "quality"       INTEGER NOT NULL DEFAULT 0,
  "isPremium"     BOOLEAN NOT NULL DEFAULT false,

  "viewCount"     INTEGER NOT NULL DEFAULT 0,
  "attemptCount"  INTEGER NOT NULL DEFAULT 0,

  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 三柱匹配主索引：日柱先过滤（选择性最高），再在结果里数年/月/时相同的柱数
CREATE INDEX IF NOT EXISTS "BaziCase_dayPillar_status_idx"  ON "BaziCase" ("dayPillar", "status");
CREATE INDEX IF NOT EXISTS "BaziCase_status_source_idx"     ON "BaziCase" ("status", "source");
CREATE INDEX IF NOT EXISTS "BaziCase_status_premium_idx"    ON "BaziCase" ("status", "isPremium");
CREATE INDEX IF NOT EXISTS "BaziCase_contributor_idx"       ON "BaziCase" ("contributorId");

-- 练手记录：用户先断，点「公布答案」才给看 —— revealedAt 就是那道门
CREATE TABLE IF NOT EXISTS "BaziCaseAttempt" (
  "id"         TEXT PRIMARY KEY,
  "caseId"     TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "guess"      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 用户自己断的（与 life 同维度，便于逐项对照）
  "revealedAt" TIMESTAMP(3),                        -- NULL = 还没公布答案
  "selfScore"  INTEGER,                             -- 用户自评断中几项
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BaziCaseAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BaziCase"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BaziCaseAttempt_case_user_key" ON "BaziCaseAttempt" ("caseId", "userId");
CREATE INDEX IF NOT EXISTS "BaziCaseAttempt_user_idx" ON "BaziCaseAttempt" ("userId");

-- 投稿奖励币档（金额进配置表，不硬编码在代码里 —— 与会员定价同一套治理口径）
-- rateA 在这里承载「奖励币数」，rateB 填 0（本表 rateB 为 NOT NULL，但案例奖励没有分成对手方）
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'case_reward_basic',   '案例投稿奖励·基础档', 20,  0, '仅八字 + 简要经历',           NOW(), NOW()),
  (gen_random_uuid()::text, 'case_reward_good',    '案例投稿奖励·良好档', 60,  0, '六维度齐全',                 NOW(), NOW()),
  (gen_random_uuid()::text, 'case_reward_premium', '案例投稿奖励·精品档', 150, 0, '含大事年表 · 可验应期',       NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;
