import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Cacheable, CacheEvict } from "../../common/cache.decorator";

const DEFAULT_CATEGORY_TREE: Record<string, string[]> = {
  "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
  "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生"],
  "诗词歌赋": ["唐诗", "宋词", "元曲", "现代诗词创作"],
  "民俗节庆": ["传统节日", "民俗活动", "民间故事", "礼仪习俗"],
  "非遗传承": ["传统技艺", "传统美术", "传统音乐", "民俗活动"],
  "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏", "品茶技法"],
  "书法绘画": ["书法入门", "国画技法", "名家鉴赏", "篆刻艺术"],
  "传统音乐": ["古琴", "古筝", "琵琶", "二胡"],
  "武术太极": ["太极拳", "八段锦", "武术基础", "养生气功"],
  "易经智慧": ["八字命理", "紫微斗数", "风水堪舆", "姓名学"],
};

@Injectable()
export class CategoryService implements OnModuleInit {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 启动时从默认数据种子初始化（仅当品类表为空） */
  async onModuleInit() {
    const count = await this.prisma.category.count();
    if (count > 0) return;
    this.logger.log("初始化默认品类树...");
    await this.seedDefaults();
  }

  private async seedDefaults() {
    let level1Sort = 0;
    for (const [level1, level2List] of Object.entries(DEFAULT_CATEGORY_TREE)) {
      const parent = await this.prisma.category.create({
        data: { name: level1, level: 1, sortOrder: level1Sort++ },
      });
      let level2Sort = 0;
      for (const level2 of level2List) {
        await this.prisma.category.create({
          data: { name: level2, parentId: parent.id, level: 2, sortOrder: level2Sort++ },
        });
      }
    }
    this.logger.log(`品类种子完成: ${Object.keys(DEFAULT_CATEGORY_TREE).length} 个一级品类`);
  }

  /** 获取品类树 */
  @Cacheable({ key: "category:tree", ttl: 300 })
  async getTree() {
    const all = await this.prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    });
    const roots = all.filter((c) => c.level === 1);
    return roots.map((r) => ({
      ...r,
      children: all.filter((c) => c.parentId === r.id),
    }));
  }

  /** 创建品类 */
  @CacheEvict({ key: "category:tree" })
  async create(dto: { name: string; parentId?: string; level?: number; sortOrder?: number; icon?: string }) {
    const level = dto.parentId ? 2 : (dto.level ?? 1);
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BusinessException(ErrorCode.NOT_FOUND, "父级品类不存在");
      if (parent.level !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "仅支持二级品类");
    }
    if (level === 1) {
      const existing = await this.prisma.category.findFirst({
        where: { name: dto.name, level: 1 },
      });
      if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "一级品类已存在");
    }
    return this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId || null,
        level,
        sortOrder: dto.sortOrder ?? 0,
        icon: dto.icon,
      },
    });
  }

  /** 更新品类 */
  @CacheEvict({ key: "category:tree" })
  async update(id: string, dto: { name?: string; sortOrder?: number; icon?: string; status?: string }) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new BusinessException(ErrorCode.NOT_FOUND, "品类不存在");
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  /** 删除品类（检查无子分类和内容引用） */
  @CacheEvict({ key: "category:tree" })
  async delete(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new BusinessException(ErrorCode.NOT_FOUND, "品类不存在");

    if (cat.level === 1) {
      const children = await this.prisma.category.count({ where: { parentId: id } });
      if (children > 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该品类下存在二级品类，请先删除子分类");
    }

    // 检查是否有内容引用此品类
    const refCount = await this.prisma.content.count({
      where: cat.level === 1
        ? { categoryLevel1: cat.name }
        : { categoryLevel2: cat.name },
    });
    if (refCount > 0) throw new BusinessException(ErrorCode.BAD_REQUEST, `该品类下有 ${refCount} 篇内容，无法删除`);

    return this.prisma.category.delete({ where: { id } });
  }

  /** 品类统计仪表盘（单次 groupBy 批量查询，避免 N+1） */
  async getStats() {
    const tree = await this.getTree();

    // 批量聚合所有品类的内容计数（1 次查询替代 N×2 次）
    const counts = await this.prisma.content.groupBy({
      by: ["categoryLevel1", "categoryLevel2", "status"],
      _count: true,
      where: {
        categoryLevel1: { not: null },
        categoryLevel2: { not: null },
      },
    });

    // 构建 key → count 映射
    const keyFor = (l1: string, l2: string, s: string) => `${l1}::${l2}::${s}`;
    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(keyFor(c.categoryLevel1!, c.categoryLevel2!, c.status), c._count);
    }

    const stats: Array<{
      level1: string;
      level2: string;
      level2Id: string;
      published: number;
      draft: number;
      total: number;
    }> = [];

    for (const level1 of tree) {
      for (const level2 of (level1 as any).children || []) {
        const draft = countMap.get(keyFor(level1.name, level2.name, "DRAFT")) ?? 0;
        const published = countMap.get(keyFor(level1.name, level2.name, "PUBLISHED")) ?? 0;
        const total = published + draft;
        stats.push({ level1: level1.name, level2: level2.name, level2Id: level2.id, published, draft, total });
      }
    }

    return {
      totalLevel1: tree.length,
      totalLevel2: stats.length,
      totalContent: stats.reduce((s, x) => s + x.total, 0),
      emptyCategories: stats.filter((s) => s.total === 0).length,
      lowContentCategories: stats.filter((s) => s.total > 0 && s.total < 5).length,
      healthScore: this.calcHealthScore(stats),
      stats,
    };
  }

  private calcHealthScore(stats: Array<{ total: number }>): string {
    if (stats.length === 0) return "N/A";
    const filled = stats.filter((s) => s.total >= 5).length;
    const pct = Math.round((filled / stats.length) * 100);
    if (pct >= 80) return "优秀";
    if (pct >= 50) return "良好";
    return "需补充";
  }

  /** 同步 contentCount（批量 groupBy 替代 N+1） */
  async syncContentCounts() {
    const all = await this.prisma.category.findMany({ where: { level: 2 }, include: { parent: { select: { name: true } } } });
    if (all.length === 0) return { synced: 0 };

    // 一次查询获取所有 level2 的内容计数
    const counts = await this.prisma.content.groupBy({
      by: ["categoryLevel2"],
      _count: true,
      where: { status: { not: "DRAFT" }, categoryLevel2: { not: null } },
    });
    const countMap = new Map(counts.map((c) => [c.categoryLevel2!, c._count]));

    // 批量更新
    let synced = 0;
    for (const cat of all) {
      const newCount = countMap.get(cat.name) ?? 0;
      if (cat.contentCount !== newCount) {
        await this.prisma.category.update({ where: { id: cat.id }, data: { contentCount: newCount } });
        synced++;
      }
    }
    return { synced };
  }
}
