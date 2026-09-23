import type { PrismaClient } from "@prisma/client";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { projectPublicCatalogEntry, type CatalogSource, type PublicCatalogEntry } from "./public-content-catalog";

/**
 * 只读目录预览，不写索引、不提供公开接口、不读取正文、视频播放地址或交易数据。
 * 每类最多取 50 条，供主线核对准入和字段；Content 暂无安全详情链路，暂不预览。
 */
export async function collectPublicCatalogPreview(
  prisma: PrismaClient,
  perType = 10,
  now = new Date(),
): Promise<PublicCatalogEntry[]> {
  const take = Math.min(Math.max(Math.floor(perType) || 1, 1), 50);
  const publishedAt = { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] };
  const courseSchedule = {
    AND: [publishedAt, { OR: [{ scheduledOnAt: null }, { scheduledOnAt: { lte: now } }] },
      { OR: [{ scheduledOffAt: null }, { scheduledOffAt: { gt: now } }] }],
  };
  const sources = await Promise.all([
    prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null, stationId: null, AND: [publishedAt] },
      select: { id: true, title: true, excerpt: true, cover: true, tags: true, circleId: true, stationId: true,
        auditStatus: true, visibility: true, deletedAt: true, scheduledAt: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" }, take }),
    prisma.course.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null, stationId: null, AND: [courseSchedule] },
      select: { id: true, title: true, intro: true, cover: true, tags: true, price: true, circleId: true, stationId: true,
        auditStatus: true, visibility: true, deletedAt: true, scheduledAt: true, scheduledOnAt: true,
        scheduledOffAt: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take }),
    prisma.video.findMany({ where: { status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false, stationId: null },
      select: { id: true, title: true, description: true, coverUrl: true, tags: true, circleId: true, stationId: true,
        status: true, auditStatus: true, visibility: true, isPrivate: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take }),
    prisma.product.findMany({ where: { status: "ON_SALE", deletedAt: null, stationId: null, circleId: null },
      select: { id: true, title: true, intro: true, images: true, tags: true, circleId: true, stationId: true,
        status: true, deletedAt: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take }),
    prisma.circle.findMany({ where: { status: "ACTIVE", deletedAt: null, stationId: null },
      select: { id: true, name: true, intro: true, cover: true, tags: true, stationId: true,
        status: true, deletedAt: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take }),
    prisma.classicBook.findMany({ where: PUBLIC_CLASSIC_BOOK_WHERE,
      select: { id: true, title: true, intro: true, cover: true, status: true, deletedAt: true,
        createdAt: true, updatedAt: true, copyrights: { select: { license: true, auditedAt: true } } },
      orderBy: { createdAt: "desc" }, take }),
  ]);
  const types: CatalogSource[] = ["article", "course", "video", "product", "circle", "classic"];
  return sources.flatMap((rows, index) => rows
    .map((row) => projectPublicCatalogEntry(types[index], row as unknown as Record<string, unknown>, now))
    .filter((entry): entry is PublicCatalogEntry => entry !== null));
}
