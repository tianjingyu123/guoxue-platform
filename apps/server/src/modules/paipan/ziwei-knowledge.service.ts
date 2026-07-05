import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CreateZiweiKnowledgeDto, UpdateZiweiKnowledgeDto } from "./ziwei-knowledge.dto";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";

@Injectable()
export class ZiweiKnowledgeService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [total, byCategory] = await Promise.all([
      this.prisma.ziweiKnowledge.count({ where: { status: "PUBLISHED" } }),
      this.prisma.ziweiKnowledge.groupBy({ by: ["category"], _count: true, where: { status: "PUBLISHED" } }),
    ]);
    return { total, categories: byCategory.map((c) => ({ category: c.category, count: c._count })) };
  }

  async search(keyword: string, category?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ZiweiKnowledgeWhereInput = { status: "PUBLISHED" };
    if (keyword) where.title = { contains: keyword, mode: "insensitive" };
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      this.prisma.ziweiKnowledge.findMany({
        where,
        select: { id: true, title: true, category: true, tags: true, source: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ziweiKnowledge.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getByCategory(category: string, page = 1, pageSize = 20) {
    return this.search("", category, page, pageSize);
  }

  async getById(id: string) {
    const item = await this.prisma.ziweiKnowledge.findUnique({ where: { id } });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");
    return item;
  }

  async create(dto: CreateZiweiKnowledgeDto) {
    return this.prisma.ziweiKnowledge.create({ data: dto });
  }

  async update(id: string, dto: UpdateZiweiKnowledgeDto) {
    const item = await this.prisma.ziweiKnowledge.findUnique({ where: { id } });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");
    return this.prisma.ziweiKnowledge.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const item = await this.prisma.ziweiKnowledge.findUnique({ where: { id } });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");
    return this.prisma.ziweiKnowledge.delete({ where: { id } });
  }
}
