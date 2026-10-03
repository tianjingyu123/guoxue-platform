/**
 * 汉字笔顺入库（hanzi-writer-data 2.0.1，9575 字）
 * 运行：cd apps/server && npx tsx scripts/seed-hanzi-stroke.ts
 * 前置：npx prisma db execute --file prisma/sql/2026-07-14-hanzi-stroke.sql --schema prisma/schema.prisma
 *
 * 数据源：node_modules/hanzi-writer-data/<字>.json（devDependency，不进生产包）
 * 幂等：createMany + skipDuplicates 分批写入。
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const prisma = new PrismaClient();
const BATCH = 200;

async function main() {
  // 定位包目录（pnpm 下是软链，require.resolve 拿到真实路径）
  const pkgDir = dirname(require.resolve("hanzi-writer-data/package.json"));
  const files = readdirSync(pkgDir).filter((f) => f.endsWith(".json") && f !== "package.json");
  console.log(`发现 ${files.length} 个字形文件 @ ${pkgDir}`);

  const before = await prisma.hanziStroke.count();
  console.log(`入库前：${before} 条`);

  let done = 0;
  for (let i = 0; i < files.length; i += BATCH) {
    const slice = files.slice(i, i + BATCH);
    const data = slice
      .map((f) => {
        const char = f.replace(/\.json$/, "");
        if ([...char].length !== 1) return null; // 只收单字
        const j = JSON.parse(readFileSync(resolve(pkgDir, f), "utf8")) as {
          strokes: string[];
          medians: number[][][];
          radStrokes?: number[];
        };
        if (!j?.strokes?.length || !j?.medians?.length) return null;
        return { char, strokes: j.strokes, medians: j.medians, radStrokes: j.radStrokes ?? [] };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    if (data.length) {
      const res = await prisma.hanziStroke.createMany({ data, skipDuplicates: true });
      done += res.count;
    }
    if ((i / BATCH) % 10 === 0) console.log(`  ${i + slice.length}/${files.length} …`);
  }

  const after = await prisma.hanziStroke.count();
  console.log(`\n新插入 ${done} 条，入库后共 ${after} 条`);

  for (const ch of ["福", "德", "一"]) {
    const row = await prisma.hanziStroke.findUnique({ where: { char: ch } });
    console.log(`  ${ch}: ${row ? `${(row.strokes as string[]).length} 笔` : "无笔顺数据"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
