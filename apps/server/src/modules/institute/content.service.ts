import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InstituteContentService {
  private readonly logger = new Logger(InstituteContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { title: string; content: string; instituteId: string; contentType?: string; summary?: string; price?: number }, authorId: string) {
    return this.prisma.instituteContent.create({
      data: { ...dto, authorId, price: dto.price ?? 0 },
    });
  }

  async list(params: { instituteId?: string; status?: string; page?: number; pageSize?: number }) {
    const { instituteId, status, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (instituteId) where.instituteId = instituteId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.instituteContent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.instituteContent.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const c = await this.prisma.instituteContent.findUnique({
      where: { id },
      include: { purchases: { take: 20, orderBy: { purchasedAt: "desc" } } },
    });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "内容不存在");
    return c;
  }

  async update(id: string, dto: { title?: string; content?: string; summary?: string; price?: number; status?: string }) {
    return this.prisma.instituteContent.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    return this.prisma.instituteContent.update({ where: { id }, data: { status: "ARCHIVED" } });
  }

  async getStats(instituteId?: string) {
    const where: any = instituteId ? { instituteId } : {};
    const [total, published, draft] = await Promise.all([
      this.prisma.instituteContent.count({ where }),
      this.prisma.instituteContent.count({ where: { ...where, status: "PUBLISHED" } }),
      this.prisma.instituteContent.count({ where: { ...where, status: "DRAFT" } }),
    ]);
    const purchases = await this.prisma.instituteContentPurchase.count({
      where: instituteId ? { content: { instituteId } } : {},
    });
    return { total, published, draft, purchases };
  }

  async getPurchaseRecords(contentId: string, page = 1, pageSize = 20) {
    const where = { contentId };
    const [items, total] = await Promise.all([
      this.prisma.instituteContentPurchase.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { purchasedAt: "desc" },
      }),
      this.prisma.instituteContentPurchase.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
