import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BrowseHistoryQueryDto } from "./browse-history.dto";

@Injectable()
export class BrowseHistoryService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, query: BrowseHistoryQueryDto) {
    const { page = 1, pageSize = 20, targetType } = query;
    const where: any = { userId };
    if (targetType) where.targetType = targetType;

    const [data, total] = await Promise.all([
      this.prisma.browseHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, targetType: true, targetId: true, title: true, cover: true, createdAt: true },
      }),
      this.prisma.browseHistory.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async remove(userId: string, historyId: string) {
    const record = await this.prisma.browseHistory.findFirst({ where: { id: historyId, userId } });
    if (!record) return { message: "记录不存在" };
    await this.prisma.browseHistory.delete({ where: { id: historyId } });
    return { message: "已删除" };
  }

  async clearAll(userId: string) {
    await this.prisma.browseHistory.deleteMany({ where: { userId } });
    return { message: "全部清除" };
  }
}
