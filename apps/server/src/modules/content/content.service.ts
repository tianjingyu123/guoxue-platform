import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateContentDto, UpdateContentDto, QueryContentDto } from "./content.dto";

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async list(query: QueryContentDto) {
    const page = parseInt(query.page ?? "1");
    const pageSize = parseInt(query.pageSize ?? "10");
    const where: any = { status: "PUBLISHED" };

    if (query.type) where.type = query.type;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { excerpt: { contains: query.keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          excerpt: true,
          author: true,
          dynasty: true,
          tags: true,
          coverUrl: true,
          viewCount: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async detail(id: string) {
    await this.prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return this.prisma.content.findUnique({ where: { id } });
  }

  async create(dto: CreateContentDto) {
    return this.prisma.content.create({ data: dto });
  }

  async update(id: string, dto: UpdateContentDto) {
    return this.prisma.content.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.content.delete({ where: { id } });
  }
}
