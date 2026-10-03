-- 双人合盘的场景（2026-09-18）
--
-- 决策人：「合盘不光是合婚，还有合作等其他场景。」
--
-- 同一张关系盘，换个场景要看的东西就不一样：
-- 合婚看夫妻宫与相处，合作看谁主导、钱怎么分、会不会因利起争执，
-- 亲子看代际与庇护。措辞更不能混——把合作伙伴讲成「感情和睦」是笑话。
--
-- 默认 marriage 是为了兼容已有数据：此前的合盘都是按合婚生成的，
-- 回填成别的场景反而会让老报告与标注对不上。
ALTER TABLE "CoupleChart"
  ADD COLUMN IF NOT EXISTS "scene" TEXT NOT NULL DEFAULT 'marriage';

-- 便于运营按场景统计各类合盘的使用情况
CREATE INDEX IF NOT EXISTS "CoupleChart_scene_idx" ON "CoupleChart" ("scene");
