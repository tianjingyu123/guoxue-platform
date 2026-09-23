import { projectPublicCatalogEntry } from "./public-content-catalog";

const now = new Date("2026-09-23T12:00:00Z");
const base = { id: "item 1", title: "测试标题", intro: "公开简介", createdAt: now, updatedAt: now };

describe("公开内容目录投影", () => {
  it("只保留已审平台文章的安全元数据，不复制正文", () => {
    const row = { ...base, content: "不可进入目录的付费/私有正文", excerpt: "简要说明", tags: ["国学"],
      visibility: "PLATFORM", auditStatus: "APPROVED", deletedAt: null, scheduledAt: null, circleId: "circle-1" };
    const entry = projectPublicCatalogEntry("article", row, now);
    expect(entry).toMatchObject({ sourceType: "article", sourceId: "item 1", summary: "简要说明",
      target: "/pkg-circle/articles/detail?id=item%201", circleId: "circle-1" });
    expect(JSON.stringify(entry)).not.toContain(row.content);
    expect(projectPublicCatalogEntry("article", { ...row, visibility: "CIRCLE_ONLY" }, now)).toBeNull();
    expect(projectPublicCatalogEntry("article", { ...row, auditStatus: "PENDING" }, now)).toBeNull();
    expect(projectPublicCatalogEntry("article", { ...row, deletedAt: now }, now)).toBeNull();
    expect(projectPublicCatalogEntry("article", { ...row, scheduledAt: new Date("2026-09-24") }, now)).toBeNull();
  });

  it("课程按审核、定时上/下架过滤，价格只做展示类别", () => {
    const row = { ...base, visibility: "PLATFORM", auditStatus: "APPROVED", deletedAt: null,
      scheduledAt: null, scheduledOnAt: null, scheduledOffAt: null, price: "99.00" };
    expect(projectPublicCatalogEntry("course", row, now)?.commercialType).toBe("PAID");
    expect(projectPublicCatalogEntry("course", { ...row, scheduledOnAt: new Date("2026-09-24") }, now)).toBeNull();
    expect(projectPublicCatalogEntry("course", { ...row, scheduledOffAt: new Date("2026-09-22") }, now)).toBeNull();
  });

  it("视频、商品和圈子均有独立上架门禁", () => {
    const video = { ...base, status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false };
    expect(projectPublicCatalogEntry("video", video, now)?.sourceType).toBe("video");
    expect(projectPublicCatalogEntry("video", { ...video, isPrivate: true }, now)).toBeNull();
    expect(projectPublicCatalogEntry("video", { ...video, status: "HIDDEN" }, now)).toBeNull();
    expect(projectPublicCatalogEntry("product", { ...base, status: "ON_SALE", deletedAt: null, images: ["cover"] }, now)?.cover).toBe("cover");
    expect(projectPublicCatalogEntry("product", { ...base, status: "OFF_SHELF", deletedAt: null }, now)).toBeNull();
    expect(projectPublicCatalogEntry("circle", { ...base, name: "测试圈", status: "ACTIVE", deletedAt: null }, now)?.title).toBe("测试圈");
    expect(projectPublicCatalogEntry("circle", { ...base, name: "测试圈", status: "PENDING", deletedAt: null }, now)).toBeNull();
  });

  it("古籍无已审核商用许可则不进目录；平台内容仅公开已发布项", () => {
    const classic = { ...base, status: "PUBLISHED", deletedAt: null,
      copyrights: [{ license: "CC-BY-NC-4.0", auditedAt: now }] };
    expect(projectPublicCatalogEntry("classic", classic, now)).toBeNull();
    expect(projectPublicCatalogEntry("classic", { ...classic, copyrights: [{ license: "CC-BY-4.0", auditedAt: null }] }, now)).toBeNull();
    expect(projectPublicCatalogEntry("classic", { ...classic, copyrights: [{ license: "CC-BY-4.0", auditedAt: now }] }, now)?.sourceType).toBe("classic");
    expect(projectPublicCatalogEntry("content", { ...base, status: "PUBLISHED", deletedAt: null }, now)?.sourceType).toBe("content");
    expect(projectPublicCatalogEntry("content", { ...base, status: "DRAFT", deletedAt: null }, now)).toBeNull();
  });
});
