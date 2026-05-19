import { Test, TestingModule } from "@nestjs/testing";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { RedisService } from "../../redis/redis.service";

const mockRedis = { incrWithTtl: jest.fn().mockResolvedValue(1) };
const mockService = {
  getPlans: jest.fn().mockResolvedValue([{ id: "1", level: "MONTHLY", name: "月度会员", price: 29 }]),
  purchase: jest.fn().mockResolvedValue({ id: "p1", level: "MONTHLY", amount: 29, expireAt: null }),
  getStatus: jest.fn().mockResolvedValue({ memberLevel: "MONTHLY", isActive: true, remainingDays: 15 }),
  renew: jest.fn().mockResolvedValue({ id: "p2", level: "MONTHLY", amount: 29, expireAt: null }),
  getBenefits: jest.fn().mockResolvedValue({ level: "MONTHLY", benefits: ["折扣", "免邮"] }),
  getAdminPurchases: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  getMemberStats: jest.fn().mockResolvedValue({ totalMembers: 100, totalRevenue: 5000, byLevel: {} }),
  grantMember: jest.fn().mockResolvedValue({ userId: "u1", level: "MONTHLY", expireAt: null }),
  revokeMember: jest.fn().mockResolvedValue({ userId: "u1", revoked: true }),
};

describe("MemberController", () => {
  let ctrl: MemberController;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        { provide: MemberService, useValue: mockService },
        { provide: RedisService, useValue: mockRedis },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MemberController);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("用户端点", () => {
    it("GET plans → 获取套餐列表", async () => {
      const res = await ctrl.getPlans();
      expect(res).toEqual([{ id: "1", level: "MONTHLY", name: "月度会员", price: 29 }]);
      expect(mockService.getPlans).toHaveBeenCalled();
    });

    it("POST purchase/:planId → 购买会员", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.purchase(req, "plan1");
      expect(res).toHaveProperty("id");
      expect(mockService.purchase).toHaveBeenCalledWith("u1", "plan1");
    });

    it("GET status → 查询会员状态", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getStatus(req);
      expect(res.isActive).toBe(true);
      expect(mockService.getStatus).toHaveBeenCalledWith("u1");
    });

    it("POST renew/:planId → 续费会员", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.renew(req, "plan2");
      expect(res).toHaveProperty("id");
      expect(mockService.renew).toHaveBeenCalledWith("u1", "plan2");
    });

    it("GET benefits → 获取会员权益", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getBenefits(req);
      expect(res.benefits).toContain("折扣");
      expect(mockService.getBenefits).toHaveBeenCalledWith("u1");
    });
  });

  describe("管理员端点", () => {
    it("GET admin/purchases → 购买记录", async () => {
      const res = await ctrl.getAdminPurchases(1, 20);
      expect(res).toHaveProperty("items");
      expect(mockService.getAdminPurchases).toHaveBeenCalledWith(1, 20);
    });

    it("GET admin/stats → 会员统计", async () => {
      const res = await ctrl.getMemberStats();
      expect(res.totalMembers).toBe(100);
      expect(mockService.getMemberStats).toHaveBeenCalled();
    });

    it("POST admin/grant → 手动授予会员", async () => {
      const dto = { userId: "u1", level: "MONTHLY" as any, durationDays: 30 };
      const res = await ctrl.grantMember(dto);
      expect(res.userId).toBe("u1");
      expect(mockService.grantMember).toHaveBeenCalledWith("u1", "MONTHLY", 30);
    });

    it("POST admin/revoke/:userId → 撤销会员", async () => {
      const res = await ctrl.revokeMember("u1");
      expect(res.revoked).toBe(true);
      expect(mockService.revokeMember).toHaveBeenCalledWith("u1");
    });
  });
});
