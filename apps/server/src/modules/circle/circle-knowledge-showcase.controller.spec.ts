import { HEADERS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { CircleKnowledgeShowcaseController } from "./circle-knowledge-showcase.controller";

describe("CircleKnowledgeShowcaseController 圈外公开入口", () => {
  it("公开响应禁止缓存，以便撤回后下次请求重新校验", () => {
    const handler = CircleKnowledgeShowcaseController.prototype.getPublicGraph;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(":circleId/knowledge-showcase");
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({
      name: "Cache-Control",
      value: "no-store",
    });
  });

  it("只委托已过滤的快照服务，不读取知识库原文", async () => {
    const result = { nodes: [], links: [] };
    const getPublicGraph = jest.fn().mockResolvedValue(result);
    const controller = new CircleKnowledgeShowcaseController(
      { getPublicGraph } as unknown as ConstructorParameters<typeof CircleKnowledgeShowcaseController>[0],
    );

    await expect(controller.getPublicGraph("circle-1")).resolves.toBe(result);
    expect(getPublicGraph).toHaveBeenCalledWith("circle-1");
  });
});
