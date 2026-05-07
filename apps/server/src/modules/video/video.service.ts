import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: { circleId?: string; title?: string; videoUrl: string; coverUrl?: string; duration?: number }) {
    return this.prisma.video.create({
      data: {
        userId,
        circleId: dto.circleId,
        title: dto.title,
        videoUrl: dto.videoUrl,
        coverUrl: dto.coverUrl,
        duration: dto.duration,
      },
    });
  }

  async update(id: string, dto: { title?: string; coverUrl?: string; status?: string }) {
    return this.prisma.video.update({ where: { id }, data: dto as any });
  }

  async delete(id: string) {
    await this.prisma.video.delete({ where: { id } });
    return { success: true };
  }

  async list(params: { circleId?: string; status?: string; page?: number; pageSize?: number }) {
    const { circleId, status, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (circleId) where.circleId = circleId;
    if (status) where.status = status;
    else where.status = "PUBLISHED";

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.video.count({ where }),
    ]);

    return { videos, total, page, pageSize };
  }

  async getDetail(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
        products: true,
      },
    });
    if (!video) throw new NotFoundException("视频不存在");

    await this.prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return video;
  }

  async toggleLike(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException("视频不存在");
    return this.prisma.video.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });
  }
}
