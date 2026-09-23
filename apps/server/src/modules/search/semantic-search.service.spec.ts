import { SemanticSearchService } from "./semantic-search.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

describe("SemanticSearchService 公开候选门禁", () => {
  const prisma = {
    article: { findMany: jest.fn().mockResolvedValue([]) },
    course: { findMany: jest.fn().mockResolvedValue([]) },
    circle: { findMany: jest.fn().mockResolvedValue([]) },
    content: { findMany: jest.fn().mockResolvedValue([]) },
    video: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const vector = { embed: jest.fn().mockResolvedValue([[1, 0]]) };
  const service = new SemanticSearchService(
    prisma as unknown as PrismaService,
    vector as unknown as VectorService,
  );

  beforeEach(() => jest.clearAllMocks());

  it("语义搜索只读取已审核公开、未删除或非私密候选", async () => {
    await service.search("论语");
    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null }),
    }));
    expect(prisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null }),
    }));
    expect(prisma.circle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "ACTIVE", deletedAt: null }),
    }));
    expect(prisma.content.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "PUBLISHED", deletedAt: null }),
    }));
    expect(prisma.video.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false }),
    }));
  });

  it("外部重排时问题与标题使用同一次 Embedding 的向量空间", async () => {
    prisma.content.findMany.mockResolvedValueOnce([
      { id: "first", title: "论语入门", excerpt: "", cover: null },
      { id: "second", title: "论语讲解", excerpt: "", cover: null },
    ]);
    vector.embed.mockResolvedValueOnce([[1, 0], [0, 1], [1, 0]]);

    const results = await service.search("论语", 2);
    expect(vector.embed).toHaveBeenCalledTimes(1);
    expect(vector.embed).toHaveBeenCalledWith(["论语", "论语入门", "论语讲解"]);
    expect(results.map((r) => r.id)).toEqual(["second", "first"]);
  });
});
