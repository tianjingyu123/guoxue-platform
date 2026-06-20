import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { RenewalController } from "./renewal.controller";
import { RenewalService } from "./renewal.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockGuard: CanActivate = { canActivate: () => true };

describe("RenewalController", () => {
  let ctrl: RenewalController;
  let svc: jest.Mocked<RenewalService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [RenewalController],
      providers: [{ provide: RenewalService, useValue: {
        getMyEntitlements: jest.fn(),
        getMyRenewalHistory: jest.fn(),
        getExpiringUsers: jest.fn(),
        getAdminHistory: jest.fn(),
      }}],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(RenewalController);
    svc = mod.get(RenewalService) as jest.Mocked<RenewalService>;
  });

  beforeEach(() => jest.clearAllMocks());

  describe("getMyEntitlements", () => {
    it("返回用户权益", async () => {
      const entitlements = { type: "VIP", expireAt: "2026-12-31" };
      svc.getMyEntitlements.mockResolvedValue(entitlements as any);
      const result = await ctrl.getMyEntitlements({ user: { id: "u1" } } as any);
      expect(svc.getMyEntitlements).toHaveBeenCalledWith("u1");
      expect(result).toEqual(entitlements);
    });
  });

  describe("getMyRenewalHistory", () => {
    it("默认分页", async () => {
      svc.getMyRenewalHistory.mockResolvedValue({ items: [], total: 0 } as any);
      await ctrl.getMyRenewalHistory({ user: { id: "u1" } } as any);
      expect(svc.getMyRenewalHistory).toHaveBeenCalledWith("u1", 1, 20);
    });

    it("自定义分页 — 字符串转数字", async () => {
      svc.getMyRenewalHistory.mockResolvedValue({ items: [], total: 0 } as any);
      await ctrl.getMyRenewalHistory({ user: { id: "u1" } } as any, "3" as any, "5" as any);
      expect(svc.getMyRenewalHistory).toHaveBeenCalledWith("u1", 3, 5);
    });
  });

  describe("getExpiringUsers", () => {
    it("返回即将到期用户列表", async () => {
      svc.getExpiringUsers.mockResolvedValue([{ id: "u1", expireAt: "2026-07-01" }] as any);
      const result = await ctrl.getExpiringUsers();
      expect(result).toHaveLength(1);
    });
  });

  describe("getAdminHistory", () => {
    it("默认参数", async () => {
      svc.getAdminHistory.mockResolvedValue({ items: [], total: 0 } as any);
      await ctrl.getAdminHistory();
      expect(svc.getAdminHistory).toHaveBeenCalledWith(1, 20, undefined);
    });

    it("带筛选类型", async () => {
      svc.getAdminHistory.mockResolvedValue({ items: [], total: 0 } as any);
      await ctrl.getAdminHistory("2" as any, "10" as any, "VIP");
      expect(svc.getAdminHistory).toHaveBeenCalledWith(2, 10, "VIP");
    });
  });
});
