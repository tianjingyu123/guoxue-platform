-- Migration: manual_add_brand_config（租-T0 品牌抽象）
-- 新建 BrandConfig 单行表：全端品牌露出（站名/Logo/主色/客服/协议主体六项）的唯一配置来源
-- 只增不删·可重复执行（IF NOT EXISTS）

CREATE TABLE IF NOT EXISTS "BrandConfig" (
  "id"            TEXT NOT NULL DEFAULT 'default',
  "siteName"      TEXT NOT NULL DEFAULT '热卜国学',
  "siteNameShort" TEXT NOT NULL DEFAULT '热卜',
  "siteNameEn"    TEXT NOT NULL DEFAULT 'REBU',
  "slogan"        TEXT NOT NULL DEFAULT '探寻东方智慧',
  "sloganAlt"     TEXT NOT NULL DEFAULT '观天地 · 明心性',
  "tagline"       TEXT NOT NULL DEFAULT '国学知识平台',
  "copyright"     TEXT NOT NULL DEFAULT '热卜国学 · 让国学回归生活',
  "qrGuide"       TEXT NOT NULL DEFAULT '长按识别 · 开启国学之旅',
  "logoUrl"       TEXT NOT NULL DEFAULT '',
  "primaryColor"  TEXT NOT NULL DEFAULT '#c41e3a',
  "domain"        TEXT NOT NULL DEFAULT 'api.rebugx.cn',
  "h5Url"         TEXT NOT NULL DEFAULT 'https://api.rebugx.cn/h5/',
  "servicePhone"  TEXT NOT NULL DEFAULT '',
  "serviceEmail"  TEXT NOT NULL DEFAULT '',
  "serviceWechat" TEXT NOT NULL DEFAULT '',
  "companyName"   TEXT NOT NULL DEFAULT '',
  "platformName"  TEXT NOT NULL DEFAULT '热卜国学',
  "websiteUrl"    TEXT NOT NULL DEFAULT '',
  "contactPerson" TEXT NOT NULL DEFAULT '',
  "contactPhone"  TEXT NOT NULL DEFAULT '',
  "contactEmail"  TEXT NOT NULL DEFAULT '',
  "updatedBy"     TEXT,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandConfig_pkey" PRIMARY KEY ("id")
);
