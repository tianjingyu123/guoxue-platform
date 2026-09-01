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
      // 圈子治理 #10：圈内悬赏创建前禁言直查（默认无禁言）
      circleViolation: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((arg: any) => typeof arg === "function" ? arg(prisma) : Promise.all(arg)),
    };

    // BountyService 中 CoinService 是 @Optional forwardRef，直接 new 绕过 DI 解析
    // 第二参=RedisService：cron 锁 runExclusive 透传执行 fn（单测不测锁竞争）
    const redis = { runExclusive: (_k: string, _t: number, fn: () => unknown) => fn() };
    svc = new BountyService(prisma, redis as any);
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
      // 带 circleId 才做禁言直查，且限定本圈生效禁言
      expect(prisma.circleViolation.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.circleViolation.findFirst.mock.calls[0][0].where).toMatchObject({
        circleId: "c1", userId: "u1", type: "MUTE", status: "ACTIVE",
      });
    });

    // 圈子治理 #10（2026-07-11）：被禁言成员在该圈内不能发布悬赏
    it("圈内禁言中：发布悬赏被拦且不建记录", async () => {
      prisma.circleViolation.findFirst.mockResolvedValue({ expiresAt: new Date(Date.now() + 86400000) });
      const dto = { title: "风水问题", description: "布局", bountyCoin: 200, category: "FENGSHUI", circleId: "c1" };
      await expect(svc.createQuestion("u1", dto)).rejects.toThrow("禁言");
      expect(prisma.bountyQuestion.create).not.toHaveBeenCalled();
    });

    it("不带 circleId 的平台悬赏不受圈内禁言影响", async () => {
      prisma.circleViolation.findFirst.mockResolvedValue({ expiresAt: new Date(Date.now() + 86400000) });
      prisma.bountyQuestion.create.mockResolvedValue({ id: "q3", status: "OPEN" });
      const dto = { title: "平台悬赏", description: "无圈", bountyCoin: 100, category: "BAZI" };
      const result = await svc.createQuestion("u1", dto);
      expect(result.id).toBe("q3");
      expect(prisma.circleViolation.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("claim", () => {
    it("抢答OPEN状态的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({ id: "q1", status: "OPEN", askerId: "u1", createdAt: new Date() });
      prisma.bountyQuestion.update.mockResolvedValue({
        id: "q1", status: "CLAIMED", answererId: "u2", lockExpireAt: new Date(),
      });

      const result = await svc.claim("u2", "q1");
      expect(result.status).toBe("CLAIMED");
      expect(result.answererId).toBe("u2");
    });

    it("超过48小时有效期的悬赏不可抢答（董事长拍板 2026-07-10）", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({
        id: "q1", status: "OPEN", askerId: "u1", createdAt: new Date(Date.now() - 49 * 3600 * 1000),
      });
      await expect(svc.claim("u2", "q1")).rejects.toThrow(BusinessException);
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
        expect.objectContaining({
          where: {
            category: "BAZI",
            status: { in: ["OPEN", "CLAIMED", "ANSWERED", "SETTLED"] },
          },
        }),
      );
    });

    it("公开列表不允许通过状态参数探测已关闭或已退款记录", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([]);
      prisma.bountyQuestion.count.mockResolvedValue(0);

      await svc.list(1, 20, undefined, "CLOSED");

      expect(prisma.bountyQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ["OPEN", "CLAIMED", "ANSWERED", "SETTLED"] } },
        }),
      );
    });

    it("page 传非数字串不产生 NaN skip（P2-4 分页加固）", async () => {
      prisma.bountyQuestion.findMany.mockResolvedValue([]);
      prisma.bountyQuestion.count.mockResolvedValue(0);
      await svc.list("abc" as any, 20);
      const arg = prisma.bountyQuestion.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  describe("closeQuestion", () => {
    it("按悬赏业务单号原子解冻并持久化关闭证据", async () => {
      const coin = { unfreeze: jest.fn().mockResolvedValue({}) };
      svc = new BountyService(
        prisma,
        { runExclusive: (_k: string, _t: number, fn: () => unknown) => fn() } as any,
        coin as any,
      );
      prisma.bountyQuestion.findUnique.mockResolvedValue({
        id: "q1",
        status: "OPEN",
        askerId: "u1",
        bountyCoin: 100,
      });
      prisma.bountyQuestion.update.mockResolvedValue({ id: "q1", status: "CLOSED" });

      await svc.closeQuestion("q1", " 违规内容 ", "admin-1");

      expect(coin.unfreeze).toHaveBeenCalledWith("u1", 100, "q1", prisma);
      expect(prisma.bountyQuestion.update).toHaveBeenCalledWith({
        where: { id: "q1" },
        data: expect.objectContaining({
          status: "CLOSED",
          closeReason: "违规内容",
          closedBy: "admin-1",
          closedAt: expect.any(Date),
        }),
      });
    });

    it("禁止直接关闭已有待结算回答的悬赏", async () => {
      prisma.bountyQuestion.findUnique.mockResolvedValue({
        id: "q1",
        status: "ANSWERED",
        askerId: "u1",
        bountyCoin: 100,
      });

      await expect(
        svc.closeQuestion("q1", "内容违规", "admin-1"),
      ).rejects.toThrow("先完成赏金归属处理");
      expect(prisma.bountyQuestion.update).not.toHaveBeenCalled();
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
