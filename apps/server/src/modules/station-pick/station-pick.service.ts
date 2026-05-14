import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { AddStationPickDto, StationPickQuotaVo } from "./station-pick.dto";

const MAX_TOTAL_PICKS = 20;

@Injectable()
export class StationPickService {
  constructor(private prisma: PrismaService) {}

  /** 获取分站所有精选内容（含原始内容详情） */
  async getItems(stationId: string) {
    const picks = await this.prisma.stationPick.findMany({
      where: { stationId },
      orderBy: { sortOrder: "asc" },
    });
    const items = await this.fetchContentItems(picks);
    // 按 picks 原始排序
    const pickMap = new Map(picks.map((p) => [p.contentType + ":" + p.contentId, p]));
    return items
      .filter((item) => item !== null)
      .map((item) => {
        const key = item!.type + ":" + item!.id;
        const pick = pickMap.get(key);
        return { ...item, pickId: pick?.id, sortOrder: pick?.sortOrder, remark: pick?.remark };
      });
  }

  /** 添加精选内容 */
  async addPick(stationId: string, dto: AddStationPickDto) {
    // 1. 验证内容存在
    const content = await this.verifyContentExists(dto.contentType, dto.contentId);
    if (!content) {
      throw new BusinessException(ErrorCode.STATION_PICK_CONTENT_GONE, "内容不存在或已下架");
    }

    // 2. 检查是否已存在
    const existing = await this.prisma.stationPick.findUnique({
      where: {
        stationId_contentType_contentId: {
          stationId,
          contentType: dto.contentType,
          contentId: dto.contentId,
        },
      },
    });
    if (existing) {
      return this.prisma.stationPick.update({
        where: { id: existing.id },
        data: { remark: dto.remark ?? existing.remark },
      });
    }

    // 3. 检查总量上限
    const totalCount = await this.prisma.stationPick.count({ where: { stationId } });
    if (totalCount >= MAX_TOTAL_PICKS) {
      throw new BusinessException(
        ErrorCode.STATION_PICK_LIMIT_EXCEEDED,
        `每个分站最多添加 ${MAX_TOTAL_PICKS} 条精选内容`,
      );
    }

    // 4. 计算 sortOrder
    const maxOrder = await this.prisma.stationPick.aggregate({
      where: { stationId },
      _max: { sortOrder: true },
    });

    return this.prisma.stationPick.create({
      data: {
        stationId,
        contentType: dto.contentType,
        contentId: dto.contentId,
        remark: dto.remark,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  /** 移除精选内容 */
  async removePick(stationId: string, pickId: string) {
    const pick = await this.prisma.stationPick.findFirst({
      where: { id: pickId, stationId },
    });
    if (!pick) {
      throw new BusinessException(ErrorCode.STATION_PICK_NOT_FOUND, "精选记录不存在");
    }
    await this.prisma.stationPick.delete({ where: { id: pickId } });
    return { success: true };
  }

  /** 批量排序 */
  async reorderPicks(stationId: string, items: { id: string; sortOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.stationPick.updateMany({
          where: { id: item.id, stationId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { success: true };
  }

  /** 配额查询 */
  async getQuota(stationId: string): Promise<StationPickQuotaVo> {
    const used = await this.prisma.stationPick.count({ where: { stationId } });
    return { used, limit: MAX_TOTAL_PICKS };
  }

  /** 管理员强制删除 */
  async adminRemovePick(pickId: string) {
    const pick = await this.prisma.stationPick.findUnique({ where: { id: pickId } });
    if (!pick) {
      throw new BusinessException(ErrorCode.STATION_PICK_NOT_FOUND, "精选记录不存在");
    }
    await this.prisma.stationPick.delete({ where: { id: pickId } });
    return { success: true };
  }

  /** 管理员修改分站精选配置 */
  async adminSetConfig(stationId: string, config: Record<string, any>) {
    const station = await this.prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");
    }
    const currentConfig = (station.templateConfig as Record<string, any>) ?? {};
    await this.prisma.station.update({
      where: { id: stationId },
      data: { templateConfig: { ...currentConfig, ...config } },
    });
    return { success: true };
  }

  /** 管理员查看分站精选 */
  async adminGetPicks(stationId: string) {
    return this.prisma.stationPick.findMany({
      where: { stationId },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** 验证内容存在且可被精选 */
  private async verifyContentExists(contentType: string, contentId: string): Promise<boolean> {
    switch (contentType) {
      case "ARTICLE":
        return !!(await this.prisma.article.findUnique({
          where: { id: contentId },
          select: { id: true },
        }));
      case "COURSE":
        return !!(await this.prisma.course.findUnique({
          where: { id: contentId },
          select: { id: true },
        }));
      case "PRODUCT":
        return !!(await this.prisma.product.findUnique({
          where: { id: contentId },
          select: { id: true },
        }));
      case "CIRCLE":
        return !!(await this.prisma.circle.findUnique({
          where: { id: contentId },
          select: { id: true },
        }));
      case "VIDEO":
        return !!(await this.prisma.video.findUnique({
          where: { id: contentId },
          select: { id: true },
        }));
      default:
        return false;
    }
  }

  /**
   * 根据 picks 列表批量获取内容详情，返回 RecommendItem 格式
   * 供推荐引擎调用
   */
  async fetchContentItems(
    picks: { contentType: string; contentId: string }[],
  ): Promise<(Record<string, any> | null)[]> {
    const byType = new Map<string, string[]>();
    for (const p of picks) {
      const ids = byType.get(p.contentType) ?? [];
      ids.push(p.contentId);
      byType.set(p.contentType, ids);
    }

    const results: (Record<string, any> | null)[] = [];

    for (const [type, ids] of byType) {
      switch (type) {
        case "ARTICLE": {
          const articles = await this.prisma.article.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
          });
          for (const a of articles) {
            results.push({
              id: a.id, type: "ARTICLE", title: a.title, cover: a.cover ?? undefined,
              excerpt: a.excerpt ?? undefined, tags: a.tags, score: 99998,
              reason: "站长推荐", strategies: ["station-pick"],
              metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
            });
          }
          break;
        }
        case "COURSE": {
          const courses = await this.prisma.course.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
          });
          for (const c of courses) {
            results.push({
              id: c.id, type: "COURSE", title: c.title, cover: c.cover ?? undefined,
              excerpt: c.intro ?? undefined, tags: c.tags, score: 99998,
              reason: "站长推荐", strategies: ["station-pick"],
              metadata: { price: Number(c.price), studentCount: c.studentCount },
            });
          }
          break;
        }
        case "PRODUCT": {
          const products = await this.prisma.product.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, images: true, intro: true, tags: true, price: true, salesCount: true },
          });
          for (const p of products) {
            results.push({
              id: p.id, type: "PRODUCT", title: p.title, cover: p.images?.[0],
              excerpt: p.intro ?? undefined, tags: p.tags, score: 99998,
              reason: "站长推荐", strategies: ["station-pick"],
              metadata: { price: Number(p.price), salesCount: p.salesCount },
            });
          }
          break;
        }
        case "CIRCLE": {
          const circles = await this.prisma.circle.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, cover: true, intro: true, tags: true, memberCount: true },
          });
          for (const c of circles) {
            results.push({
              id: c.id, type: "CIRCLE", title: c.name, cover: c.cover ?? undefined,
              excerpt: c.intro ?? undefined, tags: c.tags, score: 99998,
              reason: "站长推荐", strategies: ["station-pick"],
              metadata: { memberCount: c.memberCount },
            });
          }
          break;
        }
        case "VIDEO": {
          const videos = await this.prisma.video.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, coverUrl: true, tags: true, viewCount: true, likeCount: true },
          });
          for (const v of videos) {
            results.push({
              id: v.id, type: "VIDEO", title: v.title ?? "", cover: v.coverUrl ?? undefined,
              tags: v.tags, score: 99998,
              reason: "站长推荐", strategies: ["station-pick"],
              metadata: { viewCount: v.viewCount, likeCount: v.likeCount },
            });
          }
          break;
        }
      }
    }

    return results;
  }
}
