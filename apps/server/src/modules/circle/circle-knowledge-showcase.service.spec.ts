import { CircleKnowledgeShowcaseService } from "./circle-knowledge-showcase.service";

describe("CircleKnowledgeShowcaseService 圈外公开闸门", () => {
  const queryRaw = jest.fn();
  const service = new CircleKnowledgeShowcaseService(
    { $queryRaw: queryRaw } as unknown as ConstructorParameters<typeof CircleKnowledgeShowcaseService>[0],
  );

  beforeEach(() => queryRaw.mockReset());

  it("没有审核通过的节点时返回空图，不读取关系", async () => {
    queryRaw.mockResolvedValueOnce([]);

    await expect(service.getPublicGraph("circle-1")).resolves.toEqual({ nodes: [], links: [] });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("只投影已选节点及两端均在公开集合的关系", async () => {
    queryRaw
      .mockResolvedValueOnce([
        { id: "n1", name: "仁者爱人", summary: "具体知识点" },
        { id: "n2", name: "己所不欲", summary: "关联知识点" },
      ])
      .mockResolvedValueOnce([
        { id: "e1", fromId: "n1", toId: "n2", relation: "延伸" },
        { id: "e2", fromId: "n1", toId: "private-node", relation: "错误数据" },
      ]);

    await expect(service.getPublicGraph("circle-1")).resolves.toEqual({
      nodes: [
        { id: "n1", name: "仁者爱人", summary: "具体知识点" },
        { id: "n2", name: "己所不欲", summary: "关联知识点" },
      ],
      links: [{ id: "e1", source: "n1", target: "n2", relation: "延伸" }],
    });
  });

  it("数据库查询在服务端过滤圈子、审核、授权、源状态和撤回，不返回原文", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "n1", name: "仁者爱人", summary: "短摘要" }]);
    queryRaw.mockResolvedValueOnce([]);
    await service.getPublicGraph("circle-1");

    const nodeSql = (queryRaw.mock.calls[0][0] as string[]).join("");
    const edgeSql = (queryRaw.mock.calls[1][0] as { strings: string[] }).strings.join("");
    expect(queryRaw.mock.calls[0][1]).toBe("circle-1");
    expect(nodeSql).toContain('c."status" = \'ACTIVE\'');
    expect(nodeSql).toContain('k."status" = \'active\'');
    expect(nodeSql).toContain('k."contentHash" = n."sourceContentHash"');
    expect(nodeSql).toContain('n."rightsApprovedAt" IS NOT NULL');
    expect(nodeSql).toContain('n."reviewedAt" IS NOT NULL');
    expect(nodeSql).toContain('n."revokedAt" IS NULL');
    expect(nodeSql).not.toContain('k."content"');
    expect(edgeSql).toContain('e."reviewedAt" IS NOT NULL');
    expect(edgeSql).toContain('e."fromId" IN');
    expect(edgeSql).toContain('e."toId" IN');
  });
});
