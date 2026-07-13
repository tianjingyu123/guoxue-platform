-- 分站运营商 · 分佣与费用规则配置（董事长 2026-07-12 拍板）
-- 落成 ConfigSystem 后台可管参数（源真相）。属"规则参数定义"，不含发钱执行逻辑（发钱=红线·真人执行）。
-- 已生效部分（无需本 SQL）：团队管理奖 = 名下站长实得佣金 × mgmtRate
--   （commission.service：ONLINE 一级默认 0.10 / OFFLINE 二级默认 0.20·佣-V2-P1）。
-- 幂等：ON CONFLICT(configKey) DO UPDATE，可重复执行。

INSERT INTO "ConfigSystem" ("id","configKey","configValue","description","createdAt","updatedAt")
VALUES
  -- 运营商两级
  (gen_random_uuid(), 'station_operator.tier1.channel',  'ONLINE',
   '一级运营商=对外销售(线上渠道 ONLINE)', now(), now()),
  (gen_random_uuid(), 'station_operator.tier1.price',    '4999',
   '一级运营商对外售价(元)：4999 得 1+5 个分站', now(), now()),
  (gen_random_uuid(), 'station_operator.tier1.quota_self',     '1',
   '一级运营商自用分站数', now(), now()),
  (gen_random_uuid(), 'station_operator.tier1.quota_sellable', '5',
   '一级运营商可对外销售分站数', now(), now()),
  (gen_random_uuid(), 'station_operator.tier1.mgmt_rate', '0.10',
   '一级运营商团队管理奖=名下站长收入(实得佣金)×10%(与 commission.service ONLINE 默认一致)', now(), now()),
  (gen_random_uuid(), 'station_operator.tier2.channel',  'OFFLINE',
   '二级运营商=不对外销售·随线下驿站赠送开通(渠道 OFFLINE)', now(), now()),
  (gen_random_uuid(), 'station_operator.tier2.mgmt_rate', '0.20',
   '二级运营商团队管理奖比率(现存 OFFLINE 默认 0.20·用户本次未改)', now(), now()),
  -- 分站加入与系统租赁费
  (gen_random_uuid(), 'station.join_threshold', 'none',
   '分站加入门槛：无门槛(谁都能开)', now(), now()),
  (gen_random_uuid(), 'station.rental_fee_yearly', '999',
   '分站系统租赁费(元/年)', now(), now()),
  (gen_random_uuid(), 'station.rental_waiver_income_multiple', '5',
   '减免：分站收入累计 < 5 倍租赁费(<4995元)则不用再交租赁费', now(), now()),
  (gen_random_uuid(), 'station.rental_refund_income_multiple', '10',
   '退还：分站收入一年内累计 ≥ 10 倍租赁费(≥9990元)则退还租赁费', now(), now()),
  (gen_random_uuid(), 'station.rental_refund_first_year_only', 'true',
   '退还规则仅限第一年有效', now(), now()),
  -- 开通页文案纪律
  (gen_random_uuid(), 'station_operator.join_page.promo_disabled', 'true',
   '开通页禁承诺式宣传(不写已加入家数/收益)，改风险与资源提示(无渠道勿加入·有亏损风险)', now(), now())
ON CONFLICT ("configKey") DO UPDATE
  SET "configValue" = EXCLUDED."configValue",
      "description" = EXCLUDED."description",
      "updatedAt"   = now();
