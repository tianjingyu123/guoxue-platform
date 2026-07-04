-- 商-P1 分销风控·违禁词补充种子（2026-07-06）
-- 真源：docs/design/三角色收口-…-20260704.md §2.1「乱价」监测——站外承诺返现类话术
-- 在合-P1 首版词库（20260705_compliance_words_seed.sql·勿动）基础上幂等追加三词，入 COMPLIANCE_A。
-- 匹配为含匹配，正常语境（如"平台返现活动公告"）误报由风控台人工忽略，remark 注明豁免边界。
-- 幂等：ON CONFLICT ("word") 更新 category/remark，不覆盖 enabled（保留管理员手动禁用）。

INSERT INTO "SensitiveWord" ("word", "category", "replacement", "remark") VALUES
('返现',     'COMPLIANCE_A', NULL, '分销站外承诺类（商-P1）：站长私下承诺返现属乱价行为；平台官方活动文案误报由人工忽略'),
('回扣',     'COMPLIANCE_A', NULL, '分销站外承诺类（商-P1）'),
('保底收益', 'COMPLIANCE_A', NULL, '分销站外承诺类（商-P1）：收益承诺，兼触确定性承诺红线')
ON CONFLICT ("word") DO UPDATE SET
  "category"    = EXCLUDED."category",
  "replacement" = EXCLUDED."replacement",
  "remark"      = EXCLUDED."remark",
  "updatedAt"   = CURRENT_TIMESTAMP;
