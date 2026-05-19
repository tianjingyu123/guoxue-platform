import { Test } from "@nestjs/testing";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { TenantGuard } from "./tenant.guard";

const mockTenantSvc = {
  consume: jest.fn().mockResolvedValue({ remaining: 90 }),
  getQuota: jest.fn().mockResolvedValue({ total: 100, used: 10, remaining: 90 }),
};

describe("TenantController", () => {
  let ctrl: TenantController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        { provide: TenantService, useValue: mockTenantSvc },
      ],
    })
      .overrideGuard(TenantGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(TenantController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("POST /tenant/verify — 验证 API Key", async () => {
    const req: any = { tenant: { id: "t1", name: "测试租户" } };
    const result = await ctrl.verify(req);
    expect(result).toBeDefined();
    expect(result).toEqual({ id: "t1", name: "测试租户" });
  });

  it("POST /tenant/consume — 扣减租户配额", async () => {
    const req: any = {
      tenant: { id: "t1" },
      headers: { "x-forwarded-for": "192.168.1.1" },
      ip: "127.0.0.1",
    };
    const dto: any = { amount: 10 };
    const result = await ctrl.consume(req, dto);
    expect(result).toBeDefined();
    expect(mockTenantSvc.consume).toHaveBeenCalledWith("t1", dto, "192.168.1.1");
  });

  it("GET /tenant/quota — 查询租户剩余配额", async () => {
    const req: any = { tenant: { id: "t1" } };
    const result = await ctrl.getQuota(req);
    expect(result).toBeDefined();
    expect(mockTenantSvc.getQuota).toHaveBeenCalledWith("t1");
  });
});
