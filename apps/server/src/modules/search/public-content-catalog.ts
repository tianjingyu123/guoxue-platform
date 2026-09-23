import { isPublicContentQuarantined } from "../../common/public-content-quarantine";
import { COMMERCIAL_CLASSIC_LICENSES } from "../classic/classic-publication-policy";

/** 统一公开目录的只读投影；事实与访问权限仍以各业务表/详情接口为准。 */
export type CatalogSource = "article" | "course" | "video" | "product" | "circle" | "classic";

export interface PublicCatalogEntry {
  sourceType: CatalogSource;
  sourceId: string;
  title: string;
  summary: string;
  cover?: string;
  tags: string[];
  target: string;
  /** 仅用于目录区分，不代表跨分站可访问。 */
  stationId: string | null;
  circleId: string | null;
  commercialType: "FREE" | "PAID" | "PRODUCT" | "CIRCLE";
  sourceUpdatedAt: Date;
}

type SourceRecord = Record<string, unknown>;

const TARGETS: Record<CatalogSource, string> = {
  article: "/pkg-circle/articles/detail",
  course: "/pkg-course/detail/index",
  video: "/pkg-video/detail/index",
  product: "/pkg-mall/product/detail",
  circle: "/pkg-circle/circles/detail",
  classic: "/pkg-classics/detail/index",
};

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const date = (value: unknown): Date | null => value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
const isPast = (value: unknown, now: Date): boolean => !value || (date(value)?.getTime() ?? Infinity) <= now.getTime();
const isFuture = (value: unknown, now: Date): boolean => !value || (date(value)?.getTime() ?? -Infinity) > now.getTime();
const isClear = (value: unknown): boolean => value == null;

/**
 * 第二道准入门：即使上游查询漏加过滤，也不允许私有、下架、未授权内容进入公开目录预览。
 * 古籍必须传入至少一条已审计、可商用的版权记录；素材图片仍需单独确认授权。
 */
export function projectPublicCatalogEntry(
  sourceType: CatalogSource,
  row: SourceRecord,
  now = new Date(),
): PublicCatalogEntry | null {
  const id = text(row.id);
  const title = text(sourceType === "circle" ? row.name : row.title);
  if (!id || !title || !date(now)) return null;
  if (["article", "course", "video", "product", "circle"].includes(sourceType)
    && isPublicContentQuarantined(sourceType as "article" | "course" | "video" | "product" | "circle", id)) return null;

  const platformVisible = row.visibility === "PLATFORM" && row.auditStatus === "APPROVED";
  switch (sourceType) {
    case "article":
      if (!platformVisible || !isClear(row.deletedAt) || !isPast(row.scheduledAt, now)) return null;
      break;
    case "course":
      if (!platformVisible || !isClear(row.deletedAt) || !isPast(row.scheduledAt, now)
        || !isPast(row.scheduledOnAt, now) || !isFuture(row.scheduledOffAt, now)) return null;
      break;
    case "video":
      if (!platformVisible || row.status !== "PUBLISHED" || row.isPrivate !== false) return null;
      break;
    case "product":
      if (row.status !== "ON_SALE" || !isClear(row.deletedAt)) return null;
      break;
    case "circle":
      if (row.status !== "ACTIVE" || !isClear(row.deletedAt)) return null;
      break;
    case "classic": {
      if (row.status !== "PUBLISHED" || !isClear(row.deletedAt)) return null;
      const copyrights = Array.isArray(row.copyrights) ? row.copyrights : [];
      if (!copyrights.some((right) => right && typeof right === "object"
        && COMMERCIAL_CLASSIC_LICENSES.includes((right as SourceRecord).license as typeof COMMERCIAL_CLASSIC_LICENSES[number])
        && !!date((right as SourceRecord).auditedAt))) return null;
      break;
    }
  }

  const summary = text(sourceType === "article" ? row.excerpt
    : sourceType === "video" ? row.description
      : sourceType === "classic" || sourceType === "circle" || sourceType === "product" ? row.intro : row.intro);
  const rawTags = Array.isArray(row.tags) ? row.tags : [];
  const price = Number(row.price || 0);
  return {
    sourceType,
    sourceId: id,
    title,
    summary: summary.slice(0, 240),
    cover: text(sourceType === "video" ? row.coverUrl : sourceType === "product"
      ? (Array.isArray(row.images) ? row.images[0] : undefined) : row.cover) || undefined,
    tags: rawTags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim()).map((tag) => tag.trim()).slice(0, 12),
    target: `${TARGETS[sourceType]}?id=${encodeURIComponent(id)}`,
    stationId: text(row.stationId) || null,
    circleId: text(row.circleId) || null,
    commercialType: sourceType === "product" ? "PRODUCT" : sourceType === "circle" ? "CIRCLE"
      : sourceType === "course" && Number.isFinite(price) && price > 0 ? "PAID" : "FREE",
    sourceUpdatedAt: date(row.updatedAt) || date(row.createdAt) || now,
  };
}
