-- 研-P1 大师讲座分账场景种子：SettlementRule scene=INSTITUTE_LECTURE
-- 拆分（建议值·待拍板，故 enabled=false 默认关，拍板后由后台启用）：
--   讲师 50%（role=PROVIDER category=SERVICE 劳务对价）
--   研究院池 20%（role=PLATFORM category=SERVICE·诚实注释：当前研究院无独立账户体系，
--     此份额暂记平台名下的"研究院池"专项（splits.note 标注），真实分账主体待研究院账户体系落地后切换）
--   平台 30%（role=PLATFORM category=PLATFORM 平台留存）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260706_lecture_settlement.sql --schema prisma/schema.prisma
-- 幂等：scene 已存在则不插入（不覆盖后台人工调整）
INSERT INTO "SettlementRule"
  ("id", "scene", "splits", "bufferDays", "requireApproval", "approvalThreshold", "enabled", "remark", "updatedBy", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  'INSTITUTE_LECTURE',
  '[
    { "role": "PROVIDER", "rate": 0.5, "basis": "GROSS", "category": "SERVICE", "note": "讲座讲师 50%" },
    { "role": "PLATFORM", "rate": 0.2, "basis": "GROSS", "category": "SERVICE", "note": "研究院池 20%：真实分账主体待研究院账户体系，暂记平台名下专项" },
    { "role": "PLATFORM", "rate": 0.3, "basis": "GROSS", "category": "PLATFORM", "note": "平台留存 30%" }
  ]'::jsonb,
  7,
  true,
  2000,
  false,
  '研究院大师讲座（研-P1）：讲师50/研究院池20/平台30 为建议值待拍板，默认关闭；研究院池份额暂由平台代管，待研究院账户体系落地',
  'seed:20260706_lecture_settlement',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SettlementRule" WHERE "scene" = 'INSTITUTE_LECTURE');
