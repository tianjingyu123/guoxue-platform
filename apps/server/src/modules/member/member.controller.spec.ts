import { Test, TestingModule } from "@nestjs/testing";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";
import { MemberBenefitService } from "./member-benefit.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";

const mockRedis = { incrWithTtl: jest.fn().mockResolvedValue(1) };
const mockSystemSvc = { logAudit: jest.fn().mockResolvedValue(undefined) };
const mockMemberBenefit = {
  isActiveMember: jest.fn().mockResolvedValue(false),
  consumeAiQuota: jest.fn().mockResolvedValue({ isMember: false, remaining: 9 }),
  getAiQuota: jest.fn().mockResolvedValue({ isMember: false, dailyLimit: 10, usedToday: 0, remaining: 10 }),
  grantMonthlyBenefits: jest.fn().mockResolvedValue(true),
};
const mockService = {
  getPlans: jest.fn().mockResolvedValue([{ id: "1", level: "MONTHLY", name: "月度会员", price: 29 }]),
  purchase: jest.fn().mockResolvedValue({ id: "p1", level: "MONTHLY", amount: 29, expireAt: null }),
  getStatus: jest.fn().mockResolvedValue({ memberLevel: "MONTHLY", isActive: true, remainingDays: 15 }),
  renew: jest.fn().mockResolvedValue({ id: "p2", level: "MONTHLY", amount: 29, expireAt: null }),
  getBenefits: jest.fn().mockResolvedValue({ level: "MONTHLY", benefits: ["折扣", "免邮"] }),
  getMyPurchases: jest.fn().mockResolvedValue({ items: [{ id: "p1" }], total: 1, page: 1, pageSize: 20 }),
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
        { provide: MemberBenefitService, useValue: mockMemberBenefit },
        { provide: RedisService, useValue: mockRedis },
        { provide: SystemService, useValue: mockSystemSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
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

    it("POST purchase/:planId → 已停用（资金安全：不校验支付即开通，改走订单支付链路）", async () => {
      const req = { user: { id: "u1" } } as any;
      expect(() => ctrl.purchase(req, "plan1")).toThrow(/在线支付/);
      expect(mockService.purchase).not.toHaveBeenCalled();
    });

    it("GET status → 查询会员状态", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getStatus(req);
      expect(res.isActive).toBe(true);
      expect(mockService.getStatus).toHaveBeenCalledWith("u1");
    });

    it("POST renew/:planId → 已停用（与 purchase 同因改走订单支付链路）", async () => {
      const req = { user: { id: "u1" } } as any;
      expect(() => ctrl.renew(req, "plan2")).toThrow(/在线支付/);
      expect(mockService.renew).not.toHaveBeenCalled();
    });

    it("GET benefits → 获取会员权益", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getBenefits(req);
      expect(res.benefits).toContain("折扣");
      expect(mockService.getBenefits).toHaveBeenCalledWith("u1");
    });

    it("GET ai-quota → 我的 AI 伴读额度（直通 benefitService）", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getAiQuota(req);
      expect(res).toEqual({ isMember: false, dailyLimit: 10, usedToday: 0, remaining: 10 });
      expect(mockMemberBenefit.getAiQuota).toHaveBeenCalledWith("u1");
    });

    it("GET purchases → 我的会员购买记录（直通 memberService）", async () => {
      const req = { user: { id: "u1" } } as any;
      const res = await ctrl.getMyPurchases(req, 1, 20);
      expect(res.total).toBe(1);
      expect(mockService.getMyPurchases).toHaveBeenCalledWith("u1", 1, 20);
    });
  });

  describe("管理员端点", () => {
    it("GET admin/purchases → 购买记录", async () => {
      const res = await ctrl.getAdminPurchases(1, 20);
      expect(res).toHaveProperty("items");
      expect(mockService.getAdminPurchases).toHaveBeenCalledWith(1, 20, {
        type: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it("GET admin/stats → 会员统计", async () => {
      const res = await ctrl.getMemberStats();
      expect(res.totalMembers).toBe(100);
      expect(mockService.getMemberStats).toHaveBeenCalled();
    });

    it("POST admin/grant → 手动授予会员", async () => {
      const req: any = { user: { id: "admin1" }, ip: "127.0.0.1" };
      const dto = { userId: "u1", level: "MONTHLY" as any, durationDays: 30 };
      const res = await ctrl.grantMember(dto, req);
      expect(res.userId).toBe("u1");
      expect(mockService.grantMember).toHaveBeenCalledWith("u1", "MONTHLY", 30);
    });

    it("POST admin/revoke/:userId → 撤销会员", async () => {
      const req: any = { user: { id: "admin1" }, ip: "127.0.0.1" };
      const res = await ctrl.revokeMember("u1", req);
      expect(res.revoked).toBe(true);
      expect(mockService.revokeMember).toHaveBeenCalledWith("u1");
    });
  });
});
