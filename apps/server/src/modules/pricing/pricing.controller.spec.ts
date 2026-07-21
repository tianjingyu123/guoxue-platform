import { GoneException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockPricingSvc = {
  listRules: jest.fn().mockResolvedValue([{ id: "r1", name: "历史规则" }]),
  getDemandHeatmap: jest.fn().mockResolvedValue({ data: [], total: 0 }),
};

const mockUnifiedPricingSvc = {
  calculateEffectivePrice: jest.fn().mockResolvedValue({ effectivePrice: 99 }),
  batchCalculateEffectivePrice: jest.fn().mockResolvedValue([{ productId: "p1", effectivePrice: 99 }]),
};

describe("PricingController", () => {
  let ctrl: PricingController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        { provide: PricingService, useValue: mockPricingSvc },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricingSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(PricingController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("控制器可正常创建", () => {
    expect(ctrl).toBeDefined();
  });

  it("商品统一价格仍走真实统一计价服务", async () => {
    await expect(ctrl.getUnifiedPrice("p1", "sku1", "page1", "mall")).resolves.toEqual({ effectivePrice: 99 });
    expect(mockUnifiedPricingSvc.calculateEffectivePrice).toHaveBeenCalledWith(
      "p1",
      "sku1",
      undefined,
      { pageId: "page1", scene: "mall" },
    );
  });

  it("批量统一价格仍走真实统一计价服务", async () => {
    const body = { items: [{ productId: "p1" }], pageId: "page1", scene: "mall" };
    await expect(ctrl.batchUnifiedPrice(body)).resolves.toEqual({
      items: [{ productId: "p1", effectivePrice: 99 }],
    });
    expect(mockUnifiedPricingSvc.batchCalculateEffectivePrice).toHaveBeenCalledWith(
      body.items,
      undefined,
      { pageId: "page1", scene: "mall" },
    );
  });

  it("旧动态价格试算明确返回 410", () => {
    expect(() => ctrl.calcPrice()).toThrow(GoneException);
  });

  it("旧规则历史记录仍可只读查询", async () => {
    await expect(ctrl.listRules()).resolves.toEqual([{ id: "r1", name: "历史规则" }]);
    expect(mockPricingSvc.listRules).toHaveBeenCalled();
  });

  it.each([
    ["创建", () => ctrl.createRule()],
    ["更新", () => ctrl.updateRule()],
    ["删除", () => ctrl.deleteRule()],
  ])("旧规则%s入口明确返回 410 且不写库", (_label, action) => {
    expect(action).toThrow(GoneException);
  });

  it("需求热力图仍保持只读可用", async () => {
    const result = await ctrl.getDemand();
    expect(result).toBeDefined();
    expect(mockPricingSvc.getDemandHeatmap).toHaveBeenCalled();
  });
});
