import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

export interface DaizhigeBookSeed {
  title: string;
  author: string;
  dynasty: string;
  category: string;
  intro: string;
  source: string;
  chapters: Array<{
    title: string;
    content: string;
    tags: string[];
  }>;
}

/**
 * 殆知阁古籍批量导入服务
 *
 * 从 daizhige-scraper.py 生成的 JSON 种子文件导入 ClassicBook/ClassicChapter。
 * 数据源: daizhige.org — 1.6万部古籍全文
 *
 * 用法:
 *   const result = await seeder.importFromJson();
 *   const result = await seeder.importFromJson({ maxBooks: 500 });
 */
@Injectable()
export class ClassicDaizhigeSeeder {
  private readonly logger = new Logger(ClassicDaizhigeSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 从种子 JSON 文件批量导入古籍
   */
  async importFromJson(options?: {
    seedFile?: string;
    maxBooks?: number;
    batchSize?: number;
    categoryFilter?: string;
  }): Promise<{ created: number; skipped: number; errors: number }> {
    const {
      seedFile = "temp_daizhige_all_seeds.json",
      maxBooks = Infinity,
      batchSize = 100,
      categoryFilter,
    } = options ?? {};

    // Resolve seed file path - try multiple locations
    const candidates = [
      // Running via ts-node: __dirname = .../apps/server/src/modules/classic
      path.resolve(__dirname, "../../../../../", seedFile),
      // Running compiled: __dirname = .../apps/server/dist/modules/classic
      path.resolve(__dirname, "../../../../", seedFile),
      // Relative to cwd
      path.resolve(process.cwd(), seedFile),
      path.resolve(process.cwd(), "../", seedFile),
    ];

    let filePath = "";
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        filePath = c;
        break;
      }
    }

    if (!filePath) {
      this.logger.error(`种子文件不存在。尝试过: ${candidates.join(", ")}`);
      return { created: 0, skipped: 0, errors: 0 };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const seeds: DaizhigeBookSeed[] = JSON.parse(raw);

    let books = seeds;
    if (categoryFilter) {
      books = books.filter((b) => b.category === categoryFilter);
    }
    const targetBooks = books.slice(0, maxBooks);

    this.logger.log(
      `准备导入 ${targetBooks.length} 部古籍（共 ${seeds.length} 种子）`,
    );

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < targetBooks.length; i++) {
      const seed = targetBooks[i];

      try {
        // 去重：按标题+分类检查
        const existing = await this.prisma.classicBook.findFirst({
          where: { title: seed.title, category: seed.category },
        });
        if (existing) {
          skipped++;
          if (skipped % 100 === 0) {
            this.logger.log(`  进度: ${i + 1}/${targetBooks.length} (跳过${skipped})`);
          }
          continue;
        }

        // 创建书
        const book = await this.prisma.classicBook.create({
          data: {
            title: seed.title,
            author: seed.author || null,
            dynasty: seed.dynasty || null,
            category: seed.category,
            intro: seed.intro,
            source: seed.source,
            chapterCount: seed.chapters.length,
            status: "PUBLISHED",
          },
        });

        // 批量创建章节（避免事务超时，大书几百章也能秒级完成）
        const BATCH = 200;
        for (let j = 0; j < seed.chapters.length; j += BATCH) {
          await this.prisma.classicChapter.createMany({
            data: seed.chapters.slice(j, j + BATCH).map((ch, k) => ({
              bookId: book.id,
              title: ch.title.slice(0, 255),
              content: ch.content,
              tags: ch.tags || [],
              sortOrder: j + k + 1,
            })),
          });
        }

        created++;

        if (created % 50 === 0) {
          this.logger.log(
            `  进度: ${i + 1}/${targetBooks.length} (新建${created}, 跳过${skipped})`,
          );
        }
      } catch (err: any) {
        errors++;
        this.logger.error(`  ✗ ${seed.title}: ${err.message}`);
      }
    }

    this.logger.log(
      `导入完成: 新建 ${created}, 跳过 ${skipped}, 失败 ${errors}`,
    );
    return { created, skipped, errors };
  }

  /**
   * 统计种子文件内容
   */
  getSeedStats(options?: { seedFile?: string }): {
    total: number;
    byCategory: Record<string, number>;
    totalChapters: number;
    filePath: string;
  } | null {
    const { seedFile = "temp_daizhige_all_seeds.json" } = options ?? {};

    // Same multi-candidate resolution as importFromJson
    const candidates = [
      path.resolve(__dirname, "../../../../../", seedFile),
      path.resolve(__dirname, "../../../../", seedFile),
      path.resolve(process.cwd(), seedFile),
      path.resolve(process.cwd(), "../", seedFile),
    ];

    let filePath = "";
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        filePath = c;
        break;
      }
    }

    if (!filePath) {
      this.logger.error(`种子文件不存在: ${seedFile}`);
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const seeds: DaizhigeBookSeed[] = JSON.parse(raw);

    const byCategory: Record<string, number> = {};
    let totalChapters = 0;
    for (const s of seeds) {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
      totalChapters += s.chapters.length;
    }

    return { total: seeds.length, byCategory, totalChapters, filePath };
  }
}
