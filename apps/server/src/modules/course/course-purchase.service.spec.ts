import { CoursePurchaseService } from "./course-purchase.service";

describe("CoursePurchaseService 课程订单归因", () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    order: { findFirst: jest.fn(), create: jest.fn() },
    referralRelation: { findFirst: jest.fn() },
  };
  const redis = {
    setNX: jest.fn(),
    del: jest.fn(),
  };
  const pricing = {
    calculateTargetPrice: jest.fn(),
  };
  const attribution = {
    resolveReferrerUserId: jest.fn(),
    isChannelAttributionEnabled: jest.fn(),
    findLatestChannelClick: jest.fn(),
  };

  let service: CoursePurchaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.course.findUnique.mockResolvedValue({
      id: "course-1",
      price: 1,
      title: "测试课程",
      validityDays: 0,
    });
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.order.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "order-1", ...data }),
    );
    prisma.referralRelation.findFirst.mockResolvedValue({ referrerId: "station-b-user" });
    redis.setNX.mockResolvedValue(true);
    redis.del.mockResolvedValue(undefined);
    pricing.calculateTargetPrice.mockResolvedValue({
      effectivePrice: 1,
      originalPrice: 1,
      appliedPromotion: null,
    });
    attribution.resolveReferrerUserId.mockResolvedValue("station-e-user");
    attribution.isChannelAttributionEnabled.mockResolvedValue(false);
    attribution.findLatestChannelClick.mockResolvedValue(null);
    service = new CoursePurchaseService(
      prisma as any,
      redis as any,
      pricing as any,
      attribution as any,
    );
  });

  it("临时推荐人与永久归属并行落库，临时推荐留给结算层优先", async () => {
    await service.purchase("buyer-1", "course-1", { tempReferrerId: "station-e-user" });

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerId: "station-b-user",
        tempReferrerId: "station-e-user",
        tempRefSubjectType: null,
      }),
    });
  });

  it("归因开关开启时以最新有效 ChannelClick 覆盖前端临时推荐人", async () => {
    attribution.isChannelAttributionEnabled.mockResolvedValue(true);
    attribution.findLatestChannelClick.mockResolvedValue({
      beneficiaryUserId: "station-d-user",
      subjectType: "STATION",
    });

    await service.purchase("buyer-1", "course-1", { tempReferrerId: "station-e-user" });

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerId: "station-b-user",
        tempReferrerId: "station-d-user",
        tempRefSubjectType: "STATION",
      }),
    });
  });

  it("临时归因服务异常时 fail-open，永久归属仍可下单", async () => {
    attribution.resolveReferrerUserId.mockRejectedValue(new Error("归因服务暂不可用"));

    await expect(service.purchase("buyer-1", "course-1", { tempReferrerId: "bad-ref" }))
      .resolves.toEqual(expect.objectContaining({ id: "order-1" }));
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerId: "station-b-user",
        tempReferrerId: null,
        tempRefSubjectType: null,
      }),
    });
  });
});