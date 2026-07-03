import { Test, TestingModule } from "@nestjs/testing";
import { InstituteContentService } from "./content.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

describe("InstituteContentService（C 端·大师讲堂付费知识库）", () => {
  let svc: InstituteContentService;
  let prisma: any;
  let coin: any;

  const article = {
    id: "c1",
    title: "紫微斗数进阶十二讲",
    contentType: "ARTICLE",
    content: "甲".repeat(500),
    summary: null,
    price: "30",
    status: "PUBLISHED",
    authorId: "author1",
    instituteId: "i1",
    createdAt: new Date(),
    _count: { purchases: 5 },
  };

  beforeEach(async () => {
    prisma = {
      instituteContent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      instituteContentPurchase: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "p1", purchasedAt: new Date() }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "author1", nickname: "王院长", avatar: null }),
      },
      // 事务直接回放同一 mock（coin.spend 接受 tx 参数）
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    coin = { spend: jest.fn().mockResolvedValue({ account: { balance: 70 }, transaction: { id: "t1" } }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstituteContentService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoinService, useValue: coin },
      ],
    }).compile();

    svc = module.get<InstituteContentService>(InstituteContentService);
  });

  describe("listPublic", () => {
    it("列表只见 PUBLISHED，且按类型过滤", async () => {
      prisma.instituteContent.findMany.mockResolvedValue([article]);
      prisma.instituteContent.count.mockResolvedValue(1);
      await svc.listPublic({ type: "ARTICLE", page: 1, pageSize: 20 });
      expect(prisma.instituteContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED", contentType: "ARTICLE" } }),
      );
    });

    it("ARTICLE 无摘要时试读截 content 前 100 字；VIDEO 不外泄 content(URL)", async () => {
      const video = { ...article, id: "c2", contentType: "VIDEO", content: "https://vod.example.com/x.mp4", summary: null };
      prisma.instituteContent.findMany.mockResolvedValue([article, video]);
      prisma.instituteContent.count.mockResolvedValue(2);
      const res = await svc.listPublic({});
      expect(res.items[0].summary).toHaveLength(100);
      expect(res.items[1].summary).toBe(""); // VIDEO 的 content 是 URL，摘要绝不回退到 content
      expect(JSON.stringify(res.items[1])).not.toContain("vod.example.com");
    });

    it("登录时批量标记已购 purchased", async () => {
      prisma.instituteContent.findMany.mockResolvedValue([article]);
      prisma.instituteContent.count.mockResolvedValue(1);
      prisma.instituteContentPurchase.findMany.mockResolvedValue([{ contentId: "c1" }]);
      const res = await svc.listPublic({}, "u1");
      expect(res.items[0].purchased).toBe(true);
    });
  });

  describe("getPublic", () => {
    it("未购 ARTICLE 只给前 200 字试读 + purchased:false + price", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue(article);
      const res = await svc.getPublic("c1", "u1");
      expect(res.purchased).toBe(false);
      expect(res.content).toHaveLength(200);
      expect(res.price).toBe(30);
    });

    it("免费内容(price=0)未购也直读全量 + purchased:true", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue({ ...article, price: "0" });
      const res = await svc.getPublic("c1");
      expect(res.purchased).toBe(true);
      expect(res.content).toHaveLength(500);
      expect(prisma.instituteContentPurchase.findFirst).not.toHaveBeenCalled();
    });

    it("未购 VIDEO 不返回 content(URL)", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue({ ...article, contentType: "VIDEO", content: "https://vod.example.com/x.mp4" });
      const res = await svc.getPublic("c1");
      expect(res.content).toBe("");
    });

    it("DRAFT 内容对 C 端 404", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue({ ...article, status: "DRAFT" });
      await expect(svc.getPublic("c1")).rejects.toThrow(BusinessException);
    });
  });

  describe("purchase", () => {
    beforeEach(() => {
      prisma.instituteContent.findUnique.mockResolvedValue(article);
    });

    it("购买成功：事务内 coin.spend 原子扣币 + 购买记录落库", async () => {
      const res = await svc.purchase("c1", "u1");
      expect(coin.spend).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ amountCoin: 30, scene: "PEEK_ANSWER", refId: "c1" }),
        prisma, // 事务客户端透传（本测试中即回放的 prisma mock）
      );
      expect(prisma.instituteContentPurchase.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ contentId: "c1", userId: "u1" }) }),
      );
      expect(res.purchased).toBe(true);
      expect(res.price).toBe(30);
    });

    it("重复购买拒绝且不扣币", async () => {
      prisma.instituteContentPurchase.count.mockResolvedValue(1);
      await expect(svc.purchase("c1", "u1")).rejects.toThrow(BusinessException);
      expect(coin.spend).not.toHaveBeenCalled();
      expect(prisma.instituteContentPurchase.create).not.toHaveBeenCalled();
    });

    it("余额不足抛业务异常且消息带价格，不落购买记录", async () => {
      coin.spend.mockRejectedValue(new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT));
      await expect(svc.purchase("c1", "u1")).rejects.toThrow(/需 30 币/);
      expect(prisma.instituteContentPurchase.create).not.toHaveBeenCalled();
    });

    it("并发防重购：越过 count 校验后唯一约束冲突(P2002)转已购买（事务回滚不重复扣币）", async () => {
      const { Prisma } = await import("@prisma/client");
      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "x",
      } as any);
      prisma.instituteContentPurchase.create.mockRejectedValue(p2002);
      await expect(svc.purchase("c1", "u1")).rejects.toThrow(/已购买/);
    });

    it("免费内容(price=0)无需购买直接拒绝", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue({ ...article, price: "0" });
      await expect(svc.purchase("c1", "u1")).rejects.toThrow(/免费/);
      expect(coin.spend).not.toHaveBeenCalled();
    });

    it("未发布内容不可购买", async () => {
      prisma.instituteContent.findUnique.mockResolvedValue({ ...article, status: "ARCHIVED" });
      await expect(svc.purchase("c1", "u1")).rejects.toThrow(BusinessException);
    });
  });
});
