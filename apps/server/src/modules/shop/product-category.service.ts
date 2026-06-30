import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_PRODUCT_CATEGORIES = [
  { name: "书籍", children: ["国学经典", "诗词鉴赏", "书法字帖", "易学命理", "中医养生"] },
  { name: "文房", children: ["笔墨纸砚", "印章篆刻", "书法用具"] },
  { name: "茶具", children: ["茶壶", "茶杯", "茶配件", "茶席"] },
  { name: "香道", children: ["线香", "香炉", "香道工具"] },
  { name: "文创", children: ["书签", "手账", "帆布包", "手机壳"] },
];

@Injectable()
export class ProductCategoryService implements OnModuleInit {
  private readonly logger = new Logger(ProductCategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.productCategory.count();
    if (count > 0) return;
    this.logger.log("初始化默认商品分类...");
    await this.seedDefaults();
  }

  private async seedDefaults() {
    let l1Sort = 0;
    for (const l1 of DEFAULT_PRODUCT_CATEGORIES) {
      const parent = await this.prisma.productCategory.create({
        data: { name: l1.name, level: 1, sortOrder: l1Sort++ },
      });
      let l2Sort = 0;
      for (const l2 of l1.children) {
        await this.prisma.productCategory.create({
          data: { name: l2, parentId: parent.id, level: 2, sortOrder: l2Sort++ },
        });
      }
    }
  }

  async getTree() {
    const all = await this.prisma.productCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    });
    const roots = all.filter((c) => c.level === 1);
    return roots.map((r) => ({ ...r, children: all.filter((c) => c.parentId === r.id) }));
  }

  async getProducts(categoryId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { categoryId, status: "ON_SALE" },
        select: { id: true, title: true, price: true, originalPrice: true, images: true, salesCount: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { salesCount: "desc" },
      }),
      this.prisma.product.count({ where: { categoryId, status: "ON_SALE" } }),
    ]);
    return { items, total, page, pageSize };
  }

  // Admin endpoints
  async adminCreate(dto: { name: string; parentId?: string; level?: number; sortOrder?: number; icon?: string }) {
    const level = dto.parentId ? 2 : (dto.level ?? 1);
    return this.prisma.productCategory.create({ data: { ...dto, level } });
  }

  async adminUpdate(id: string, dto: { name?: string; sortOrder?: number; icon?: string; status?: string }) {
    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }

  async adminDelete(id: string) {
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new BusinessException(ErrorCode.BAD_REQUEST, `该分类下有 ${count} 个商品，无法删除`);
    return this.prisma.productCategory.delete({ where: { id } });
  }
}
