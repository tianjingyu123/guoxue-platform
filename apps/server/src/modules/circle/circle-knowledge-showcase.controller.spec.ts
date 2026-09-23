import { GUARDS_METADATA, HEADERS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ROLES_KEY } from "../../common/roles.decorator";
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
      {} as ConstructorParameters<typeof CircleKnowledgeShowcaseController>[1],
    );

    await expect(controller.getPublicGraph("circle-1")).resolves.toBe(result);
    expect(getPublicGraph).toHaveBeenCalledWith("circle-1");
  });

  it("草稿入口需要登录，发布和撤回还需要平台角色守卫", () => {
    const prototype = CircleKnowledgeShowcaseController.prototype;
    expect(Reflect.getMetadata(GUARDS_METADATA, prototype.createNodeDraft)).toContain(JwtAuthGuard);
    for (const handler of [prototype.createNodeDraftAsAdmin, prototype.createEdgeDraftAsAdmin, prototype.listForReview, prototype.publishNode, prototype.publishEdge, prototype.revokeNode, prototype.revokeEdge]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(["SUPER_ADMIN", "OPERATION_ADMIN"]);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, prototype.getPublicGraph)).toBeUndefined();
  });
});
