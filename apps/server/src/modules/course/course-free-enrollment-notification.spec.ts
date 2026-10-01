import { CoursePurchaseService } from "./course-purchase.service";
import { Logger } from "@nestjs/common";

describe("免费课程订阅完成通知边界", () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    order: { findFirst: jest.fn(), create: jest.fn() },
    referralRelation: { findFirst: jest.fn() },
  };
  const redis = { setNX: jest.fn(), del: jest.fn() };
  const pricing = { calculateTargetPrice: jest.fn() };
  const attribution = {
    resolveReferrerUserId: jest.fn(),
    isChannelAttributionEnabled: jest.fn(),
    findLatestChannelClick: jest.fn(),
  };
  const notifications = { sendOnce: jest.fn() };
  let service: CoursePurchaseService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.course.findUnique.mockResolvedValue({ id: "course-1", price: 0, title: "测试课程", validityDays: 0 });
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: "free-order-1", ...data }));
    prisma.referralRelation.findFirst.mockResolvedValue(null);
    redis.setNX.mockResolvedValue(true);
    redis.del.mockResolvedValue(undefined);
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 0, originalPrice: 0, appliedPromotion: null });
    attribution.resolveReferrerUserId.mockResolvedValue(null);
    attribution.isChannelAttributionEnabled.mockResolvedValue(false);
    notifications.sendOnce.mockResolvedValue({ id: "notice-1" });
    // 允许修复前四参数构造器运行同一用例，基线失败应来自真实缺失行为。
    const Constructor = CoursePurchaseService as unknown as new (...args: unknown[]) => CoursePurchaseService;
    service = new Constructor(prisma, redis, pricing, attribution, notifications);
  });

  it("订单成功持久化后才通知订阅者，直接指向已登记课程页", async () => {
    let committed = false;
    prisma.order.create.mockImplementation(async ({ data }) => {
      committed = true;
      return { id: "free-order-1", ...data };
    });
    notifications.sendOnce.mockImplementation(async () => {
      expect(committed).toBe(true);
      return { id: "notice-1" };
    });
    await expect(service.purchase("learner-1", "course-1")).resolves.toMatchObject({ status: "PAID", payMethod: "FREE" });
    expect(notifications.sendOnce).toHaveBeenCalledWith("learner-1", "COURSE_ENROLLED:free-order-1", {
      type: "COURSE",
      title: "课程订阅成功",
      content: "课程已加入我的课程，可查看并开始学习。",
      targetType: "COURSE",
      targetId: "course-1",
    });
  });

  it("订单创建失败绝不发成功通知，同时释放下单锁", async () => {
    prisma.order.create.mockRejectedValue(new Error("订单写入失败"));
    await expect(service.purchase("learner-1", "course-1")).rejects.toThrow("订单写入失败");
    expect(notifications.sendOnce).not.toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith("purchase:lock:learner-1:course-1");
  });

  it("收费课程待付款不能发订阅成功通知", async () => {
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 12, originalPrice: 12, appliedPromotion: null });
    await expect(service.purchase("learner-1", "course-1")).resolves.toMatchObject({ status: "PENDING" });
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("复用已有待付款订单不能误发订阅成功通知", async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "pending-1", status: "PENDING" });
    await expect(service.purchase("learner-1", "course-1")).resolves.toMatchObject({ id: "pending-1" });
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("拒绝已订阅课程时不再创建通知", async () => {
    prisma.order.findFirst.mockResolvedValueOnce({ id: "existing", status: "PAID", paidAt: new Date() });
    await expect(service.purchase("learner-1", "course-1")).rejects.toThrow("已购买该课程");
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("通知写入长时间未返回也不阻断订阅成功或锁释放", async () => {
    notifications.sendOnce.mockReturnValue(new Promise(() => {}));
    const result = await Promise.race([
      service.purchase("learner-1", "course-1"),
      new Promise((resolve) => setImmediate(() => resolve("blocked"))),
    ]);
    expect(result).toMatchObject({ id: "free-order-1", status: "PAID" });
    expect(notifications.sendOnce).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledTimes(1);
  });

  it("通知异步失败被处理，订阅仍成功", async () => {
    const warn = jest.spyOn(Reflect.get(service, "logger") as Logger, "warn").mockImplementation(() => {});
    try {
      notifications.sendOnce.mockRejectedValue(new Error("通知暂不可用"));
      await expect(service.purchase("learner-1", "course-1")).resolves.toMatchObject({ status: "PAID" });
      await new Promise((resolve) => setImmediate(resolve));
      expect(warn).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledTimes(1);
    } finally { warn.mockRestore(); }
  });

  it("通知调用同步抛错不改变订阅结果", async () => {
    const warn = jest.spyOn(Reflect.get(service, "logger") as Logger, "warn").mockImplementation(() => {});
    try {
      notifications.sendOnce.mockImplementation(() => { throw new Error("通知调用失败"); });
      await expect(service.purchase("learner-1", "course-1")).resolves.toMatchObject({ status: "PAID" });
      expect(warn).toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });

  it("促销到零元的订阅也以订单ID建立幂等事件", async () => {
    pricing.calculateTargetPrice.mockResolvedValue({ effectivePrice: 0, originalPrice: 29, appliedPromotion: { type: "LIMITED", id: "promotion-1" } });
    await service.purchase("learner-1", "course-1");
    expect(notifications.sendOnce).toHaveBeenCalledWith("learner-1", "COURSE_ENROLLED:free-order-1", expect.objectContaining({ targetId: "course-1" }));
    expect(prisma.order.create).toHaveBeenCalledWith({ data: expect.objectContaining({ originalAmount: 29, payAmount: 0 }) });
  });
});
