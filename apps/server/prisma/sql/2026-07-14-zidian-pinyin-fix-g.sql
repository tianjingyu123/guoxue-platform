-- 修正 pinyinPlain 中的 IPA 字母 ɡ(U+0261)
-- 起因：新华字典拼音用的是 IPA 的 ɡ 而非 ASCII g（3031 处），导致 pinyinPlain 存成 "zhanɡ"，
--       用户搜 "zhang" 命中 0 条——所有带 g 收尾的音节（zhang/wang/ming/…）全都搜不到。
-- 幂等：只改含 ɡ 的行，重复执行无副作用。
UPDATE "ZidianEntry"
SET "pinyinPlain" = replace("pinyinPlain", 'ɡ', 'g')
WHERE "pinyinPlain" LIKE '%ɡ%';
