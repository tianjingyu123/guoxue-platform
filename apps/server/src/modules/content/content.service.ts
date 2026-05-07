import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContentDto) {
    return this.prisma.content.create({
      data: {
        title: dto.title,
        type: dto.type,
        author: dto.author,
        dynasty: dto.dynasty,
        excerpt: dto.excerpt,
        body: dto.body,
        cover: dto.cover,
        tags: dto.tags ?? [],
      },
    });
  }

  async list(q: ContentListQueryDto) {
    const page = +(q.page || 1);
    const pageSize = +(q.pageSize || 20);
    const where: any = {};

    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.keyword) {
      where.OR = [
        { title: { contains: q.keyword } },
        { author: { contains: q.keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async detail(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException("内容不存在");
    // 并发放大浏览数
    this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return content;
  }

  async update(id: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException("内容不存在");

    return this.prisma.content.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException("内容不存在");

    await this.prisma.content.delete({ where: { id } });
    return { success: true };
  }
}
