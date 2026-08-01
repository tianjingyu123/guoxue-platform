import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BOARD_LABELS,
  CatalogQueryDto,
  PINNED_BOARDS,
  PinnedBoard,
  SavePinnedBatchDto,
  SLOTS_PER_BOARD,
} from "./station-pinned.dto";

/** 统一选品/主推内容简报 */
export interface ContentBrief {
  id: string;
  title: string;
  cover: string | null;
  price: number | null;
  contentType: string;
  sourceBoard: string;
  liveStatus?: "live" | "scheduled" | "ended";
  scheduledAt?: Date | null;
  viewerCount?: number;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function isPublicBotConfigured(bot: { runtime: string; botId: string; apiKey: string }): boolean {
  if (bot.runtime === "local") return true;
  if (!bot.botId || /^coze_/i.test(bot.botId)) return false;
  return Boolean(bot.apiKey && bot.apiKey !== "sk_dev_placeholder");
}

@Injectable()
export class StationPinnedService {
  private readonly logger = new Logger(StationPinnedService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════
  // S2：读取 9 板块 × 6 位主推位（已锁位带内容详情）
  // ═══════════════════════════════════════════════
  async getBoards(stationId: string) {
    await this.assertStation(stationId);
    const records = await this.prisma.stationPinnedContent.findMany({
      where: { stationId, isActive: true },
      orderBy: [{ board: "asc" }, { slotIndex: "asc" }],
    });

    // 懒失活：直播位对应直播已结束/回放/删除 → 置 isActive=false，不返回
    const liveRecords = records.filter((r) => r.board === "live");
    const staleLiveIds: string[] = [];
    if (liveRecords.length) {
      const liveIds = liveRecords.map((r) => r.contentId);
      const rooms = await this.prisma.liveRoom.findMany({
        where: { id: { in: liveIds } },
        select: { id: true, status: true },
      });
      const roomStatus = new Map(rooms.map((r) => [r.id, r.status]));
      for (const r of liveRecords) {
        const st = roomStatus.get(r.contentId);
        if (!st || st === "ENDED" || st === "REPLAY") staleLiveIds.push(r.id);
      }
    }
    if (staleLiveIds.length) {
      await this.prisma.stationPinnedContent.updateMany({
        where: { id: { in: staleLiveIds } },
        data: { isActive: false },
      });
    }

    const valid = records.filter((r) => !staleLiveIds.includes(r.id));
    const briefMap = await this.enrichContents(valid);

    // 组装 9 板块 × 6 位（空位为 null）
    return PINNED_BOARDS.map((board) => {
      const slots = Array.from({ length: SLOTS_PER_BOARD }, (_, slotIndex) => {
        const rec = valid.find((r) => r.board === board && r.slotIndex === slotIndex);
        if (!rec) return { slotIndex, content: null };
        const brief = briefMap.get(`${rec.contentType}:${rec.contentId}`) || null;
        return { slotIndex, content: brief };
      });
      const filled = slots.filter((s) => s.content).length;
      return { board, label: BOARD_LABELS[board], scope: board === "home" ? "全部类别" : BOARD_LABELS[board], filled, slots };
    });
  }

  // ═══════════════════════════════════════════════
  // S1：9 板块主推位数量汇总
  // ═══════════════════════════════════════════════
  async getSummary(stationId: string) {
    await this.assertStation(stationId);
    const grouped = await this.prisma.stationPinnedContent.groupBy({
      by: ["board"],
      where: { stationId, isActive: true },
      _count: { _all: true },
    });
    const countMap = new Map(grouped.map((g) => [g.board, g._count._all]));
    return PINNED_BOARDS.map((board) => ({
      board,
      label: BOARD_LABELS[board],
      count: countMap.get(board) || 0,
      total: SLOTS_PER_BOARD,
    }));
  }

  // ═══════════════════════════════════════════════
  // S3：选品库列表
  // ═══════════════════════════════════════════════
  /**
   * C 端读取当前分站的主推内容。
   * 临时分享 ref 优先于用户永久归属；任何解析/内容异常都 fail-open 为空，不阻断主页面。
   */
  async getPublicBoard(board: PinnedBoard, userId?: string, ref?: string) {
    const empty = { station: null, board, label: BOARD_LABELS[board], items: [] as ContentBrief[] };
    try {
      const station = await this.resolvePublicStation(userId, ref);
      if (!station) return empty;

      const records = await this.prisma.stationPinnedContent.findMany({
        where: { stationId: station.id, board, isActive: true },
        orderBy: { slotIndex: "asc" },
        take: SLOTS_PER_BOARD,
      });
      if (!records.length) return { ...empty, station };

      const briefMap = await this.enrichContents(records, true);
      const items = records
        .map((record) => briefMap.get(`${record.contentType}:${record.contentId}`))
        .filter((item): item is ContentBrief => Boolean(item));
      return { station, board, label: BOARD_LABELS[board], items };
    } catch (error) {
      this.logger.warn(`读取 C 端分站主推失败(board=${board})`, error);
      return empty;
    }
  }
  async getCatalog(stationId: string, query: CatalogQueryDto) {
    await this.assertStation(stationId);
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    // 已锁内容（同板块排除）：取该 board 已锁 contentId
    const board = query.board;
    const lockedInBoard = await this.prisma.stationPinnedContent.findMany({
      where: { stationId, board, isActive: true },
      select: { contentId: true },
    });
    const excludeIds = lockedInBoard.map((r) => r.contentId);

    let items: ContentBrief[] = [];
    if (board === "home") {
      const sub = (query.filterBoard || "all").toLowerCase();
      if (sub === "all" || !sub) {
        // 聚合各板块少量内容
        const boards: Exclude<PinnedBoard, "home" | "agent" | "live">[] = ["course", "mall", "circle", "article", "video", "ebook"];
        const per = Math.max(4, Math.ceil(pageSize / boards.length));
        const groups = await Promise.all(boards.map((b) => this.queryBoardCatalog(b, { q: query.q, take: per, excludeIds })));
        items = groups.flat();
      } else if ((PINNED_BOARDS as readonly string[]).includes(sub)) {
        items = await this.queryBoardCatalog(sub as Exclude<PinnedBoard, "home">, { q: query.q, take: pageSize, excludeIds, status: query.status });
      }
    } else {
      items = await this.queryBoardCatalog(board, { q: query.q, take: pageSize, excludeIds, status: query.status });
    }
    return { items, total: items.length };
  }

  // ═══════════════════════════════════════════════
  // S2：保存某板块全部主推位（快照式覆盖写）
  // ═══════════════════════════════════════════════
  async saveBatch(stationId: string, userId: string, dto: SavePinnedBatchDto) {
    await this.assertStation(stationId);
    const board = dto.board;
    const valid = dto.slots.filter((s) => s.contentType && s.contentId);

    await this.prisma.$transaction([
      // 清掉该板块旧记录（快照覆盖）
      this.prisma.stationPinnedContent.deleteMany({ where: { stationId, board } }),
      // 写入新记录
      ...valid.map((s) =>
        this.prisma.stationPinnedContent.create({
          data: {
            stationId,
            board,
            slotIndex: s.slotIndex,
            contentType: s.contentType as string,
            contentId: s.contentId as string,
            lockedBy: userId,
            isActive: true,
          },
        }),
      ),
      this.prisma.station.update({ where: { id: stationId }, data: { pinnedUpdatedAt: new Date() } }),
    ]);
    return { board, saved: valid.length };
  }

  // ═══════════════════════════════════════════════
  // S2：清空某个主推位
  // ═══════════════════════════════════════════════
  async removeSlot(stationId: string, board: string, slotIndex: number) {
    await this.assertStation(stationId);
    await this.prisma.stationPinnedContent.deleteMany({ where: { stationId, board, slotIndex } });
    await this.prisma.station.update({ where: { id: stationId }, data: { pinnedUpdatedAt: new Date() } });
    return { board, slotIndex, removed: true };
  }

  // ───────────────────────── 内部 ─────────────────────────

  private async assertStation(stationId: string) {
    const s = await this.prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!s) throw new NotFoundException("分站不存在");
  }

