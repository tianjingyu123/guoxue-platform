import type { PublicCatalogEntry } from "./public-content-catalog";
import { catalogContentHash, reconcileCatalogSnapshot } from "./public-content-catalog-reconcile";

const article: PublicCatalogEntry = {
  sourceType: "article", sourceId: "same-id", title: "论语导读", summary: "简介", cover: undefined,
  tags: ["论语", "入门"], target: "/pkg-circle/articles/detail?id=same-id", stationId: null,
  circleId: "circle-1", commercialType: "FREE", sourceUpdatedAt: new Date("2026-09-20"),
};
const course: PublicCatalogEntry = {
  ...article, sourceType: "course", title: "论语课程", circleId: null,
  target: "/pkg-course/detail/index?id=same-id", commercialType: "PAID",
};
const snapshot = (entry: PublicCatalogEntry) => ({ ...entry, contentHash: catalogContentHash(entry) });

describe("公开目录增量对账", () => {
  it("同 ID 不同来源可并存；显示元数据变化才更新版本", () => {
    const old = [snapshot(article), snapshot(course)];
    const result = reconcileCatalogSnapshot(old, [
      { ...article, tags: ["入门", "论语"], sourceUpdatedAt: new Date("2026-09-23") },
      { ...course, title: "论语精讲" },
    ]);
    expect(result.unchanged).toBe(1);
    expect(result.upserts).toHaveLength(1);
    expect(result.upserts[0].sourceType).toBe("course");
    expect(result.withdraws).toEqual([]);
  });

  it("抽样预览或中断扫描不能撤回未扫描到的内容", () => {
    const old = [snapshot(article), snapshot(course)];
    expect(reconcileCatalogSnapshot(old, []).withdraws).toEqual([]);
    const completeArticle = reconcileCatalogSnapshot(old, [], { completeSourceTypes: ["article"], stationId: null });
    expect(completeArticle.withdraws).toEqual([{ sourceType: "article", sourceId: "same-id" }]);
  });

  it("下架或撤权造成完整来源扫描缺席时，产生撤回计划", () => {
    const old = [snapshot(article), snapshot(course)];
    const result = reconcileCatalogSnapshot(old, [course], { completeSourceTypes: ["article", "course"], stationId: null });
    expect(result.withdraws).toEqual([{ sourceType: "article", sourceId: "same-id" }]);
    expect(result.unchanged).toBe(1);
  });

  it("同一来源重复输入必须拒绝，避免覆盖状态或错误撤回", () => {
    expect(() => reconcileCatalogSnapshot([], [article, article])).toThrow("本次扫描来源重复");
    expect(() => reconcileCatalogSnapshot([snapshot(article), snapshot(article)], [])).toThrow("目录快照来源重复");
  });

  it("平台总目录完整扫描不能撤回分站内容", () => {
    const stationArticle = snapshot({ ...article, sourceId: "station-article", stationId: "station-1" });
    const result = reconcileCatalogSnapshot([snapshot(article), stationArticle], [],
      { completeSourceTypes: ["article"], stationId: null });
    expect(result.withdraws).toEqual([{ sourceType: "article", sourceId: "same-id" }]);
    expect(() => reconcileCatalogSnapshot([], [stationArticle],
      { completeSourceTypes: ["article"], stationId: null })).toThrow("完整扫描范围");
  });
});
