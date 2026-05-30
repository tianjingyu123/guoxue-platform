import { FortuneService } from "./fortune.service";
import { BusinessException } from "../../common/business.exception";

describe("FortuneService", () => {
  let svc: FortuneService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      fortuneSubscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      fortuneRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findMany: jest.fn(),
      },
      botConfig: {
        findMany: jest.fn(),
      },
    };

    svc = new FortuneService(prisma);
  });

  describe("generateDailyFortunes", () => {
    it("无订阅用户时直接返回", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([]);
      await svc.generateDailyFortunes();
      expect(prisma.fortuneRecord.findMany).not.toHaveBeenCalled();
    });

    it("全部用户已生成时跳过创建", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([
        { userId: "u1", fortuneType: "DAILY", isActive: true },
      ]);
      prisma.fortuneRecord.findMany.mockResolvedValue([{ userId: "u1" }]);
      await svc.generateDailyFortunes();
      expect(prisma.fortuneRecord.createMany).not.toHaveBeenCalled();
    });

    it("为新订阅用户批量创建每日运势", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([
        { userId: "u1", fortuneType: "DAILY", isActive: true },
        { userId: "u2", fortuneType: "DAILY", isActive: true },
      ]);
      prisma.fortuneRecord.findMany.mockResolvedValue([]);
      prisma.fortuneRecord.createMany.mockResolvedValue({ count: 2 });
      await svc.generateDailyFortunes();
      expect(prisma.fortuneRecord.createMany).toHaveBeenCalled();
      const callData = prisma.fortuneRecord.createMany.mock.calls[0][0].data;
      expect(callData).toHaveLength(2);
      expect(callData[0].fortuneType).toBe("DAILY");
      expect(callData[0].luckyDirection).toBeTruthy();
    });
  });

  describe("generateWeeklyFortunes", () => {
    it("无订阅用户时直接返回", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([]);
      await svc.generateWeeklyFortunes();
      expect(prisma.fortuneRecord.findMany).not.toHaveBeenCalled();
    });

    it("为新订阅用户批量创建每周运势", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([
        { userId: "u1", fortuneType: "WEEKLY", isActive: true },
      ]);
      prisma.fortuneRecord.findMany.mockResolvedValue([]);
      prisma.fortuneRecord.createMany.mockResolvedValue({ count: 1 });
      await svc.generateWeeklyFortunes();
      expect(prisma.fortuneRecord.createMany).toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("新建订阅", async () => {
      prisma.fortuneSubscription.findUnique.mockResolvedValue(null);
      prisma.fortuneSubscription.create.mockResolvedValue({
        id: "s1", userId: "u1", fortuneType: "DAILY", pushChannel: "WECHAT",
      });
      const result = await svc.subscribe("u1", { fortuneType: "DAILY", pushChannel: "WECHAT" });
      expect(result.id).toBe("s1");
    });

    it("已有订阅时直接返回", async () => {
      prisma.fortuneSubscription.findUnique.mockResolvedValue({
        id: "s1", userId: "u1", fortuneType: "DAILY", pushChannel: "WECHAT",
      });
      const result = await svc.subscribe("u1", { fortuneType: "DAILY", pushChannel: "WECHAT" });
      expect(result.id).toBe("s1");
      expect(prisma.fortuneSubscription.create).not.toHaveBeenCalled();
    });
  });

  describe("listSubscriptions", () => {
    it("返回用户活跃订阅列表", async () => {
      prisma.fortuneSubscription.findMany.mockResolvedValue([
        { id: "s1", fortuneType: "DAILY" },
        { id: "s2", fortuneType: "WEEKLY" },
      ]);
      const result = await svc.listSubscriptions("u1");
      expect(result).toHaveLength(2);
    });
  });

  describe("unsubscribe", () => {
    it("取消订阅", async () => {
      prisma.fortuneSubscription.findUnique.mockResolvedValue({ id: "s1" });
      prisma.fortuneSubscription.update.mockResolvedValue({ id: "s1", isActive: false });
      const result = await svc.unsubscribe("u1", "DAILY", "WECHAT");
      expect(result.isActive).toBe(false);
    });

    it("订阅不存在时抛出异常", async () => {
      prisma.fortuneSubscription.findUnique.mockResolvedValue(null);
      await expect(svc.unsubscribe("u1", "DAILY", "WECHAT")).rejects.toThrow(BusinessException);
    });
  });

  describe("getTodayFortune", () => {
    it("返回已有今日运势", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue({
        id: "r1", fortuneType: "DAILY", luckyColor: "红",
      });
      const result = await svc.getTodayFortune("u1");
      expect(result.id).toBe("r1");
    });

    it("今日运势不存在时即时生成", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue(null);
      prisma.fortuneRecord.create.mockResolvedValue({
        id: "r2", fortuneType: "DAILY", luckyColor: "金",
      });
      const result = await svc.getTodayFortune("u1");
      expect(result.id).toBe("r2");
      expect(prisma.fortuneRecord.create).toHaveBeenCalled();
    });
  });

  describe("getFortuneByPeriod", () => {
    it("返回指定时段运势", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue({
        id: "r1", fortuneType: "WEEKLY", period: "2026-W20",
      });
      const result = await svc.getFortuneByPeriod("u1", "WEEKLY", "2026-W20");
      expect(result!.id).toBe("r1");
    });

    it("运势记录不存在时抛出异常", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue(null);
      await expect(svc.getFortuneByPeriod("u1", "DAILY", "2026-01-01"))
        .rejects.toThrow(BusinessException);
    });
  });

  describe("pushAll", () => {
    it("返回待推送数量", async () => {
      prisma.fortuneRecord.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
      const result = await svc.pushAll("DAILY");
      expect(result.pushed).toBe(2);
    });
  });

  describe("adminListRecords", () => {
    it("分页返回运势记录", async () => {
      prisma.fortuneRecord.findMany.mockResolvedValue([{ id: "r1" }]);
      prisma.fortuneRecord.count.mockResolvedValue(1);
      const result = await svc.adminListRecords(1, 20);
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按类型过滤", async () => {
      prisma.fortuneRecord.findMany.mockResolvedValue([]);
      prisma.fortuneRecord.count.mockResolvedValue(0);
      await svc.adminListRecords(1, 20, "WEEKLY");
      expect(prisma.fortuneRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fortuneType: "WEEKLY" } }),
      );
    });
  });

  describe("getToolsGrid", () => {
    it("返回排盘工具网格（未登录）", async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.botConfig.findMany.mockResolvedValue([]);
      const result = await svc.getToolsGrid();
      expect(result.tools).toHaveLength(8);
      expect(result.recentTools).toHaveLength(0);
    });

    it("返回排盘工具网格（已登录含历史）", async () => {
      prisma.fortuneRecord.findMany.mockResolvedValue([
        { fortuneType: "DAILY" }, { fortuneType: "DAILY" }, { fortuneType: "BAZI" },
      ]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.botConfig.findMany.mockResolvedValue([]);
      const result = await svc.getToolsGrid("u1");
      expect(result.recentTools).toContain("DAILY");
    });
  });

  describe("getGuideCard", () => {
    it("有今日运势时返回完整引导卡", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue({
        id: "r1", userId: "u1", fortuneType: "DAILY",
        fortuneContent: { overall: 80, career: 75, love: 90, wealth: 70, health: 85 },
        luckyDirection: "南", luckyColor: "红", luckyNumber: 8, advice: "宜静不宜动",
      });
      const result = await svc.getGuideCard("u1");
      expect(result.fortune).toBeTruthy();
      expect(result.fortune!.overall).toBe(80);
    });

    it("今日运势不存在时返回提示", async () => {
      prisma.fortuneRecord.findUnique.mockResolvedValue(null);
      const result = await svc.getGuideCard("u1");
      expect(result.fortune).toBeNull();
      expect(result.tip).toBeTruthy();
    });
  });
});
