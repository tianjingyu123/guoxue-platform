-- 外部浏览器微信支付通道开关 —— 切到「url_link 唤起小程序 pay-relay 中转页走 JSAPI」自建路径。
-- 背景：平台八字命理类目导致直连微信 H5 支付被驳回；改用 url_link→小程序 pay-relay→JSAPI（令牌化代付）。
-- system.service.getBrandConfig 读 ConfigSystem 的 pay_h5_provider：
--   'urllink' = 走本自建路径 / 'huifu' = 走汇付聚合 / 其它或未配 = 直连微信 H5 兜底（默认 direct）。
--
-- 🔴 执行时机：必须在 feature/h5-pay-urllink 代码【已部署】+ 小程序【已发布含 pay-relay 页】之后再执行。
--    早开开关（代码没上线）会让外部浏览器微信支付落到已被驳回的直连 H5 兜底，付不了。
-- 幂等：ON CONFLICT(configKey) DO UPDATE，可重复执行。回滚：把 configValue 改回 'direct' 即可。

INSERT INTO "ConfigSystem" ("id", "configKey", "configValue", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'pay_h5_provider',
  'urllink',
  '外部浏览器微信支付通道：urllink=url_link唤起小程序pay-relay走JSAPI / huifu=汇付 / direct=直连微信H5兜底',
  now(),
  now()
)
ON CONFLICT ("configKey") DO UPDATE
  SET "configValue" = EXCLUDED."configValue",
      "description"  = EXCLUDED."description",
      "updatedAt"    = now();
