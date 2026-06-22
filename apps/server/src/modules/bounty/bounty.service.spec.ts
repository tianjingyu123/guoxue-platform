import { BountyService } from "./bounty.service";
import { BusinessException } from "../../common/business.exception";

describe("BountyService", () => {
  let svc: BountyService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      bountyQuestion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((arg: any) => typeof arg === "function" ? arg(prisma) : Promise.all(arg)),
    };

    // BountyService 中 CoinService 是 @Optional forwardRef，直接 new 绕过 DI 解析
    svc = new BountyService(prisma, {} as any);
  });

  describe("createQuestion", () => {
    it("创建悬赏问题", async () => {
      prisma.bountyQuestion.create.mockResolvedValue({
        id: "q1", title: "八字求解", bountyCoin: 100, status: "OPEN",
      });

      const dto = { title: "八字求解", description: "请帮我看看", bountyCoin: 100, category: "BAZI" };
      const result = await svc.createQuestion("u1", dto);

      expect(result.id).toBe("q1");
      expect(result.bountyCoin).toBe(100);
      expect(result.status).toBe("OPEN");
    });

    it("创建悬赏支持圈子关联", async () => {
      prisma.bountyQuestion.create.mockResolvedValue({
        id: "q2", title: "风水问题", circleId: "c1", category: "FENGSHUI",
      });

      const dto = { title: "风水问题", description: "办公室布局", bountyCoin: 200, category: "FENGSHUI", circleId: "c1" };
      const result = await svc.createQuestion("u1", dto);

      expect(result.circleId).toBe("c1");
    });
  });

  describe("claim", () => {
    it("抢答OPEN状态的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "OPEN", askerId: "u1" });
      prisma.bountyQuestion.update.mockResolvedValue({
        id: "q1", status: "CLAIMED", answererId: "u2", lockExpireAt: new Date(),
      });

      const result = await svc.claim("u2", "q1");
      expect(result.status).toBe("CLAIMED");
      expect(result.answererId).toBe("u2");
    });

    it("不能抢答自己的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "OPEN", askerId: "u1" });
      await expect(svc.claim("u1", "q1")).rejects.toThrow(BusinessException);
    });

    it("不能抢答非OPEN状态悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "CLAIMED", askerId: "u1" });
      await expect(svc.claim("u2", "q1")).rejects.toThrow(BusinessException);
    });
  });

  describe("answer", () => {
    it("回答已认领的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", answererId: "u2" });
      prisma.bountyQuestion.update.mockResolvedValue({
        id: "q1", status: "ANSWERED", answer: "答案是...",
      });

      const dto = { answer: "答案是..." };
      const result = await svc.answer("u2", "q1", dto);
      expect(result.status).toBe("ANSWERED");
    });

    it("无权回答他人认领的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", answererId: "u2" });
      await expect(svc.answer("u99", "q1", { answer: "抢答" })).rejects.toThrow(BusinessException);
    });
  });

  describe("settle", () => {
    it("提问者解付悬赏给回答者", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({
        id: "q1", askerId: "u1", answererId: "u2", status: "ANSWERED", bountyCoin: 100,
      });
      prisma.bountyQuestion.update.mockResolvedValue({ id: "q1", status: "SETTLED", settledAt: new Date() });

      const result = await svc.settle("u1", "q1");
      expect(result.status).toBe("SETTLED");
    });

    it("非提问者无权解付", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", askerId: "u1", status: "ANSWERED" });
      await expect(svc.settle("u99", "q1")).rejects.toThrow(BusinessException);
    });

    it("非ANSWERED状态不可解付", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", askerId: "u1", status: "OPEN" });
      await expect(svc.settle("u1", "q1")).rejects.toThrow(BusinessException);
    });
  });

  describe("refund", () => {
    it("提问者本人退款OPEN状态的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "OPEN", askerId: "u1", bountyCoin: 100 });
      prisma.bountyQuestion.update.mockResolvedValue({ id: "q1", status: "REFUNDED" });

      const result = await svc.refund("u1", "q1");
      expect(result.status).toBe("REFUNDED");
    });

    it("提问者本人退款CLAIMED状态的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "CLAIMED", askerId: "u1", bountyCoin: 100 });
      prisma.bountyQuestion.update.mockResolvedValue({ id: "q1", status: "REFUNDED" });

      const result = await svc.refund("u1", "q1");
      expect(result.status).toBe("REFUNDED");
    });

    it("非提问者本人无权退款", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "OPEN", askerId: "u1", bountyCoin: 100 });
      await expect(svc.refund("intruder", "q1")).rejects.toThrow(BusinessException);
      expect(prisma.bountyQuestion.update).not.toHaveBeenCalled();
    });

    it("不能退款已解付悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "SETTLED", askerId: "u1", bountyCoin: 100 });
      await expect(svc.refund("u1", "q1")).rejects.toThrow(BusinessException);
    });

    it("不存在悬赏抛出异常", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue(null);
      await expect(svc.refund("u1", "q99")).rejects.toThrow(BusinessException);
    });
  });

  describe("list", () => {
    it("分页返回悬赏列表", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([{ id: "q1" }]);
      prisma.bountyQuestion.count.mockResolvedValue(1);

      const result = await svc.list(1, 20);
      expect(result.questions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按分类过滤", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([]);
      prisma.bountyQuestion.count.mockResolvedValue(0);

      await svc.list(1, 20, "BAZI");
      expect(prisma.bountyQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: "BAZI" } }),
      );
    });
  });

  describe("getById", () => {
    it("返回悬赏详情", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", title: "悬赏问题" });
      const result = await svc.getById("q1");
      expect(result!.id).toBe("q1");
    });
  });

  describe("processExpiredLocks", () => {
    it("释放超时锁定的悬赏", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([
        { id: "q1", status: "CLAIMED" },
        { id: "q2", status: "CLAIMED" },
      ]);
      prisma.bountyQuestion.updateMany.mockResolvedValue({ count: 2 });

      await svc.processExpiredLocks();
      expect(prisma.bountyQuestion.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["q1", "q2"] } },
        data: { status: "OPEN", answererId: null, lockExpireAt: null },
      });
    });

    it("无超时悬赏时不操作", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([]);
      await svc.processExpiredLocks();
      expect(prisma.bountyQuestion.updateMany).not.toHaveBeenCalled();
    });
  });
});
