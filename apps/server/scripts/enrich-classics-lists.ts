/**
 * 古籍馆·策划书单建表 + 注入(幂等，可重复运行)
 *
 * 建 ClassicBookList / ClassicFavorite 两表(原生 SQL·IF NOT EXISTS·不碰现有表),
 * 注入 7 个国学策划书单(关联真实 ClassicBook·按书名取章节最全版本)。
 * 运行：cd apps/server && npx tsx scripts/enrich-classics-lists.ts
 * 清理：DROP TABLE "ClassicBookList","ClassicFavorite"; 或 classicBookList.deleteMany。
 */
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ||= "postgresql://guoxue:guoxue123@localhost:5433/guoxue";
const prisma = new PrismaClient();

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClassicBookList" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "curator" TEXT,
      "coverColor" TEXT NOT NULL DEFAULT 'brown',
      "tags" JSONB,
      "bookIds" JSONB NOT NULL DEFAULT '[]',
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "likeCount" INTEGER NOT NULL DEFAULT 0,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ClassicBookList_status_sortOrder_idx" ON "ClassicBookList"("status","sortOrder")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClassicFavorite" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "bookId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ClassicFavorite_userId_bookId_key" ON "ClassicFavorite"("userId","bookId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ClassicFavorite_userId_idx" ON "ClassicFavorite"("userId")`);
  console.log("✅ 表已就绪 ClassicBookList / ClassicFavorite");
}

const LISTS = [
  { title: "国学入门必读", desc: "初入国学，从这几部经典开始，循序渐进读懂中国人的精神底色。", curator: "国学编辑部", color: "brown", tags: ["入门", "经典", "必读"], likes: 3420, views: 28600, books: ["论语", "道德经", "周易", "孟子", "大学", "中庸"] },
  { title: "诸子百家精粹", desc: "春秋战国，百家争鸣。一览先秦思想的浩瀚星空。", curator: "国学编辑部", color: "green", tags: ["诸子", "哲学"], likes: 2180, views: 19500, books: ["庄子", "老子", "孙子兵法", "韩非子", "荀子", "墨子", "鬼谷子"] },
  { title: "史家之绝唱", desc: "以史为镜，鉴往知来。从《史记》到《资治通鉴》读懂华夏兴衰。", curator: "国学编辑部", color: "blue", tags: ["史部", "正史"], likes: 1860, views: 16700, books: ["史记", "资治通鉴", "三国志", "左传", "战国策", "汉书"] },
  { title: "诗词文心", desc: "楚辞汉赋，唐诗宋词，千古文心的风雅传承。", curator: "国学编辑部", color: "red", tags: ["诗词", "文学"], likes: 2560, views: 21300, books: ["唐诗三百首", "宋词三百首", "楚辞", "文心雕龙"] },
  { title: "释道经典", desc: "明心见性，道法自然。佛道两家的智慧法门。", curator: "国学编辑部", color: "cream", tags: ["佛学", "道家"], likes: 1520, views: 13800, books: ["金刚经", "心经", "六祖坛经", "抱朴子", "列子", "太上感应篇"] },
  { title: "命理术数入门", desc: "星命卜筮，推天道以明人事。命理学习的经典路径。", curator: "命理研究室", color: "brown", tags: ["命理", "八字", "术数"], likes: 3680, views: 31200, books: ["渊海子平", "三命通会", "滴天髓", "子平真诠", "穷通宝鉴", "千里命稿"] },
  { title: "蒙学启蒙", desc: "三百千千，朗朗上口。中华童蒙养正的经典读本。", curator: "国学编辑部", color: "green", tags: ["蒙学", "启蒙"], likes: 1340, views: 11900, books: ["三字经", "百家姓", "千字文", "弟子规", "声律启蒙", "增广贤文"] },
];

async function main() {
  await ensureTables();
  await prisma.classicBookList.deleteMany({}); // 幂等：清演示书单重建
  let total = 0;
  for (const [i, l] of LISTS.entries()) {
    const ids: string[] = [];
    for (const t of l.books) {
      const b = await prisma.classicBook.findFirst({
        where: { title: t, status: "PUBLISHED" },
        orderBy: [{ chapterCount: "desc" }, { viewCount: "desc" }],
        select: { id: true },
      });
      if (b) ids.push(b.id);
    }
    await prisma.classicBookList.create({
      data: {
        title: l.title, description: l.desc, curator: l.curator, coverColor: l.color,
        tags: l.tags, bookIds: ids, likeCount: l.likes, viewCount: l.views, sortOrder: i,
      },
    });
    total++;
    console.log(`  ✓ 《${l.title}》 关联 ${ids.length}/${l.books.length} 本`);
  }
  console.log(`\n✅ 策划书单注入完成：${total} 个`);
}

main()
  .catch((e) => { console.error("❌ 失败:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
