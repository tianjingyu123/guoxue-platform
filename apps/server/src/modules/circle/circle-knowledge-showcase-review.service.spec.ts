import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CircleKnowledgeShowcaseReviewService } from "./circle-knowledge-showcase-review.service";

describe("CircleKnowledgeShowcaseReviewService 公开审核流程", () => {
  const queryRaw = jest.fn();
  const assertManager = jest.fn();
  const service = new CircleKnowledgeShowcaseReviewService(
    { $queryRaw: queryRaw } as unknown as ConstructorParameters<typeof CircleKnowledgeShowcaseReviewService>[0],
    { assertManager } as unknown as ConstructorParameters<typeof CircleKnowledgeShowcaseReviewService>[1],
  );

  beforeEach(() => {
    queryRaw.mockReset();
    assertManager.mockReset().mockResolvedValue(undefined);
  });

  it("提交节点仅生成草稿，来源须属于同圈且有效", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "new-node" }]);
    await expect(service.createNodeDraft("circle-1", "owner-1", {
      sourceKnowledgeId: "knowledge-1", name: "仁者爱人", summary: "简短介绍",
    })).resolves.toMatchObject({ status: "DRAFT" });
    expect(assertManager).toHaveBeenCalledWith("circle-1", "owner-1");
    const sql = (queryRaw.mock.calls[0][0] as string[]).join("");
    expect(sql).toContain('k."circleId" =');
    expect(sql).toContain('k."status" = \'active\'');
    expect(sql).toContain('k."contentHash"');
    expect(sql).toContain('c."status" = \'ACTIVE\'');
    expect(sql).not.toContain("PUBLISHED");
  });

  it("跨圈或失效来源不能生成草稿", async () => {
    queryRaw.mockResolvedValueOnce([]);
    await expect(service.createNodeDraft("circle-1", "owner-1", {
      sourceKnowledgeId: "other-knowledge", name: "题目", summary: "说明",
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("不接受空白授权依据或超长公开摘要", async () => {
    await expect(service.publishNode("circle-1", "n1", "admin-1", "  ")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createNodeDraft("circle-1", "owner-1", {
      sourceKnowledgeId: "k1", name: "题目", summary: "x".repeat(161),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("关系草稿拒绝自连，发布必须要求两端为同圈已公开节点", async () => {
    await expect(service.createEdgeDraft("circle-1", "owner-1", {
      fromId: "n1", toId: "n1", relation: "延伸",
    })).rejects.toBeInstanceOf(BadRequestException);
    queryRaw.mockResolvedValueOnce([{ id: "e1" }]);
    await expect(service.publishEdge("circle-1", "e1", "admin-1", "原文依据已核对"))
      .resolves.toEqual({ id: "e1", status: "PUBLISHED" });
    const sql = (queryRaw.mock.calls[0][0] as string[]).join("");
    expect(sql).toContain('a."circleId" = e."circleId"');
    expect(sql).toContain('b."circleId" = e."circleId"');
    expect(sql).toContain('a."status" = \'PUBLISHED\'');
    expect(sql).toContain('b."status" = \'PUBLISHED\'');
    expect(sql).toContain('ka."contentHash" = a."sourceContentHash"');
    expect(sql).toContain('kb."contentHash" = b."sourceContentHash"');
  });

  it("撤回记录操作者，公开查询将不再命中", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "n1" }]);
    await expect(service.revokeNode("circle-1", "n1", "admin-1"))
      .resolves.toEqual({ id: "n1", status: "REVOKED" });
    const sql = (queryRaw.mock.calls[0][0] as string[]).join("");
    expect(sql).toContain('"revokedBy" =');
    expect(queryRaw.mock.calls[0]).toContain("admin-1");
  });

  it("平台审核列表仅取本圈有效来源的短片段，草稿与已公开项可回看", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "k1", sourceType: "article", excerpt: "short" }]);
    queryRaw.mockResolvedValueOnce([{ id: "n1", status: "DRAFT" }]);
    queryRaw.mockResolvedValueOnce([{ id: "e1", status: "PUBLISHED" }]);
    await expect(service.listForReview("circle-1")).resolves.toMatchObject({
      sources: [{ id: "k1" }], nodes: [{ id: "n1" }], edges: [{ id: "e1" }],
    });
    const sourceSql = (queryRaw.mock.calls[0][0] as string[]).join("");
    expect(sourceSql).toContain('left("content", 120)');
    expect(sourceSql).toContain('"status" = \'active\'');
    expect(sourceSql).toContain('ORDER BY "addedAt" DESC, "id" DESC LIMIT');
    expect(queryRaw.mock.calls[0]).toContain("circle-1");
    expect(queryRaw.mock.calls[0]).toContain(51);
  });

  it("审核来源、节点和关系独立翻页，并限制非法页码", async () => {
    queryRaw.mockResolvedValueOnce(Array.from({ length: 51 }, (_, i) => ({ id: `k${i}` })));
    queryRaw.mockResolvedValueOnce([{ id: "n1" }]);
    queryRaw.mockResolvedValueOnce([{ id: "e1" }]);
    const result = await service.listForReview("circle-1", { sourcePage: "2", nodePage: "3", edgePage: "4" });
    expect(result.sources).toHaveLength(50);
    expect(result.hasMore).toEqual({ sources: true, nodes: false, edges: false });
    expect(result.pages).toEqual({ sourcePage: 2, nodePage: 3, edgePage: 4 });
    expect(queryRaw.mock.calls[0]).toContain(50);
    expect(queryRaw.mock.calls[1]).toContain(100);
    expect(queryRaw.mock.calls[2]).toContain(150);
    queryRaw.mockClear();
    await expect(service.listForReview("circle-1", { nodePage: "1.5" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listForReview("circle-1", { sourcePage: "0" })).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
