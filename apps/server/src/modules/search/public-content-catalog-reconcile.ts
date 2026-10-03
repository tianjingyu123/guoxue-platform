import { createHash } from "node:crypto";
import type { CatalogSource, PublicCatalogEntry } from "./public-content-catalog";

/** 目录快照只含可公开元数据，不含正文或媒资地址。 */
export interface CatalogSnapshotEntry extends PublicCatalogEntry {
  contentHash: string;
}

export interface CatalogReconciliation {
  upserts: CatalogSnapshotEntry[];
  withdraws: Array<{ sourceType: CatalogSource; sourceId: string }>;
  unchanged: number;
}

export interface ReconcileScope {
  /** 只有确认这些类型在指定分站范围内全量扫描完成，才能产生撤回计划。 */
  completeSourceTypes: readonly CatalogSource[];
  /** null 为平台总目录；分站数据须用具体 ID 单独对账。 */
  stationId: string | null;
}

const catalogKey = (row: Pick<PublicCatalogEntry, "sourceType" | "sourceId">) =>
  `${row.sourceType}:${row.sourceId}`;

/**
 * 只对用户可见的目录元数据计算版本。浏览量引发的 updatedAt 变化不应触发重建。
 * 标签顺序不影响匹配；展示顺序仍保留来源原值。
 */
export function catalogContentHash(entry: PublicCatalogEntry): string {
  const payload = {
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    title: entry.title,
    summary: entry.summary,
    cover: entry.cover || null,
    tags: [...new Set(entry.tags)].sort(),
    target: entry.target,
    stationId: entry.stationId,
    circleId: entry.circleId,
    commercialType: entry.commercialType,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * 仅生成对账计划，不写数据库。
 * 撤回必须由调用方声明哪些类型已完成全量扫描；分页样本/超时/断点扫描不可宣称完整。
 */
export function reconcileCatalogSnapshot(
  existing: CatalogSnapshotEntry[],
  current: PublicCatalogEntry[],
  scope?: ReconcileScope,
): CatalogReconciliation {
  const oldByKey = new Map<string, CatalogSnapshotEntry>();
  for (const row of existing) {
    const key = catalogKey(row);
    if (oldByKey.has(key)) throw new Error(`目录快照来源重复：${key}`);
    oldByKey.set(key, row);
  }

  const currentKeys = new Set<string>();
  const upserts: CatalogSnapshotEntry[] = [];
  let unchanged = 0;
  for (const row of current) {
    const key = catalogKey(row);
    if (currentKeys.has(key)) throw new Error(`本次扫描来源重复：${key}`);
    currentKeys.add(key);
    const contentHash = catalogContentHash(row);
    if (oldByKey.get(key)?.contentHash === contentHash) unchanged++;
    else upserts.push({ ...row, contentHash });
  }

  const complete = new Set(scope?.completeSourceTypes || []);
  if (scope) {
    for (const row of current) {
      if (complete.has(row.sourceType) && row.stationId !== scope.stationId) {
        throw new Error(`完整扫描范围与来源分站不符：${catalogKey(row)}`);
      }
    }
  }
  const withdraws = existing
    .filter((row) => scope && complete.has(row.sourceType) && row.stationId === scope.stationId
      && !currentKeys.has(catalogKey(row)))
    .map(({ sourceType, sourceId }) => ({ sourceType, sourceId }));
  return { upserts, withdraws, unchanged };
}
