import { CircleMembershipService } from "./circle-membership.service";
import { BusinessException } from "../../../common/business.exception";

/**
 * #34 续费折扣（配置驱动·默认关闭零行为变化）单测。
 * 直接实例化 CircleMembershipService（mock prisma/redis/pricing/shared），只测 renew 相关路径。
 */

function buildMocks() {
  const prisma = {
    circle: { findUnique: jest.fn() },
    circleMember: { findUnique: jest.fn(), update: jest.fn() },
    configSystem: { findUnique: jest.fn() },
    order: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const redis = { del: jest.fn() };
  const pricing = { calculateTargetPrice: jest.fn() };
  const shared = {};
  const svc = new CircleMembershipService(
    prisma as never,
    redis as never,
    pricing as never,
    shared as never,
  );
  return { svc, prisma, redis, pricing };
}

const YEARLY_CIRCLE = { id: "c1", status: "ACTIVE", type: "YEARLY" };
const MEMBER = { id: "m1", circleId: "c1", userId: "u1", expireAt: null };

describe("CircleMembershipService · #34 续费折扣", () => {
  it("折扣关闭（无配置行·默认）：续费订单按原价，quantity=1", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.circleMember.findUnique.mockResolvedValue(MEMBER);
    prisma.configSystem.findUnique.mockResolvedValue(null); // 未配置=关闭
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 365, originalPrice: 365 });
    prisma.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "o1", ...data }));

    const r = await svc.renewCircle("c1", "u1", { payMethod: "WECHAT" });
    expect(r.priceYuan).toBe(365);
    expect(r.originalPriceYuan).toBe(365);
    expect(r.discountApplied).toBe(false);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 365, payAmount: 365, quantity: 1 }) }),
    );
  });

  it("折扣开启：1 年按 renewRate 打折（365×0.8=292），订单记折后价+划线原价", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.circleMember.findUnique.mockResolvedValue(MEMBER);
    prisma.configSystem.findUnique.mockResolvedValue({
      configValue: JSON.stringify({ enabled: true, renewRate: 0.8, twoYearRate: 0.75 }),
    });
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 365, originalPrice: 365 });
    prisma.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "o1", ...data }));

    const r = await svc.renewCircle("c1", "u1", { payMethod: "WECHAT" });
    expect(r.priceYuan).toBe(292);
    expect(r.originalPriceYuan).toBe(365);
    expect(r.discountApplied).toBe(true);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 292, originalAmount: 365 }) }),
    );
  });

  it("折扣开启 years=2：按 twoYearRate（365×2×0.75=547.5），quantity=2", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.circleMember.findUnique.mockResolvedValue(MEMBER);
    prisma.configSystem.findUnique.mockResolvedValue({
      configValue: JSON.stringify({ enabled: true, renewRate: 0.8, twoYearRate: 0.75 }),
    });
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 365, originalPrice: 365 });
    prisma.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "o1", ...data }));

    const r = await svc.renewCircle("c1", "u1", { payMethod: "WECHAT", years: 2 });
    expect(r.priceYuan).toBe(547.5);
    expect(r.originalPriceYuan).toBe(730);
    expect(r.years).toBe(2);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 2, amount: 547.5 }) }),
    );
  });

  it("配置 JSON 损坏 → 视为关闭按原价（防御回落）", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.circleMember.findUnique.mockResolvedValue(MEMBER);
    prisma.configSystem.findUnique.mockResolvedValue({ configValue: "{损坏的json" });
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 200, originalPrice: 200 });
    prisma.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "o1", ...data }));

    const r = await svc.renewCircle("c1", "u1", { payMethod: "ALIPAY" });
    expect(r.priceYuan).toBe(200);
    expect(r.discountApplied).toBe(false);
  });

  it("非法比例（>1）回落默认比例", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.circleMember.findUnique.mockResolvedValue(MEMBER);
    prisma.configSystem.findUnique.mockResolvedValue({
      configValue: JSON.stringify({ enabled: true, renewRate: 1.5 }), // 非法 → 回落 0.8
    });
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 100, originalPrice: 100 });
    prisma.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "o1", ...data }));

    const r = await svc.renewCircle("c1", "u1", { payMethod: "WECHAT" });
    expect(r.priceYuan).toBe(80);
  });

  it("renewQuote：关闭时 priceYuan === originalPriceYuan，并带两年档报价", async () => {
    const { svc, prisma, pricing } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    prisma.configSystem.findUnique.mockResolvedValue(null);
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 365, originalPrice: 365 });

    const q = await svc.renewQuote("c1", "u1");
    expect(q.priceYuan).toBe(q.originalPriceYuan);
    expect(q.discountEnabled).toBe(false);
    expect(q.twoYear.originalPriceYuan).toBe(730);
    expect(q.twoYear.priceYuan).toBe(730);
  });

  it("renewQuote：非年费圈拒绝", async () => {
    const { svc, prisma } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
    await expect(svc.renewQuote("c1", "u1")).rejects.toThrow(BusinessException);
  });

  it("confirmRenew：quantity=2 的两年订单顺延 730 天", async () => {
    const { svc, prisma } = buildMocks();
    prisma.circle.findUnique.mockResolvedValue(YEARLY_CIRCLE);
    const expireAt = new Date("2027-01-01T00:00:00Z");
    prisma.circleMember.findUnique.mockResolvedValue({ ...MEMBER, expireAt });
    prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID", quantity: 2, payAmount: 547.5, amount: 547.5 });
    const tx = {
      circleMember: { update: jest.fn().mockResolvedValue({ id: "m1" }) },
      order: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    const r = await svc.confirmRenew("c1", "u1", { orderId: "o1" });
    const expected = new Date(expireAt.getTime() + 730 * 24 * 60 * 60 * 1000).toISOString();
    expect(r.newExpireAt).toBe(expected);
  });
});
