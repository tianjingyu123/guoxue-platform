-- 供-P1: Product 加 sceneTags 场景标签列（商城供应链重构 B2B2C·docs/design/商城供应链重构-B2B2C设计-20260704.md §三/§六/§八）
-- 场景标签（销售视角·可多挂·白名单七值）：乔迁新居/合婚嫁娶/开业大吉/本命年/学业考试/长辈寿诞/节气时令
-- 用途：无痕商业化触点接线口（排盘结果页/咨询结束页/节气日 → 按场景标签取货推荐）
-- 配套：schema Product 加 sceneTags String[] @default([])；后台商品编辑打标；GET /shop/products/by-scene 场景取货端点
-- 增量安全：只增不删·IF NOT EXISTS 可重复执行·历史商品默认空数组（不出现在任何场景取货结果中）
-- 执行：pm2 stop guoxue-api → npx prisma generate → npx prisma db execute --file 本文件 → nest build → pm2 restart guoxue-api --update-env

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sceneTags" TEXT[] NOT NULL DEFAULT '{}';
