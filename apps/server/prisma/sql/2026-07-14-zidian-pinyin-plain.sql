-- ZidianEntry 增补去声调拼音列
-- 起因：新华字典的 pinyin 带声调（如「德」= dé），按拼音检索时 startsWith('de') 匹配不上 'dé'
--       （é ≠ e），实测搜 de 只能搜出恰好无调的 4 个字——按拼音查字功能形同虚设。
-- 方案：新增 pinyinPlain（去声调、小写、多音以空格分隔），检索走此列；展示仍用带调的 pinyin。
-- 幂等：IF NOT EXISTS。
ALTER TABLE "ZidianEntry" ADD COLUMN IF NOT EXISTS "pinyinPlain" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "ZidianEntry_pinyinPlain_idx" ON "ZidianEntry" ("pinyinPlain");
