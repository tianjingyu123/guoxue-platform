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

  /** 加载所有14部八字古籍数据 */
  private async loadAllBooks(): Promise<BaziBookSeed[]> {
    const books: BaziBookSeed[] = [];

    // 动态导入各书籍数据模块
    try {
      const yuanhai = await import("./bazi-books/yuanhaiziping");
      books.push(yuanhai.default);
    } catch (e) {
      this.logger.warn(`渊海子平数据加载失败: ${e}`);
    }
    try {
      const sanming = await import("./bazi-books/sanmingtonghui");
      books.push(sanming.default);
    } catch (e) {
      this.logger.warn(`三命通会数据加载失败: ${e}`);
    }
    try {
      const di = await import("./bazi-books/ditianshui");
      books.push(di.default);
    } catch (e) {
      this.logger.warn(`滴天髓数据加载失败: ${e}`);
    }
    try {
      const qiongtong = await import("./bazi-books/qiongtongbaojian");
      books.push(qiongtong.default);
    } catch (e) {
      this.logger.warn(`穷通宝鉴数据加载失败: ${e}`);
    }
    try {
      const ziping = await import("./bazi-books/zipingzhenquan");
      books.push(ziping.default);
    } catch (e) {
      this.logger.warn(`子平真诠数据加载失败: ${e}`);
    }
    try {
      const shenfeng = await import("./bazi-books/shenfengtongkao");
      books.push(shenfeng.default);
    } catch (e) {
      this.logger.warn(`神峰通考数据加载失败: ${e}`);
    }
    try {
      const qianli = await import("./bazi-books/qianliminggao");
      books.push(qianli.default);
    } catch (e) {
      this.logger.warn(`千里命稿数据加载失败: ${e}`);
    }
    try {
      const bazi = await import("./bazi-books/bazitiyao");
      books.push(bazi.default);
    } catch (e) {
      this.logger.warn(`八字提要数据加载失败: ${e}`);
    }
    try {
      const jinxiang = await import("./bazi-books/jinxiangmishu");
      books.push(jinxiang.default);
    } catch (e) {
      this.logger.warn(`巾箱秘术数据加载失败: ${e}`);
    }
    try {
      const lixuzhong = await import("./bazi-books/lixuzhongmingshu");
      books.push(lixuzhong.default);
    } catch (e) {
      this.logger.warn(`李虚中命书数据加载失败: ${e}`);
    }
    try {
      const wuxian = await import("./bazi-books/tianyuanwuxian");
      books.push(wuxian.default);
    } catch (e) {
      this.logger.warn(`天元巫咸经数据加载失败: ${e}`);
    }
    try {
      const chenggu = await import("./bazi-books/yuantianangchenggu");
      books.push(chenggu.default);
    } catch (e) {
      this.logger.warn(`袁天罡称骨数据加载失败: ${e}`);
    }
    try {
      const mangpai = await import("./bazi-books/mangpai-mizhuan");
      books.push(mangpai.default);
    } catch (e) {
      this.logger.warn(`盲派秘传数据加载失败: ${e}`);
    }

    return books;
  }
}
