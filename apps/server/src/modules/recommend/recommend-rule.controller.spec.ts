import { Test } from "@nestjs/testing";
import { RecommendRuleController } from "./recommend-rule.controller";
import { RuleService } from "./services/rule.service";
import { RolesGuard } from "../../common/roles.guard";

const mockRuleSvc = {
  listRules: jest.fn().mockResolvedValue([{ id: "r1", scene: "ALL", ruleType: "BOOST", targetType: "COURSE", targetId: "c1", priority: 10 }]),
  getRule: jest.fn().mockResolvedValue({ id: "r1", scene: "ALL", ruleType: "BOOST", targetType: "COURSE", targetId: "c1", priority: 10 }),
  createRule: jest.fn().mockResolvedValue({ id: "r2", scene: "GUESS_LIKE", ruleType: "BAN", targetType: "ARTICLE", targetId: "a1" }),
  updateRule: jest.fn().mockResolvedValue({ id: "r1", scene: "GUESS_LIKE", ruleType: "BOOST" }),
  deleteRule: jest.fn().mockResolvedValue(undefined),
};

describe("RecommendRuleController", () => {
  let ctrl: RecommendRuleController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [RecommendRuleController],
      providers: [{ provide: RuleService, useValue: mockRuleSvc }],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(RecommendRuleController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /admin/recommend/rules — 获取所有推荐规则", async () => {
    const result = await ctrl.list();
    expect(result).toHaveLength(1);
    expect(result[0].ruleType).toBe("BOOST");
  });

  it("GET /admin/recommend/rules/:id — 获取规则详情", async () => {
    const result = await ctrl.detail("r1");
    expect(result.id).toBe("r1");
    expect(mockRuleSvc.getRule).toHaveBeenCalledWith("r1");
  });

  it("POST /admin/recommend/rules — 创建推荐规则", async () => {
    const dto: any = { targetType: "ARTICLE", targetId: "a1", ruleType: "BAN" };
    const result = await ctrl.create(dto);
    expect(result.ruleType).toBe("BAN");
    expect(mockRuleSvc.createRule).toHaveBeenCalledWith(dto);
  });

  it("PUT /admin/recommend/rules/:id — 更新推荐规则", async () => {
    const dto: any = { scene: "GUESS_LIKE" };
    const result = await ctrl.update("r1", dto);
    expect(result.scene).toBe("GUESS_LIKE");
    expect(mockRuleSvc.updateRule).toHaveBeenCalledWith("r1", dto);
  });

  it("DELETE /admin/recommend/rules/:id — 删除推荐规则", async () => {
    await ctrl.delete("r1");
    expect(mockRuleSvc.deleteRule).toHaveBeenCalledWith("r1");
  });
});
