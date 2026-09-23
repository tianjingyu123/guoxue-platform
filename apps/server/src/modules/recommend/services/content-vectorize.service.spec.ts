import { ContentVectorizeService } from "./content-vectorize.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { HunyuanEmbeddingService } from "../../ai-gateway/hunyuan-embedding.service";

const vector = [0.2, 0.4];
const row = { id: "new", title: "公开文章", content: "正文", excerpt: "简介" };

function makeService(initial: Array<{ id: string; type: string; vector: number[] }>, articleRows = [row]) {
  let stored = initial;
  const empty = jest.fn().mockResolvedValue([]);
  const article = jest.fn().mockImplementation(({ skip }: { skip: number }) => Promise.resolve(skip ? [] : articleRows));
  const prisma = {
    article: { findMany: article }, video: { findMany: empty }, course: { findMany: empty },
    product: { findMany: empty }, circle: { findMany: empty }, classicBook: { findMany: empty },
  };
  const redis = {
    getJson: jest.fn().mockImplementation(() => Promise.resolve(stored)),
    setJson: jest.fn().mockImplementation((_key, value) => { stored = value; return Promise.resolve(); }),
  };
  const hunyuan = { isEnabled: true, embedBatch: jest.fn().mockResolvedValue([vector]) };
  const service = new ContentVectorizeService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    hunyuan as unknown as HunyuanEmbeddingService,
  );
  return { service, prisma, hunyuan, getStored: () => stored };
}

describe("ContentVectorizeService", () => {
  it("新算额度用尽时不误删未完整扫描类型的向量", async () => {
    const { service, getStored } = makeService([
      { type: "ARTICLE", id: "old", vector },
      { type: "COURSE", id: "keep", vector },
    ]);
    const result = await service.reconcile(1);
    expect(result).toEqual({ added: 1, removed: 0, total: 3 });
    expect(getStored().map((item) => `${item.type}:${item.id}`)).toEqual([
      "ARTICLE:old", "COURSE:keep", "ARTICLE:new",
    ]);
  });

  it("完整扫描后清除不再符合公开条件的旧向量", async () => {
    const { service, getStored } = makeService([
      { type: "ARTICLE", id: "old", vector },
      { type: "ARTICLE", id: "new", vector },
    ]);
    const result = await service.reconcile(1);
    expect(result.removed).toBe(1);
    expect(getStored().map((item) => item.id)).toEqual(["new"]);
  });

  it("公开向量候选排除圈内、私有、删除及隔离内容", async () => {
    const { service, prisma } = makeService([]);
    await service.reconcile(1);
    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null, id: expect.objectContaining({ notIn: expect.any(Array) }) }),
    }));
    expect(prisma.video.findMany).not.toHaveBeenCalled();

    const emptyService = makeService([], []);
    await emptyService.service.reconcile(1);
    expect(emptyService.prisma.video.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false }),
    }));
    expect(emptyService.prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null }),
    }));
    expect(emptyService.prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "ON_SALE", deletedAt: null }),
    }));
    expect(emptyService.prisma.circle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "ACTIVE", deletedAt: null }),
    }));
  });

  it("增量向量化按指定 ID 精确读取较早内容，不受最新 1000 条窗口限制", async () => {
    const older = { id: "older", title: "早期文章", content: "正文", excerpt: "简介" };
    const { service, prisma, getStored } = makeService([], [older]);
    await service.onContentApproved("ARTICLE", "older");
    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: expect.objectContaining({ equals: "older", notIn: expect.any(Array) }),
        auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null,
      }),
      skip: 0,
      take: 1,
    }));
    expect(getStored()).toEqual([{ id: "older", type: "ARTICLE", vector }]);
  });
});
