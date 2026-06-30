/* eslint-disable no-console */
/**
 * 发现页品类体系统一脚本（一次性、幂等）
 *
 * 背景：content/course/product 三表的 categoryLevel1 各用一套杂乱值，
 * 与平台标准品类树（ConfigSystem.category_tree 的 10 个一级键）对不上，
 * 导致发现页品类筛选无法生效。本脚本把三源对齐到标准一级键。
 * classic（四库法 1.3 万条）保留其专业检索维度 category 不动。
 *
 * 标准一级键：国学经典/中医养生/诗词歌赋/民俗节庆/非遗传承/茶道香道/
 *            书法绘画/传统音乐/武术太极/易经智慧
 *
 * 用法: cd apps/server && npx ts-node --compiler-options '{"module":"CommonJS"}' ../../scripts/normalize-discover-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 课程旧分类 → 标准一级键 */
const COURSE_MAP: Record<string, string> = {
  诗词文学: "诗词歌赋",
  道家文化: "国学经典",
  易学风水和命理: "易经智慧",
  儒学经典: "国学经典",
};

/** 商品旧分类 → 标准一级键 */
const PRODUCT_MAP: Record<string, string> = {
  道家文化: "国学经典",
  易学风水和命理: "易经智慧",
  传统技艺: "非遗传承",
};

/** 内容（原 categoryLevel1 全为 null）→ 标准一级键，按主题归类 */
const CONTENT_MAP: Record<string, string> = {
  "ca3b0b68-9d73-4363-b7d1-92a8282abad3": "国学经典", // 《金刚经》核心思想解读
  "abdb24f5-fbaf-47e3-9cd9-83eb4a7ad0ed": "国学经典", // 《论语》中的君子之道
  "80f3af76-6b2d-444b-a1af-54fad347a0b2": "诗词歌赋", // 《诗经》中的爱情诗赏析
  "5bbc3e28-6fee-40bd-8023-802587c4b8d4": "国学经典", // 道德经·第一章
  "57a8cd78-a9ea-4499-9193-d5092125e2f5": "诗词歌赋", // 登鹳雀楼
  "64b34c75-6338-4b4d-aae9-3e7d779d85fd": "国学经典", // 国学入门：什么是传统文化
  "45a3b301-9af6-4e48-92e7-80e087b6e3ac": "诗词歌赋", // 静夜思
  "9cee6ba2-ecc8-465f-a86c-6441b96243f0": "国学经典", // 论语·学而篇
  "098e7bbf-8250-4677-ab72-11e004ff966a": "国学经典", // 儒家思想的核心价值
  "0fec9cb2-dcd1-4a32-bb1b-645acb2437d0": "诗词歌赋", // 声声慢·寻寻觅觅
  "fc17bda9-595f-4719-8c6a-fbe4dc3b5d99": "诗词歌赋", // 水调歌头·明月几时有
};

async function main() {
  console.log("=== 发现页品类体系统一 ===\n");

  // 1. 课程
  for (const [oldVal, newVal] of Object.entries(COURSE_MAP)) {
    const r = await prisma.course.updateMany({
      where: { categoryLevel1: oldVal },
      data: { categoryLevel1: newVal },
    });
    if (r.count) console.log(`课程  ${oldVal} → ${newVal}：${r.count} 条`);
  }

  // 2. 商品
  for (const [oldVal, newVal] of Object.entries(PRODUCT_MAP)) {
    const r = await prisma.product.updateMany({
      where: { categoryLevel1: oldVal },
      data: { categoryLevel1: newVal },
    });
    if (r.count) console.log(`商品  ${oldVal} → ${newVal}：${r.count} 条`);
  }

  // 3. 内容（按 id 精确归类）
  let contentCount = 0;
  for (const [id, newVal] of Object.entries(CONTENT_MAP)) {
    const r = await prisma.content.updateMany({
      where: { id },
      data: { categoryLevel1: newVal },
    });
    contentCount += r.count;
  }
  console.log(`内容  归类：${contentCount} 条`);

  // 4. 校验：三源对齐后的一级品类分布
  console.log("\n=== 对齐后分布 ===");
  const STD_KEYS = [
    "国学经典", "中医养生", "诗词歌赋", "民俗节庆", "非遗传承",
    "茶道香道", "书法绘画", "传统音乐", "武术太极", "易经智慧",
  ];
  for (const src of ["content", "course", "product"] as const) {
    const where =
      src === "content" ? { status: "PUBLISHED" as const }
      : src === "course" ? { auditStatus: "APPROVED" as const }
      : { status: "ON_SALE" as const };
    // @ts-ignore 动态表名，运行期安全
    const rows = await prisma[src].groupBy({ by: ["categoryLevel1"], where, _count: true });
    const offStd = rows.filter((x: any) => x.categoryLevel1 && !STD_KEYS.includes(x.categoryLevel1));
    console.log(
      `${src}: ` +
      rows.map((x: any) => `${x.categoryLevel1 ?? "null"}=${x._count}`).join("  ") +
      (offStd.length ? `  ⚠️非标:${offStd.map((x: any) => x.categoryLevel1).join(",")}` : "  ✓全标准"),
    );
  }

  console.log("\n完成。");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
