import { Test } from "@nestjs/testing";
import { BaziCaseService } from "./bazi-case.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";

/**
 * 案例库的两条命门：
 *   ① 没点「公布答案」就拿不到答案（否则「先断后看」的玩法一秒被破解）
 *   ② 三柱匹配口径：日柱必须同 + 另任意两柱同（口径错了会把毫不相干的八字推给用户当「同类」）
 * 另加：投稿必须有授权、用户投稿一律匿名、奖励金额取自配置而非硬编码。
 */
describe("BaziCaseService", () => {
  let svc: BaziCaseService;
  let prisma: any;
  let coin: any;

  const CASE = {
    id: "c1",
    status: "APPROVED",
    gender: "male",
    yearPillar: "甲子",
    monthPillar: "丙寅",
    dayPillar: "戊辰",
    hourPillar: "庚申",
    source: "USER",
    title: "某商界人士",
    realName: null,
    era: null,
    tags: [],
    quality: 90,
    isPremium: true,
    viewCount: 0,
    attemptCount: 0,
    createdAt: new Date(),
    birthYear: null, birthMonth: null, birthDay: null, birthHour: null,
    // 答案
    life: { career: "38岁前屡败", marriage: "1998离异" },
    events: [{ year: 1998, event: "离异" }],
    commentary: "身弱财旺",
    commentarySrc: "《滴天髓》",
    contributorId: "u9",
  };

  beforeEach(async () => {
    prisma = {
      baziCase: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "new", ...data })),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      baziCaseAttempt: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      commissionConfig: { findUnique: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    coin = { income: jest.fn().mockResolvedValue({}) };

    const mod = await Test.createTestingModule({
      providers: [
        BaziCaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoinService, useValue: coin },
      ],
    }).compile();

    svc = mod.get(BaziCaseService);
  });

  describe("答案的下发口（先断后看）", () => {
    it("详情接口永远不含答案 —— 连 life/events/commentary 的键都不能有", async () => {
      prisma.baziCase.findFirst.mockResolvedValue({ id: "c1", title: "某商界人士", quality: 90 });

      const res: any = await svc.detail("c1");

      expect(res).not.toHaveProperty("life");
      expect(res).not.toHaveProperty("events");
      expect(res).not.toHaveProperty("commentary");
    });

    it("没 reveal 过 → myAttempt 不返回答案", async () => {
      prisma.baziCaseAttempt.findUnique.mockResolvedValue({ guess: { career: "我猜经商" }, revealedAt: null });

      const res: any = await svc.myAttempt("u1", "c1");

      expect(res.revealed).toBe(false);
      expect(res).not.toHaveProperty("life");
      expect(res.guess).toEqual({ career: "我猜经商" });
    });

    it("reveal 过 → myAttempt 才带回答案（刷新后回显）", async () => {
      prisma.baziCaseAttempt.findUnique.mockResolvedValue({
        guess: { career: "我猜经商" },
        revealedAt: new Date(),
        selfScore: 3,
      });
      prisma.baziCase.findUnique.mockResolvedValue(CASE);

      const res: any = await svc.myAttempt("u1", "c1");

      expect(res.revealed).toBe(true);
      expect(res.life).toEqual(CASE.life);
      expect(res.events).toEqual(CASE.events);
    });

    it("reveal 返回答案 + 我的断语（供逐维度对照），并记一次练手", async () => {
      prisma.baziCase.findFirst.mockResolvedValue(CASE);
      prisma.baziCaseAttempt.findUnique.mockResolvedValue(null);
      prisma.baziCaseAttempt.upsert.mockResolvedValue({ guess: { career: "我猜经商" } });

      const res: any = await svc.reveal("u1", "c1");

      expect(res.life).toEqual(CASE.life);
      expect(res.myGuess).toEqual({ career: "我猜经商" });
      expect(res.dimensions).toHaveLength(6);
      // 首次 reveal 计入练手数
      expect(prisma.baziCase.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attemptCount: { increment: 1 } } }),
      );
    });

    it("未通过审核的案例，reveal 也拿不到", async () => {
      prisma.baziCase.findFirst.mockResolvedValue(null);
      await expect(svc.reveal("u1", "c1")).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe("三柱匹配（日柱必须同 + 另任意两柱同）", () => {
    const target = { year: "甲子", month: "丙寅", day: "戊辰", hour: "庚申" };

    it("四柱全同 → 命中（4 柱）", async () => {
      prisma.baziCase.findMany.mockResolvedValue([{ ...CASE }]);
      const r = await svc.findSimilar(target);
      expect(r.total).toBe(1);
      expect(r.items[0].sameCount).toBe(4);
    });

    it("日柱同 + 另两柱同 → 命中（3 柱）", async () => {
      // 时柱不同，年月日同
      prisma.baziCase.findMany.mockResolvedValue([{ ...CASE, hourPillar: "壬戌" }]);
      const r = await svc.findSimilar(target);
      expect(r.total).toBe(1);
      expect(r.items[0].samePillars).toEqual(expect.arrayContaining(["日", "年", "月"]));
    });

    it("🔴 日柱同但只有另一柱同 → 不命中（否则会把不相干的八字当同类推给用户）", async () => {
      prisma.baziCase.findMany.mockResolvedValue([
        { ...CASE, monthPillar: "辛未", hourPillar: "壬戌" }, // 只剩年柱同
      ]);
      const r = await svc.findSimilar(target);
      expect(r.total).toBe(0);
    });

    it("🔴 日柱不同 → 一律不命中（日柱=命主自身，查询本就只按日柱捞候选）", async () => {
      prisma.baziCase.findMany.mockResolvedValue([]);
      const r = await svc.findSimilar(target);
      expect(r.total).toBe(0);
      // 证明查询确实用 dayPillar 走索引，而不是扫全表
      expect(prisma.baziCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ dayPillar: "戊辰", status: "APPROVED" }) }),
      );
    });
  });

  describe("投稿与合规", () => {
    const base = {
      gender: "male",
      yearPillar: "甲子", monthPillar: "丙寅", dayPillar: "戊辰", hourPillar: "庚申",
      title: "某商界人士",
      consent: true,
    };

    it("🔴 未确认授权 → 拒收", async () => {
      await expect(svc.submit("u1", { ...base, consent: false })).rejects.toBeInstanceOf(BusinessException);
    });

    it("🔴 用户投稿一律匿名：realName 强制为 null，status=PENDING", async () => {
      await svc.submit("u1", { ...base, ...({ realName: "张三" } as any) });

      const data = prisma.baziCase.create.mock.calls[0][0].data;
      expect(data.realName).toBeNull();
      expect(data.status).toBe("PENDING");
      expect(data.source).toBe("USER");
      expect(data.contributorId).toBe("u1");
    });

    it("四柱格式不对 → 拒收", async () => {
      await expect(svc.submit("u1", { ...base, dayPillar: "戊" })).rejects.toBeInstanceOf(BusinessException);
    });

    it("质量分：有大事年表的案例分更高（年表能验应期，最值钱）", async () => {
      await svc.submit("u1", { ...base, life: { career: "a", marriage: "b", wealth: "c" } });
      const noEvents = prisma.baziCase.create.mock.calls[0][0].data.quality;

      prisma.baziCase.create.mockClear();
      await svc.submit("u1", {
        ...base,
        life: { career: "a", marriage: "b", wealth: "c" },
        events: [{ year: 1998, event: "离异" }, { year: 2003, event: "创业失败" }],
      });
      const withEvents = prisma.baziCase.create.mock.calls[0][0].data.quality;

      expect(withEvents).toBeGreaterThan(noEvents);
    });

    it("只收六个已知维度，别的键丢掉", async () => {
      await svc.submit("u1", { ...base, life: { career: "a", 恶意字段: "x" } as any });
      const life = prisma.baziCase.create.mock.calls[0][0].data.life;
      expect(life).toEqual({ career: "a" });
    });
  });

  describe("审核与发币", () => {
    it("通过 → 按质量档发币，金额取自配置（不硬编码）", async () => {
      prisma.baziCase.findUnique.mockResolvedValue({ ...CASE, status: "PENDING", quality: 90 });
      prisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 150 });

      const r = await svc.approve("admin1", "c1");

      expect(prisma.commissionConfig.findUnique).toHaveBeenCalledWith({ where: { configKey: "case_reward_premium" } });
      expect(coin.income).toHaveBeenCalledWith(
        "u9",
        expect.objectContaining({ amountCoin: 150, scene: "CASE_CONTRIBUTION", refId: "c1" }),
      );
      expect(r.rewarded).toBe(150);
    });

    it("🔴 幂等：已通过的再点一次，不重复发币", async () => {
      prisma.baziCase.findUnique.mockResolvedValue({ ...CASE, status: "APPROVED" });

      const r = await svc.approve("admin1", "c1");

      expect(coin.income).not.toHaveBeenCalled();
      expect(r.rewarded).toBe(0);
    });

    it("🔴 配置缺失 → 不发币（绝不猜一个数字发出去）", async () => {
      prisma.baziCase.findUnique.mockResolvedValue({ ...CASE, status: "PENDING" });
      prisma.commissionConfig.findUnique.mockResolvedValue(null);

      const r = await svc.approve("admin1", "c1");

      expect(coin.income).not.toHaveBeenCalled();
      expect(r.rewarded).toBe(0);
    });

    it("平台自己整理的案例（非 USER）不发币", async () => {
      prisma.baziCase.findUnique.mockResolvedValue({ ...CASE, status: "PENDING", source: "CLASSIC" });

      const r = await svc.approve("admin1", "c1");

      expect(coin.income).not.toHaveBeenCalled();
      expect(r.rewarded).toBe(0);
    });
  });
});
