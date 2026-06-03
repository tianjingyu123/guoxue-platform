import { Test } from "@nestjs/testing";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { UnifiedPricingService } from "./unified-pricing.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockPricingSvc = {
  calculatePrice: jest.fn().mockResolvedValue({ finalPrice: 50, originalPrice: 100, discount: 0.5 }),
  listRules: jest.fn().mockResolvedValue([{ id: "r1", name: "规则1" }]),
  createRule: jest.fn().mockResolvedValue({ id: "r1", name: "新规则" }),
  updateRule: jest.fn().mockResolvedValue({ id: "r1", name: "更新规则" }),
  deleteRule: jest.fn().mockResolvedValue({ success: true }),
  getDemandHeatmap: jest.fn().mockResolvedValue({ data: [], total: 0 }),
};

const mockUnifiedPricingSvc = {
  calculateEffectivePrice: jest.fn().mockResolvedValue({ effectivePrice: 99 }),
  batchCalculateEffectivePrice: jest.fn().mockResolvedValue([]),
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
      .compile();
    ctrl = mod.get(PricingController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("GET /pricing/calc-price — 计算动态价格", async () => {
    const result = await ctrl.calcPrice("consultation", "c1", "100");
    expect(result).toBeDefined();
    expect(mockPricingSvc.calculatePrice).toHaveBeenCalledWith("consultation", "c1", undefined, 100);
  });

  it("GET /pricing/admin/rules — 定价规则列表", async () => {
    const result = await ctrl.listRules();
    expect(result).toBeDefined();
    expect(mockPricingSvc.listRules).toHaveBeenCalled();
  });

  it("POST /pricing/admin/rules — 创建定价规则", async () => {
    const body: any = { name: "新规则", type: "discount" };
    const result = await ctrl.createRule(body);
    expect(result).toBeDefined();
    expect(mockPricingSvc.createRule).toHaveBeenCalledWith(body);
  });

  it("PUT /pricing/admin/rules/:id — 更新规则", async () => {
    const body: any = { name: "更新规则" };
    const result = await ctrl.updateRule("r1", body);
    expect(result).toBeDefined();
    expect(mockPricingSvc.updateRule).toHaveBeenCalledWith("r1", body);
  });

  it("DELETE /pricing/admin/rules/:id — 删除规则", async () => {
    const result = await ctrl.deleteRule("r1");
    expect(result).toBeDefined();
    expect(mockPricingSvc.deleteRule).toHaveBeenCalledWith("r1");
  });

  it("GET /pricing/admin/demand — 需求热力图", async () => {
    const result = await ctrl.getDemand();
    expect(result).toBeDefined();
    expect(mockPricingSvc.getDemandHeatmap).toHaveBeenCalled();
  });
});
