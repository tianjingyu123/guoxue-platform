/**
 * 新华字典入库（14809 字）
 * 运行：cd apps/server && npx tsx scripts/seed-zidian.ts
 * 前置：npx prisma db execute --file prisma/sql/2026-07-14-zidian-dict.sql --schema prisma/schema.prisma
 *
 * 数据源：data/xinhua-dict.json，结构为 Record<汉字, [繁体, 拼音, 释义]>
 * 幂等：createMany + skipDuplicates 分批写入；重复运行不会报错也不会重复插入。
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();
const BATCH = 500;

/** 去声调（ā→a、é→e…）：带调拼音做前缀检索会漏字，故另存一列 */
function plainPinyin(py: string): string {
  return py
    .normalize("NFC")
    .replace(/[üǖǘǚǜ]/g, "v") // ü 必须先归一：NFD 会把两点当声调一起剥掉（lǚ→lu），导致搜 lv 查无「吕」
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // 去声调组合符
    .replace(/ɡ/g, "g") // 新华字典用 IPA 的 ɡ(U+0261) 而非 ASCII g——不换则 zhang 永远搜不到「张」
    .toLowerCase()
    .trim();
}

async function main() {
  const file = resolve(__dirname, "../data/xinhua-dict.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, [string, string, string]>;
  const entries = Object.entries(raw);
  console.log(`读取 ${entries.length} 字`);

  const before = await prisma.zidianEntry.count();
  console.log(`入库前：${before} 条`);

  let done = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    const data = slice.map(([ch, v]) => {
      const pinyin = (v?.[1] ?? "").trim().toLowerCase();
      return {
        char: ch,
        traditional: v?.[0] ?? "",
        pinyin,
        pinyinPlain: plainPinyin(pinyin),
        explanation: v?.[2] ?? "",
      };
    });
    // 已入库的走 update 补 pinyinPlain（首次入库时无此列）
    const res = await prisma.zidianEntry.createMany({ data, skipDuplicates: true });
    done += res.count;
    await Promise.all(
      data
        .filter((d) => d.pinyinPlain)
        .map((d) =>
          prisma.zidianEntry.updateMany({
            where: { char: d.char, pinyinPlain: "" },
            data: { pinyinPlain: d.pinyinPlain },
          }),
        ),
    );
    if ((i / BATCH) % 10 === 0) console.log(`  ${i + slice.length}/${entries.length} …`);
  }

  const after = await prisma.zidianEntry.count();
  console.log(`\n新插入 ${done} 条，入库后共 ${after} 条`);

  // 抽样自检
  for (const ch of ["一", "龍", "德", "鑫"]) {
    const row = await prisma.zidianEntry.findUnique({ where: { char: ch } });
    console.log(`  ${ch}: ${row ? `${row.pinyin} / 繁体「${row.traditional}」/ 释义 ${row.explanation.length} 字` : "未收录"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
