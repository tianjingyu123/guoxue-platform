import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { projectPublicCatalogEntry, type CatalogSource, type PublicCatalogEntry } from "./public-content-catalog";
import { catalogContentHash } from "./public-content-catalog-reconcile";

/**
 * 只读目录预览，不写索引、不提供公开接口、不读取正文、视频播放地址或交易数据。
 * 每类最多取 50 条，供主线核对准入和字段；非全量回填。
 */
const TYPES: CatalogSource[] = ["article", "course", "video", "product", "circle", "content", "classic"];

export interface CatalogReadPage {
  entries: PublicCatalogEntry[];
  cursors: Partial<Record<CatalogSource, string>>;
  exhausted: CatalogSource[];
}

/** 按来源 ID 稳定翻页；调用方须记录游标，不能把单页当全量扫描。 */
export async function readPublicCatalogPage(
  prisma: PrismaClient,
  perType = 100,
  now = new Date(),
  after: Partial<Record<CatalogSource, string>> = {},
  omit: readonly CatalogSource[] = [],
): Promise<CatalogReadPage> {
  const take = Math.min(Math.max(Math.floor(perType) || 1, 1), 500);
  const idAfter = (type: CatalogSource) => after[type] ? { gt: after[type] } : undefined;
  const included = (type: CatalogSource) => !omit.includes(type);
  const publishedAt = { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] };
  const courseSchedule = {
    AND: [publishedAt, { OR: [{ scheduledOnAt: null }, { scheduledOnAt: { lte: now } }] },
      { OR: [{ scheduledOffAt: null }, { scheduledOffAt: { gt: now } }] }],
  };
  const sources = await Promise.all([
    included("article") ? prisma.article.findMany({ where: { id: idAfter("article"), auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null, stationId: null, AND: [publishedAt] },
      select: { id: true, title: true, excerpt: true, cover: true, tags: true, circleId: true, stationId: true,
        auditStatus: true, visibility: true, deletedAt: true, scheduledAt: true, createdAt: true, updatedAt: true },
      orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("course") ? prisma.course.findMany({ where: { id: idAfter("course"), auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null, stationId: null, AND: [courseSchedule] },
      select: { id: true, title: true, intro: true, cover: true, tags: true, price: true, circleId: true, stationId: true,
        auditStatus: true, visibility: true, deletedAt: true, scheduledAt: true, scheduledOnAt: true,
        scheduledOffAt: true, createdAt: true, updatedAt: true }, orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("video") ? prisma.video.findMany({ where: { id: idAfter("video"), status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false, stationId: null },
      select: { id: true, title: true, description: true, coverUrl: true, tags: true, circleId: true, stationId: true,
        status: true, auditStatus: true, visibility: true, isPrivate: true, createdAt: true },
      orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("product") ? prisma.product.findMany({ where: { id: idAfter("product"), status: "ON_SALE", deletedAt: null, stationId: null, circleId: null },
      select: { id: true, title: true, intro: true, images: true, tags: true, circleId: true, stationId: true,
        status: true, deletedAt: true, createdAt: true, updatedAt: true }, orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("circle") ? prisma.circle.findMany({ where: { id: idAfter("circle"), status: "ACTIVE", deletedAt: null, stationId: null },
      select: { id: true, name: true, intro: true, cover: true, tags: true, stationId: true,
        status: true, deletedAt: true, createdAt: true, updatedAt: true }, orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("content") ? prisma.content.findMany({ where: { id: idAfter("content"), status: "PUBLISHED", deletedAt: null, stationId: null, AND: [publishedAt] },
      select: { id: true, title: true, excerpt: true, cover: true, tags: true, stationId: true,
        status: true, deletedAt: true, scheduledAt: true, createdAt: true, updatedAt: true },
      orderBy: { id: "asc" }, take }) : Promise.resolve([]),
    included("classic") ? prisma.classicBook.findMany({ where: { ...PUBLIC_CLASSIC_BOOK_WHERE, id: idAfter("classic") },
      select: { id: true, title: true, intro: true, cover: true, status: true, deletedAt: true,
        createdAt: true, updatedAt: true, copyrights: { select: { license: true, auditedAt: true } } },
      orderBy: { id: "asc" }, take }) : Promise.resolve([]),
  ]);
  const cursors: Partial<Record<CatalogSource, string>> = { ...after };
  const exhausted: CatalogSource[] = [];
  const entries = sources.flatMap((rows, index) => {
    const type = TYPES[index];
    if (rows.length < take) exhausted.push(type);
    if (rows.length) cursors[type] = String(rows[rows.length - 1].id);
    return rows
      .map((row) => projectPublicCatalogEntry(type, row as unknown as Record<string, unknown>, now))
      .filter((entry): entry is PublicCatalogEntry => entry !== null);
  });
  return { entries, cursors, exhausted };
}

/** 单页抽样预览；不能据此生成撤回计划。 */
export async function collectPublicCatalogPreview(
  prisma: PrismaClient,
  perType = 10,
  now = new Date(),
): Promise<PublicCatalogEntry[]> {
  return (await readPublicCatalogPage(prisma, Math.min(perType, 50), now)).entries;
}

/**
 * 全量只读扫描的摘要；不输出标题或正文，不写数据库。
 * 多页读期间来源可变化，因此不能仅凭此结果声明“可安全撤回未见记录”。
 */
export async function scanPublicCatalogReadonly(
  prisma: PrismaClient,
  batchSize = 100,
  now = new Date(),
  maxPages = 10000,
): Promise<{ counts: Record<CatalogSource, number>; fingerprint: string; pages: number; snapshotConsistent: false }> {
  const counts = Object.fromEntries(TYPES.map((type) => [type, 0])) as Record<CatalogSource, number>;
  const digest = createHash("sha256");
  let cursors: Partial<Record<CatalogSource, string>> = {};
  const exhausted = new Set<CatalogSource>();
  let pages = 0;
  while (exhausted.size < TYPES.length) {
    if (pages >= maxPages) throw new Error("目录只读扫描超过页数上限，未标记为完整");
    const page = await readPublicCatalogPage(prisma, batchSize, now, cursors, [...exhausted]);
    pages++;
    for (const entry of page.entries) {
      counts[entry.sourceType]++;
      digest.update(`${entry.sourceType}:${entry.sourceId}:${catalogContentHash(entry)}\n`);
    }
    for (const type of page.exhausted) exhausted.add(type);
    for (const type of TYPES) {
      if (!exhausted.has(type) && page.cursors[type] === cursors[type]) {
        throw new Error(`目录只读扫描游标未前进：${type}`);
      }
    }
    cursors = page.cursors;
  }
  return { counts, fingerprint: digest.digest("hex"), pages, snapshotConsistent: false };
}
