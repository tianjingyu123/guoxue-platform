import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

export interface BaziBookSeed {
  title: string;
  author: string;
  dynasty: string;
  intro: string;
  source: string;
  cover?: string;
  chapters: Array<{
    title: string;
    content: string;
    translation?: string;
    annotation?: string;
    tags?: string[];
  }>;
}

/**
 * 八字命理古籍种子服务
 *
 * 收录 14 部核心命理古籍完整内容，支持：
 * 1. 古籍阅读展示
 * 2. 八字排盘古籍联动查询（通过 tags 标签匹配）
 * 3. AI 知识库 RAG 检索
 *
 * 书籍列表：
 * - 核心5部：渊海子平、三命通会、滴天髓、穷通宝鉴、子平真诠
 * - 扩展7部：神峰通考、千里命稿、八字提要、巾箱秘术、
 *            李虚中命书、天元巫咸经、袁天罡称骨
 * - 盲派经典：盲师断命秘传等
 */
@Injectable()
export class ClassicBaziSeeder implements OnModuleInit {
  private readonly logger = new Logger(ClassicBaziSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {}

  async onModuleInit() {
    this.logger.log("开始初始化八字命理古籍库...");
    try {
      const result = await this.seed();
      this.logger.log(
        `八字古籍初始化完成: 新建${result.created}部, 跳过${result.skipped}部`,
      );
    } catch (err: any) {
      this.logger.warn(`八字古籍初始化失败（重试中）: ${err.message}`);
    }
  }

  async seed(): Promise<{ created: number; skipped: number }> {
    const allBooks = await this.loadAllBooks();
    let created = 0;
    let skipped = 0;

    for (const bookSeed of allBooks) {
      const exists = await this.prisma.classicBook.findFirst({
        where: { title: bookSeed.title },
      });
      if (exists) {
        skipped++;
        continue;
      }

      try {
        const book = await this.prisma.classicBook.create({
          data: {
            title: bookSeed.title,
            author: bookSeed.author,
            dynasty: bookSeed.dynasty,
            category: "命",
            intro: bookSeed.intro,
            source: bookSeed.source,
            cover: bookSeed.cover,
            chapterCount: bookSeed.chapters.length,
            status: "PUBLISHED",
          },
        });

        for (let i = 0; i < bookSeed.chapters.length; i++) {
          const ch = bookSeed.chapters[i];
          await this.prisma.classicChapter.create({
            data: {
              bookId: book.id,
              title: ch.title,
              content: ch.content,
              translation: ch.translation,
              annotation: ch.annotation,
              tags: ch.tags || [],
              sortOrder: i + 1,
            },
          });
        }

        this.logger.log(
          `✓ ${bookSeed.title} — ${bookSeed.chapters.length}章`,
        );
        created++;
      } catch (err: any) {
        this.logger.error(`✗ ${bookSeed.title} 失败: ${err.message}`);
      }
    }

    return { created, skipped };
  }

  private static readonly BAZI_BOOKS: Array<[string, string]> = [
    ["yuanhaiziping", "渊海子平"],
    ["sanmingtonghui", "三命通会"],
    ["ditianshui", "滴天髓"],
    ["qiongtongbaojian", "穷通宝鉴"],
    ["zipingzhenquan", "子平真诠"],
    ["shenfengtongkao", "神峰通考"],
    ["qianliminggao", "千里命稿"],
    ["bazitiyao", "八字提要"],
    ["jinxiangmishu", "巾箱秘术"],
    ["lixuzhongmingshu", "李虚中命书"],
    ["tianyuanwuxian", "天元巫咸经"],
    ["yuantianangchenggu", "袁天罡称骨"],
    ["mangpai-mizhuan", "盲派秘传"],
  ];

  /** 加载所有14部八字古籍数据 */
  private async loadAllBooks(): Promise<BaziBookSeed[]> {
    const books: BaziBookSeed[] = [];

    for (const [moduleName, displayName] of ClassicBaziSeeder.BAZI_BOOKS) {
      try {
        const mod = await import(`./bazi-books/${moduleName}`);
        books.push(mod.default);
      } catch (e) {
        this.logger.warn(`${displayName}数据加载失败: ${e}`);
      }
    }

    return books;
  }
}
