-- ═══════════════════════════════════════════════════════════════
-- 从业者工作台（V0 还原 · 批次4）
-- 全部 additive：CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS，无 DROP。
--
-- 设计约束（避免与既有子系统打架）：
--  1) 客户档案不新建表 —— 复用 CRM 的 ClientBook（已有 ownerId 隔离 + 生辰加密 + RFM）。
--     命理字段（日主/五行占比/喜用忌神）一律由生辰**现算**（八字引擎已交叉验证），不落库，
--     否则引擎一改就与库里旧值打架，违背「唯一真源」。
--  2) 从业者会员独立于书院会员：只写 PractitionerProfile.proExpireAt，绝不碰 user.memberLevel。
--  3) 收入账本 = 平台内收入（revenue 模块只读）+ 线下手工记账（PractitionerLedger），
--     老师收的现金/转账平台本来就不知道，必须允许手记，否则账本永远对不上。
-- ═══════════════════════════════════════════════════════════════

-- ── 从业者档案：会员状态 + 品牌落款（报告签章用）
CREATE TABLE IF NOT EXISTS "PractitionerProfile" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  -- 会员（¥98/月，独立体系）
  "proExpireAt"  TIMESTAMP(3),               -- 空 or 已过期 = 非会员
  "proFirstAt"   TIMESTAMP(3),               -- 首次开通时间
  -- 品牌落款
  "brandName"    TEXT,                       -- 工作室名，如「玄一命理工作室」
  "title"        TEXT,                       -- 职称，如「资深命理师 · 择日风水」
  "avatarText"   TEXT,                       -- 头像字（无图时用）
  "logoUrl"      TEXT,
  "sealText"     TEXT,                       -- 印章字
  "slogan"       TEXT,
  "contact"      TEXT,                       -- 报告页脚联系方式
  "disclaimer"   TEXT,                       -- 报告免责声明（可覆盖平台默认）
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");

-- ── 报告：AI 初稿 → 老师定稿 → 交付客户（只读分享链接）
CREATE TABLE IF NOT EXISTS "PractitionerReport" (
  "id"          TEXT PRIMARY KEY,
  "ownerId"     TEXT NOT NULL,               -- 从业者 userId（隔离主键）
  "clientId"    TEXT,                        -- 关联 ClientBook.id（可空：临时客户）
  "toolKey"     TEXT,                        -- 来源排盘工具，如 bazi/ziwei
  "type"        TEXT NOT NULL,               -- bazi/liunian/hepan/qiming/zeji
  "typeLabel"   TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "clientName"  TEXT NOT NULL,
  "clientBirth" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'draft', -- draft 草稿 / final 已定稿 / delivered 已交付
  "style"       TEXT NOT NULL DEFAULT 'classic',
  "paipan"      JSONB,                       -- 盘面素材（四柱/星盘/卦象快照，报告图文用）
  "chapters"    JSONB,                       -- 章节正文
  "shareToken"  TEXT,                        -- 只读交付链接令牌（客户无需登录即可看）
  "sharedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PractitionerReport_ownerId_updatedAt_idx" ON "PractitionerReport"("ownerId", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PractitionerReport_shareToken_key" ON "PractitionerReport"("shareToken");

-- ── 案例库：老师自己沉淀的复盘（可由报告一键归档）
CREATE TABLE IF NOT EXISTS "PractitionerCase" (
  "id"         TEXT PRIMARY KEY,
  "ownerId"    TEXT NOT NULL,
  "reportId"   TEXT,
  "title"      TEXT NOT NULL,
  "clientName" TEXT,
  "category"   TEXT NOT NULL DEFAULT 'bazi', -- bazi/liuyao/zeji/fengshui/hehun
  "summary"    TEXT,
  "tags"       TEXT[] NOT NULL DEFAULT '{}',
  "fee"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PractitionerCase_ownerId_occurredAt_idx" ON "PractitionerCase"("ownerId", "occurredAt");

-- ── 预约日程：老师自己的执业日程（到店/上门/线上；平台内咨询单另由 question/consult-call 承载）
CREATE TABLE IF NOT EXISTS "PractitionerAppointment" (
  "id"         TEXT PRIMARY KEY,
  "ownerId"    TEXT NOT NULL,
  "clientId"   TEXT,
  "clientName" TEXT NOT NULL,
  "startAt"    TIMESTAMP(3) NOT NULL,
  "service"    TEXT NOT NULL,                -- 八字精批 / 流年运势 / 开业择日 …
  "channel"    TEXT NOT NULL DEFAULT '到店', -- 到店 / 线上语音 / 上门堪舆 …
  "status"     TEXT NOT NULL DEFAULT 'pending', -- pending 待确认 / confirmed 已确认 / done 已完成 / cancelled
  "note"       TEXT,
  "fee"        DECIMAL(12,2),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PractitionerAppointment_ownerId_startAt_idx" ON "PractitionerAppointment"("ownerId", "startAt");

-- ── 线下收入手记（平台内收入不写这里，从 revenue 模块读，账本合并展示）
CREATE TABLE IF NOT EXISTS "PractitionerLedger" (
  "id"         TEXT PRIMARY KEY,
  "ownerId"    TEXT NOT NULL,
  "clientName" TEXT,
  "service"    TEXT NOT NULL,
  "amount"     DECIMAL(12,2) NOT NULL,
  "payMethod"  TEXT NOT NULL DEFAULT '现金', -- 微信/支付宝/现金/转账
  "note"       TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PractitionerLedger_ownerId_occurredAt_idx" ON "PractitionerLedger"("ownerId", "occurredAt");

-- ── ClientBook 补一列：出生地（排盘真太阳时校正要用；非敏感，明文即可）
ALTER TABLE "ClientBook" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;

-- ── 从业者会员定价（价格真源 = CommissionConfig.rateA，禁在代码里硬编码 98）
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'practitioner_pro_monthly', '从业者会员·月付', 98, 0, '从业者工作台专业版 ¥98/月（独立于书院会员）', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;
