-- 结算引擎转正 · 规则表修正（2026-07-14）
-- 背景：SettlementRule 是引擎的分账真源。转正（settlement.ledger_withdrawable.enabled=true）后，
-- 可提现余额从旧口径（Station.totalEarning / UserEarning）切到 LedgerEntry 净结算额。
-- 切换前必须保证规则与「实际在发的钱」逐分一致，否则受益人的钱会凭空增减。
--
-- 本文件修三处对不上的地方，全部 additive（只 UPDATE 既有行，不建表不删列）。

-- ─────────────────────────────────────────────────────────────
-- ① PEEK（围观答案）：比例是过期旧值，且缺 ASKER 角色
--
-- 规则表原值：PROVIDER 0.7 / PLATFORM 0.3
-- 实际在发  ：平台 40% / 提问者 30% / 达人 30%（董事长拍板 2026-07-10）
--
-- 现在靠 enabled=false 才没出事：RevenueService.lookupProviderRate 遇到 disabled 规则
-- 回退代码里的 DEFAULT_RATES.PEEK=0.3，所以发钱是对的。
-- 🔴 但只要有人把这条规则 enable，达人分成就从 30% 跳到 70% —— 直接多发钱。
-- 而「启用规则」正是引擎转正必须做的动作，所以必须先把比例改对。
--
-- 另：围观是「一次交易、两个受益人」，规则表原先只有 PROVIDER，模型和业务对不上。
-- 补 ASKER 角色后，一次 settle() 即可落全部三方。
UPDATE "SettlementRule"
SET splits = '[
  {"role":"PROVIDER","rate":0.3,"basis":"GROSS","category":"SERVICE","note":"达人 30%"},
  {"role":"ASKER","rate":0.3,"basis":"GROSS","category":"SERVICE","note":"提问者 30%"},
  {"role":"PLATFORM","rate":0.4,"basis":"GROSS","category":"PLATFORM","note":"平台 40%"}
]'::jsonb,
    enabled = true,
    remark = '2026-07-14 修正：原 PROVIDER 0.7 为过期旧值，与 2026-07-10 拍板(平台40/提问者30/达人30)不符；补 ASKER 角色',
    "updatedAt" = NOW()
WHERE scene = 'PEEK';

-- ─────────────────────────────────────────────────────────────
-- ② AUDIO_CALL（连麦/通话）：同样是过期旧值
--
-- 规则表原值：PROVIDER 0.7 / PLATFORM 0.3
-- 实际在发  ：平台 50% / 达人 50%（董事长拍板 2026-07-10；consult-call.service.ts:103 硬传 rate: 0.5）
UPDATE "SettlementRule"
SET splits = '[
  {"role":"PROVIDER","rate":0.5,"basis":"GROSS","category":"SERVICE","note":"达人 50%"},
  {"role":"PLATFORM","rate":0.5,"basis":"GROSS","category":"PLATFORM","note":"平台 50%"}
]'::jsonb,
    enabled = true,
    remark = '2026-07-14 修正：原 PROVIDER 0.7 为过期旧值，与 2026-07-10 拍板(平台50/达人50)不符',
    "updatedAt" = NOW()
WHERE scene = 'AUDIO_CALL';

-- ─────────────────────────────────────────────────────────────
-- ③ MEMBER_PURCHASE（会员购买）：规则未启用 + 缺 OPERATOR 角色
--
-- 会员订单的站长佣金旧口径是真发的（Station.totalEarning 增加），
-- 但规则 enabled=false → settle() 静默跳过不落账（settlement.service.ts:70-73）
-- → 引擎口径下站长的会员佣金凭空消失。
--
-- 且 calculateOperatorBonus 对所有订单类型通用（只看 station.operatorId），
-- 会员订单同样产生运营商管理奖 —— 但原规则里没有 OPERATOR 角色 → 管理奖也会消失。
--
-- 比例说明：STATION/OPERATOR 的 rate 在 settle() 时被 rateOverride 覆盖成实付值
-- （commission.service.ts:278-281），此处的 0.2/0.1 只是兜底默认。
-- 去掉原 PLATFORM 0.8 条目：其余 scene（PRODUCT_ORDER/COURSE_ORDER/...）均只落
-- STATION+OPERATOR、不落 PLATFORM；且 PLATFORM 无 rateOverride，写死 0.8 会与实际
-- 站长佣金率对不上（站长实收 15% 时平台应留 85%，却记 80%）。统一到既有范式。
UPDATE "SettlementRule"
SET splits = '[
  {"role":"STATION","rate":0.2,"basis":"GROSS","category":"COMMISSION"},
  {"role":"OPERATOR","rate":0.1,"basis":"PARENT_SPLIT","category":"COMMISSION","parentRole":"STATION"}
]'::jsonb,
    enabled = true,
    remark = '2026-07-14 转正：启用落账 + 补 OPERATOR 管理奖角色；去 PLATFORM 条目对齐其余 scene 范式',
    "updatedAt" = NOW()
WHERE scene = 'MEMBER_PURCHASE';
