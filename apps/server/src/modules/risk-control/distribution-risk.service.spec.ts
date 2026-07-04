import { Test } from "@nestjs/testing";
import {
  DistributionRiskService,
  DISTRIBUTION_ALERT_TYPES,
  DISTRIBUTION_EXTRA_WORDS,
  DISTRIBUTION_RISK_THRESHOLDS,
} from "./distribution-risk.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SensitiveWordService } from "../audit/sensitive-word.service";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const mockRedis = {
  setNX: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(undefined),
  runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const mockSensitiveWord = {
  getComplianceWords: jest.fn(),
  addWord: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma: any = {
  station: { findMany: jest.fn() },
  marketingPage: { findMany: jest.fn() },
  referralRelation: { groupBy: jest.fn(), findMany: jest.fn() },
  order: { findMany: jest.fn() },
  riskAlert: { create: jest.fn(), findFirst: jest.fn() },
  $queryRaw: jest.fn(),
};

/** 词库 mock：默认含合-P1 A 级词 + 分销三词（视为种子已跑） */
const wordsWithDistribution = () => [
  { word: "稳赚", level: "A" as const, replacement: null, remark: "确定性承诺类" },
  { word: "拉人头", level: "A" as const, replacement: null, remark: "传销表述类" },
  { word: "算命", level: "B" as const, replacement: "命理文化分析", remark: null },
  ...DISTRIBUTION_EXTRA_WORDS.map((w) => ({ word: w, level: "A" as const, replacement: null, remark: "分销站外承诺类" })),
];

describe("DistributionRiskService", () => {
  let svc: DistributionRiskService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DistributionRiskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SensitiveWordService, useValue: mockSensitiveWord },
      ],
    }).compile();
    svc = mod.get(DistributionRiskService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockSensitiveWord.getComplianceWords.mockReturnValue(wordsWithDistribution());
    mockPrisma.riskAlert.create.mockResolvedValue({ id: "a1" });
    mockPrisma.riskAlert.findFirst.mockResolvedValue(null); // 默认无同类 OPEN 工单
    mockPrisma.station.findMany.mockResolvedValue([]);
    mockPrisma.marketingPage.findMany.mockResolvedValue([]);
    mockPrisma.referralRelation.groupBy.mockResolvedValue([]);
    mockPrisma.referralRelation.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  // ── 违禁词兜底补词 ──
  describe("ensureDistributionWords", () => {
    it("词库已含三词（种子已跑）时不重复添加", async () => {
      await svc.ensureDistributionWords();
      expect(mockSensitiveWord.addWord).not.toHaveBeenCalled();
    });

    it("三词缺失（种子未跑）时经现有 addWord 方法补入 COMPLIANCE_A", async () => {
      mockSensitiveWord.getComplianceWords.mockReturnValue([
        { word: "稳赚", level: "A", replacement: null, remark: null },
      ]);
      await svc.ensureDistributionWords();
      expect(mockSensitiveWord.addWord).toHaveBeenCalledTimes(DISTRIBUTION_EXTRA_WORDS.length);
      for (const call of mockSensitiveWord.addWord.mock.calls) {
        expect(DISTRIBUTION_EXTRA_WORDS).toContain(call[0]);
        expect(call[1]).toBe("COMPLIANCE_A");
      }
    });
  });

  // ── 违禁词扫描 ──
  describe("scanForbiddenWords", () => {
    it("驿站简介+站长微页面组件命中 A 级词 → 按驿站聚合一张 DANGER 工单（B 级词不扫）", async () => {
      mockPrisma.station.findMany.mockResolvedValue([
        { id: "st1", name: "明德驿站", intro: "加入我们，稳赚不亏，下单立享返现" },
        { id: "st2", name: "干净驿站", intro: "国学文化传播，算命是 B 级词不在本扫描范围" },
      ]);
      mockPrisma.marketingPage.findMany.mockResolvedValue([
        {
          id: "mp1",
          stationId: "st1",
          name: "推广页",
          description: null,
          components: [{ id: "c1", title: "招募令", config: { text: "发展下级拿回扣" } }],
        },
      ]);

      const r = await svc.scanForbiddenWords();

      expect(r.stationsScanned).toBe(2);
      expect(r.pagesScanned).toBe(1);
      expect(r.alerts).toBe(1); // st2 只含 B 级词不触发，st1 聚合为一张工单
      expect(mockPrisma.riskAlert.create).toHaveBeenCalledTimes(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(DISTRIBUTION_ALERT_TYPES.FORBIDDEN_WORD);
      expect(alert.level).toBe("DANGER");
      expect(alert.targetType).toBe("STATION");
      expect(alert.targetId).toBe("st1");
      expect(alert.stationId).toBe("st1");
      expect(alert.detail.category).toBe("DISTRIBUTION");
      expect(alert.detail.words).toEqual(expect.arrayContaining(["稳赚", "返现", "回扣"]));
      // 命中含组件 config JSON 序列化后的比对
      const componentHit = alert.detail.hits.find((h: any) => h.targetType === "MARKETING_PAGE_COMPONENT");
      expect(componentHit.word).toBe("回扣");
      expect(componentHit.targetId).toBe("c1");
    });

    it("同驿站已有同类 OPEN 工单时幂等跳过", async () => {
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st1", name: "驿站", intro: "稳赚" }]);
      mockPrisma.riskAlert.findFirst.mockResolvedValue({ id: "existing" });
      const r = await svc.scanForbiddenWords();
      expect(r.hits).toBe(1);
      expect(r.alerts).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
    });

    it("COMPLIANCE_A 词库为空（种子未执行）时诚实跳过不报假 0 风险", async () => {
      mockSensitiveWord.getComplianceWords.mockReturnValue([]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st1", name: "驿站", intro: "稳赚" }]);
      const r = await svc.scanForbiddenWords();
      expect(r).toEqual({ stationsScanned: 0, pagesScanned: 0, componentsScanned: 0, hits: 0, alerts: 0 });
    });
  });

  // ── 规则①：批量绑定 ──
  describe("checkBatchBind", () => {
    it("当日新增绑定 >20 → WARN 工单（有驿站的推荐人锚定 STATION）", async () => {
      mockPrisma.referralRelation.groupBy.mockResolvedValue([
        { referrerId: "u-big", _count: { _all: 25 } },
        { referrerId: "u-ok", _count: { _all: 20 } }, // 恰等于阈值不触发（>20）
      ]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st1", userId: "u-big" }]);

      const created = await svc.checkBatchBind(new Date("2026-07-06T02:30:00+08:00"));

      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(DISTRIBUTION_ALERT_TYPES.BATCH_BIND);
      expect(alert.level).toBe("WARN");
      expect(alert.targetType).toBe("STATION");
      expect(alert.targetId).toBe("st1");
      expect(alert.detail.newBinds).toBe(25);
      // 诚实降级标注：无设备/IP 埋点 + 佣金需人工冻结
      expect(alert.detail.note).toContain("无设备/IP");
      expect(alert.detail.commissionFreeze).toBe("MANUAL_REQUIRED");
    });

    it("redis 24h 去重：同推荐人窗口内不重复产单", async () => {
      mockPrisma.referralRelation.groupBy.mockResolvedValue([{ referrerId: "u1", _count: { _all: 30 } }]);
      mockRedis.setNX.mockResolvedValue(false);
      const created = await svc.checkBatchBind(new Date());
      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
    });
  });

  // ── 规则②：绑定后秒下单 ──
  describe("checkQuickOrder", () => {
    it("10 分钟内下单占比 >80% 且 ≥5 笔 → DANGER 工单", async () => {
      const now = new Date("2026-07-06T02:30:00+08:00");
      const { gte } = svc.yesterdayRange(now);
      const bindAt = (m: number) => new Date(gte.getTime() + m * MINUTE_MS);
      // 推荐人 u1：昨日 6 个新绑定，其中 5 个在绑定后 5 分钟内下单（占比 83%）
      mockPrisma.referralRelation.findMany.mockResolvedValue([
        ...[1, 2, 3, 4, 5].map((i) => ({ userId: `buyer${i}`, referrerId: "u1", createdAt: bindAt(i * 10) })),
        { userId: "buyer6", referrerId: "u1", createdAt: bindAt(60) }, // 未下单
      ]);
      mockPrisma.order.findMany.mockResolvedValue(
        [1, 2, 3, 4, 5].map((i) => ({ userId: `buyer${i}`, createdAt: new Date(bindAt(i * 10).getTime() + 5 * MINUTE_MS) })),
      );
      mockPrisma.station.findMany.mockResolvedValue([]);

      const created = await svc.checkQuickOrder(now);

      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(DISTRIBUTION_ALERT_TYPES.QUICK_ORDER);
      expect(alert.level).toBe("DANGER");
      expect(alert.targetType).toBe("USER"); // 无驿站锚定 USER
      expect(alert.targetId).toBe("u1");
      expect(alert.detail.quickOrders).toBe(5);
      expect(alert.detail.newBinds).toBe(6);
    });

    it("下单超出 10 分钟窗口不算秒下单，不触发", async () => {
      const now = new Date("2026-07-06T02:30:00+08:00");
      const { gte } = svc.yesterdayRange(now);
      mockPrisma.referralRelation.findMany.mockResolvedValue(
        [1, 2, 3, 4, 5].map((i) => ({ userId: `buyer${i}`, referrerId: "u1", createdAt: new Date(gte.getTime() + i * MINUTE_MS) })),
      );
      // 全部在绑定 30 分钟后才下单
      mockPrisma.order.findMany.mockResolvedValue(
        [1, 2, 3, 4, 5].map((i) => ({ userId: `buyer${i}`, createdAt: new Date(gte.getTime() + (i + 30) * MINUTE_MS) })),
      );
      const created = await svc.checkQuickOrder(now);
      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
    });
  });

  // ── 规则③：互刷 ──
  describe("checkMutualReferral", () => {
    it("A↔B 互为推荐人 → DANGER 工单（每对一张·detail 双方齐全）", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ userA: "uA", userB: "uB" }]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "stB", userId: "uB" }]);

      const created = await svc.checkMutualReferral();

      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(DISTRIBUTION_ALERT_TYPES.MUTUAL_REFERRAL);
      expect(alert.level).toBe("DANGER");
      expect(alert.detail.userA).toBe("uA");
      expect(alert.detail.userB).toBe("uB");
      expect(alert.detail.stationB).toBe("stB");
      expect(alert.stationId).toBe("stB"); // 任一方涉站即带上驿站上下文
    });

    it("已有同类 OPEN 工单幂等跳过（持续性条件走 DB 幂等非 TTL）", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ userA: "uA", userB: "uB" }]);
      mockPrisma.riskAlert.findFirst.mockResolvedValue({ id: "existing" });
      const created = await svc.checkMutualReferral();
      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
    });
  });

  // ── 规则④：绑定量周环比突增 ──
  describe("checkBindSurge", () => {
    it("本周 >上周×5 且 ≥30 → WARN 工单；上周 0 本周 ≥30 视为环比无穷同触发", async () => {
      mockPrisma.referralRelation.groupBy
        .mockResolvedValueOnce([
          { referrerId: "u-surge", _count: { _all: 60 } }, // 上周 10 → 本周 60（>5 倍）触发
          { referrerId: "u-cold", _count: { _all: 35 } }, // 上周 0 → 本周 35 触发
          { referrerId: "u-small", _count: { _all: 29 } }, // 不足 30 不触发
          { referrerId: "u-normal", _count: { _all: 40 } }, // 上周 10 → 40（=4 倍）不触发
        ])
        .mockResolvedValueOnce([
          { referrerId: "u-surge", _count: { _all: 10 } },
          { referrerId: "u-normal", _count: { _all: 10 } },
        ]);
      mockPrisma.station.findMany.mockResolvedValue([]);

      const created = await svc.checkBindSurge(new Date());

      expect(created).toBe(2);
      const types = mockPrisma.riskAlert.create.mock.calls.map((c: any) => c[0].data.type);
      expect(types).toEqual([DISTRIBUTION_ALERT_TYPES.BIND_SURGE, DISTRIBUTION_ALERT_TYPES.BIND_SURGE]);
      const surge = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(surge.level).toBe("WARN");
      expect(surge.detail.bindsCur7d).toBe(60);
      expect(surge.detail.bindsPrev7d).toBe(10);
    });
  });

  // ── 编排：单规则失败不阻断 + cron 互斥 ──
  describe("scanAll / dailyScanCron", () => {
    it("单规则抛错不阻断其余规则（报告回落 0）", async () => {
      mockPrisma.referralRelation.groupBy.mockRejectedValue(new Error("db down")); // 规则①④共用 groupBy 全挂
      mockPrisma.$queryRaw.mockResolvedValue([{ userA: "uA", userB: "uB" }]); // 规则③正常
      const report = await svc.scanAll();
      expect(report.batchBind).toBe(0);
      expect(report.bindSurge).toBe(0);
      expect(report.mutualReferral).toBe(1);
      expect(report.alertsCreated).toBe(1);
    });

    it("日检 cron 经 runExclusive 互斥执行", async () => {
      await svc.dailyScanCron();
      expect(mockRedis.runExclusive).toHaveBeenCalledWith("distribution-risk", 1800, expect.any(Function));
    });
  });

  // ── 阈值契约快照（防误改）──
  it("阈值与设计文档 §2.1 对齐", () => {
    expect(DISTRIBUTION_RISK_THRESHOLDS.batchBindDailyCount).toBe(20);
    expect(DISTRIBUTION_RISK_THRESHOLDS.quickOrderWindowMinutes).toBe(10);
    expect(DISTRIBUTION_RISK_THRESHOLDS.quickOrderMinCount).toBe(5);
    expect(DISTRIBUTION_RISK_THRESHOLDS.quickOrderRatio).toBe(0.8);
    expect(DISTRIBUTION_RISK_THRESHOLDS.surgeFactor).toBe(5);
    expect(DISTRIBUTION_RISK_THRESHOLDS.surgeMinCount).toBe(30);
  });
});
