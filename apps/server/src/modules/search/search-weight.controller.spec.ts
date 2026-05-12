import { Test } from "@nestjs/testing";
import { SearchWeightController } from "./search-weight.controller";
import { SearchWeightService } from "./search-weight.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockWeightSvc = {
  list: jest.fn().mockResolvedValue([{ id: "w1", entityType: "article", fieldName: "title", weight: 1.0 }]),
  upsert: jest.fn().mockResolvedValue({ id: "w1", entityType: "article", fieldName: "title", weight: 2.0 }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  seedDefaults: jest.fn().mockResolvedValue({ count: 10 }),
};

describe("SearchWeightController", () => {
  let ctrl: SearchWeightController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SearchWeightController],
      providers: [{ provide: SearchWeightService, useValue: mockWeightSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(SearchWeightController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /search/weights — 权重列表", async () => {
    const result: any = await ctrl.list("article");
    expect(result).toHaveLength(1);
    expect(mockWeightSvc.list).toHaveBeenCalledWith("article");
  });

  it("POST /search/weights — 创建/更新权重", async () => {
    const body = { entityType: "article", fieldName: "title", weight: 2.0 };
    const result: any = await ctrl.upsert(body);
    expect(result.weight).toBe(2.0);
    expect(mockWeightSvc.upsert).toHaveBeenCalledWith(body);
  });

  it("DELETE /search/weights/:id — 删除权重", async () => {
    const result: any = await ctrl.delete("w1");
    expect(result.success).toBe(true);
    expect(mockWeightSvc.delete).toHaveBeenCalledWith("w1");
  });

  it("POST /search/weights/seed — 初始化默认权重", async () => {
    const result: any = await ctrl.seedDefaults();
    expect(result.count).toBe(10);
    expect(mockWeightSvc.seedDefaults).toHaveBeenCalled();
  });
});
