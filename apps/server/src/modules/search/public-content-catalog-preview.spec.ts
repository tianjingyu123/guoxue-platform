import type { PrismaClient } from "@prisma/client";
import { collectPublicCatalogPreview } from "./public-content-catalog-preview";

describe("只读公开目录预览", () => {
  it("六类来源仅查询安全元数据，限制单类条数，二次过滤返回值", async () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const findMany = jest.fn().mockResolvedValue([]);
    const articleFind = jest.fn().mockResolvedValue([
      { id: "ok", title: "公开文章", excerpt: "摘要", content: "私有正文", tags: [],
        visibility: "PLATFORM", auditStatus: "APPROVED", deletedAt: null, scheduledAt: null, createdAt: now },
      { id: "bad", title: "圈内文章", excerpt: "不应出现", visibility: "CIRCLE_ONLY",
        auditStatus: "APPROVED", deletedAt: null, createdAt: now },
    ]);
    const prisma = Object.fromEntries(
      ["article", "course", "video", "product", "circle", "classicBook"]
        .map((key) => [key, { findMany: key === "article" ? articleFind : findMany }]),
    ) as unknown as PrismaClient;

    const entries = await collectPublicCatalogPreview(prisma, 500, now);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceId).toBe("ok");
    expect(JSON.stringify(entries)).not.toContain("私有正文");
    expect(articleFind.mock.calls[0][0].take).toBe(50);
    expect(articleFind.mock.calls[0][0].where.stationId).toBeNull();
    expect(articleFind.mock.calls[0][0].select).not.toHaveProperty("content");
    expect(findMany).toHaveBeenCalledTimes(5);
    for (const [args] of findMany.mock.calls) {
      expect(args.select).not.toHaveProperty("body");
      expect(args.select).not.toHaveProperty("detail");
      expect(args.select).not.toHaveProperty("videoUrl");
    }
    const productQuery = findMany.mock.calls[2][0];
    expect(productQuery.where).toMatchObject({ stationId: null, circleId: null });
  });
});