  /** 按板块查内容表，返回统一简报（用于 catalog / home 聚合） */
  private async queryBoardCatalog(
    board: Exclude<PinnedBoard, "home">,
    opts: { q?: string; take: number; excludeIds: string[]; status?: string },
  ): Promise<ContentBrief[]> {
    const { q, take, excludeIds, status } = opts;
    const titleWhere = q ? { title: { contains: q, mode: "insensitive" as const } } : {};
    const idNotIn = excludeIds.length ? { id: { notIn: excludeIds } } : {};

    switch (board) {
      case "course": {
        const rows = await this.prisma.course.findMany({
          where: { auditStatus: "APPROVED", deletedAt: null, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, cover: true, price: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.title, cover: r.cover, price: toNum(r.price), contentType: "course", sourceBoard: "course" }));
      }
      case "mall": {
        const rows = await this.prisma.product.findMany({
          where: { status: "ON_SALE", deletedAt: null, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, images: true, price: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.title, cover: r.images?.[0] || null, price: toNum(r.price), contentType: "product", sourceBoard: "mall" }));
      }
      case "circle": {
        const rows = await this.prisma.circle.findMany({
          where: { status: "ACTIVE", deletedAt: null, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}), ...idNotIn },
          select: { id: true, name: true, cover: true, price: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.name, cover: r.cover, price: toNum(r.price), contentType: "circle", sourceBoard: "circle" }));
      }
      case "article": {
        const rows = await this.prisma.article.findMany({
          where: { auditStatus: "APPROVED", deletedAt: null, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, cover: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.title, cover: r.cover, price: null, contentType: "article", sourceBoard: "article" }));
      }
      case "video": {
        const rows = await this.prisma.video.findMany({
          where: { auditStatus: "APPROVED", status: "PUBLISHED", isPrivate: false, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, coverUrl: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.title || "未命名视频", cover: r.coverUrl, price: null, contentType: "video", sourceBoard: "video" }));
      }
      case "ebook": {
        const rows = await this.prisma.classicBook.findMany({
          where: { status: "PUBLISHED", deletedAt: null, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, cover: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({ id: r.id, title: r.title, cover: r.cover, price: null, contentType: "ebook", sourceBoard: "ebook" }));
      }
      case "live": {
        // 正在直播 LIVING / 预约 WAITING
        const statusFilter: Array<"LIVING" | "WAITING"> =
          status === "live" ? ["LIVING"] : status === "scheduled" ? ["WAITING"] : ["LIVING", "WAITING"];
        const rows = await this.prisma.liveRoom.findMany({
          where: { status: { in: statusFilter }, ...titleWhere, ...idNotIn },
          select: { id: true, title: true, cover: true, status: true, startTime: true, viewCount: true },
          orderBy: { createdAt: "desc" },
          take,
        });
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          cover: r.cover,
          price: null,
          contentType: "live_room",
          sourceBoard: "live",
          liveStatus: r.status === "LIVING" ? "live" : "scheduled",
          scheduledAt: r.startTime,
          viewerCount: r.viewCount,
        }));
      }
      case "agent": {
        const rows = await this.prisma.botConfig.findMany({
          where: {
            status: "ACTIVE",
            ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
            ...idNotIn,
          },
          select: { id: true, name: true, avatar: true, intro: true, runtime: true, botId: true, apiKey: true },
          orderBy: { sortOrder: "asc" },
          take: Math.max(take * 2, take),
        });
        return rows
          .filter(isPublicBotConfigured)
          .slice(0, take)
          .map((r) => ({ id: r.id, title: r.name, cover: r.avatar, price: null, contentType: "agent", sourceBoard: "agent" }));
      }
      default:
        return [];
    }
  }

  private async resolvePublicStation(userId?: string, ref?: string) {
    const select = { id: true, userId: true, name: true, code: true, logo: true, themeColor: true } as const;

    if (ref) {
      const temporary = await this.prisma.station.findFirst({
        where: { status: "ACTIVE", OR: [{ userId: ref }, { code: ref }] },
        select,
      });
      if (temporary) return temporary;
    }
    if (!userId) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { attributionStationId: true },
    });
    if (user?.attributionStationId) {
      const attributed = await this.prisma.station.findFirst({
        where: { id: user.attributionStationId, status: "ACTIVE" },
        select,
      });
      if (attributed) return attributed;
    }

    const relation = await this.prisma.referralRelation.findFirst({
      where: { userId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { referrerId: true },
    });
    if (!relation) return null;
    return this.prisma.station.findFirst({
      where: { userId: relation.referrerId, status: "ACTIVE" },
      select,
    });
  }

  /** 批量 enrich 已锁记录的标题/封面（按 contentType 分组查各表）；publicOnly 时剔除已下架内容。 */
  private async enrichContents(
    records: { contentType: string; contentId: string }[],
    publicOnly = false,
  ): Promise<Map<string, ContentBrief>> {
    const map = new Map<string, ContentBrief>();
    const byType = new Map<string, string[]>();
    for (const r of records) {
      if (!byType.has(r.contentType)) byType.set(r.contentType, []);
      byType.get(r.contentType)!.push(r.contentId);
    }

    for (const [type, ids] of byType) {
      if (!ids.length) continue;
      switch (type) {
        case "course": {
          const rows = await this.prisma.course.findMany({ where: { id: { in: ids }, ...(publicOnly ? { auditStatus: "APPROVED", deletedAt: null } : {}) }, select: { id: true, title: true, cover: true, price: true } });
          rows.forEach((r) => map.set(`course:${r.id}`, { id: r.id, title: r.title, cover: r.cover, price: toNum(r.price), contentType: "course", sourceBoard: "course" }));
          break;
        }
        case "product": {
          const rows = await this.prisma.product.findMany({ where: { id: { in: ids }, ...(publicOnly ? { status: "ON_SALE", deletedAt: null } : {}) }, select: { id: true, title: true, images: true, price: true } });
          rows.forEach((r) => map.set(`product:${r.id}`, { id: r.id, title: r.title, cover: r.images?.[0] || null, price: toNum(r.price), contentType: "product", sourceBoard: "mall" }));
          break;
        }
        case "circle": {
          const rows = await this.prisma.circle.findMany({ where: { id: { in: ids }, ...(publicOnly ? { status: "ACTIVE", deletedAt: null } : {}) }, select: { id: true, name: true, cover: true, price: true } });
          rows.forEach((r) => map.set(`circle:${r.id}`, { id: r.id, title: r.name, cover: r.cover, price: toNum(r.price), contentType: "circle", sourceBoard: "circle" }));
          break;
        }
        case "article": {
          const rows = await this.prisma.article.findMany({ where: { id: { in: ids }, ...(publicOnly ? { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null } : {}) }, select: { id: true, title: true, cover: true } });
          rows.forEach((r) => map.set(`article:${r.id}`, { id: r.id, title: r.title, cover: r.cover, price: null, contentType: "article", sourceBoard: "article" }));
          break;
        }
        case "video": {
          const rows = await this.prisma.video.findMany({ where: { id: { in: ids }, ...(publicOnly ? { auditStatus: "APPROVED", status: "PUBLISHED", isPrivate: false } : {}) }, select: { id: true, title: true, coverUrl: true } });
          rows.forEach((r) => map.set(`video:${r.id}`, { id: r.id, title: r.title || "未命名视频", cover: r.coverUrl, price: null, contentType: "video", sourceBoard: "video" }));
          break;
        }
        case "ebook": {
          const rows = await this.prisma.classicBook.findMany({ where: { id: { in: ids }, ...(publicOnly ? { status: "PUBLISHED", deletedAt: null } : {}) }, select: { id: true, title: true, cover: true } });
          rows.forEach((r) => map.set(`ebook:${r.id}`, { id: r.id, title: r.title, cover: r.cover, price: null, contentType: "ebook", sourceBoard: "ebook" }));
          break;
        }
        case "live_room": {
          const rows = await this.prisma.liveRoom.findMany({ where: { id: { in: ids }, ...(publicOnly ? { status: { in: ["LIVING", "WAITING"] } } : {}) }, select: { id: true, title: true, cover: true, status: true, startTime: true, viewCount: true } });
          rows.forEach((r) =>
            map.set(`live_room:${r.id}`, {
              id: r.id,
              title: r.title,
              cover: r.cover,
              price: null,
              contentType: "live_room",
              sourceBoard: "live",
              liveStatus: r.status === "LIVING" ? "live" : "scheduled",
              scheduledAt: r.startTime,
              viewerCount: r.viewCount,
            }),
          );
          break;
        }
        case "agent": {
          const rows = await this.prisma.botConfig.findMany({
            where: { id: { in: ids }, ...(publicOnly ? { status: "ACTIVE" } : {}) },
            select: { id: true, name: true, avatar: true, runtime: true, botId: true, apiKey: true },
          });
          rows
            .filter((row) => !publicOnly || isPublicBotConfigured(row))
            .forEach((row) => map.set(`agent:${row.id}`, { id: row.id, title: row.name, cover: row.avatar, price: null, contentType: "agent", sourceBoard: "agent" }));
          break;
        }
        default:
          break;
      }
    }
    return map;
  }
}
