import { Test } from "@nestjs/testing";
import { AdminAssistantService } from "./admin-assistant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * M1-1 反馈中枢：高频 TOP10 聚类 + 趋势周报 + 一键导出。
 * mock 按调用参数分流返回，覆盖聚类/趋势/导出三条链路。
 */
describe("AdminAssistantService · 反馈中枢（M1-1）", () => {
  let svc: AdminAssistantService;

  const groupByPageRows = [
    { page: "/system/config", _count: { _all: 5 } },
    { page: "", _count: { _all: 2 } },
  ];
  const groupByCategoryRows = [
    { category: "BUG", _count: { _all: 4 } },
    { category: "OPTIMIZE", _count: { _all: 3 } },
  ];
  const sampleRows = [
    { page: "/system/config", category: "BUG", status: "PENDING", title: "配置保存失败", createdAt: new Date("2026-07-06") },
    { page: "/system/config", category: "BUG", status: "DONE", title: "下拉框空白", createdAt: new Date("2026-07-05") },
    { page: "/system/config", category: "OPTIMIZE", status: "ADOPTED", title: "希望批量导入", createdAt: new Date("2026-07-04") },
    { page: "", category: "QUESTION", status: "REVIEWED", title: "怎么导出", createdAt: new Date("2026-07-03") },
  ];

  const mockPrisma = {
    adminFeedback: {
      groupBy: jest.fn((args: any) =>
        Promise.resolve(args.by?.[0] === "page" ? groupByPageRows : groupByCategoryRows),
      ),
      findMany: jest.fn((args: any) => {
        // hotspots 样本查询：select 含 title 且无 status 过滤
        if (args.where?.createdAt && !args.where?.status) return Promise.resolve(sampleRows);
        if (args.where?.status === "DONE") return Promise.resolve([
          { id: "d1", title: "登录闪退已修", page: "/login", category: "BUG", reply: "已上线", updatedAt: new Date() },
        ]);
        if (args.where?.status === "ADOPTED") return Promise.resolve([
          { id: "a1", title: "批量导入", page: "/system/config", category: "OPTIMIZE", createdAt: new Date() },
        ]);
        if (args.where?.status === "PENDING") return Promise.resolve([
          { id: "p1", title: "报表加载慢", page: "/dashboard", category: "BUG", createdAt: new Date() },
        ]);
        return Promise.resolve([]);
      }),
      // thisWeek: 仅 gte；lastWeek: 带 lt（上周区间）
      count: jest.fn((args: any) => Promise.resolve(args?.where?.createdAt?.lt ? 6 : 9)),
    },
  };
  const mockGateway = { chat: jest.fn() };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AdminAssistantService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(AdminAssistantService);
  });

  describe("hotspots 高频 TOP10 聚类", () => {
    it("按页面聚类·带分类分布/未决数/样本标题", async () => {
      const res = await svc.hotspots(30, 10);
      expect(res.top).toHaveLength(2);
      const top = res.top[0];
      expect(top.page).toBe("/system/config");
      expect(top.count).toBe(5);
      // sampleRows 里 /system/config 有 PENDING + ADOPTED（均属未决）+ DONE（已决）→ open=2
      expect(top.openCount).toBe(2);
      expect(top.categoryCounts).toEqual({ BUG: 2, OPTIMIZE: 1 });
      expect(top.recentTitles.length).toBeGreaterThan(0);
    });

    it("page 为空归入「未标注页面」", async () => {
      const res = await svc.hotspots(30, 10);
      expect(res.top.some((t) => t.page === "(未标注页面)")).toBe(true);
    });
  });

  describe("weeklyReport 趋势周报", () => {
    it("本周vs上周趋势 + 大白话摘要 + 清单齐全", async () => {
      const r = await svc.weeklyReport();
      expect(r.counts.thisWeek).toBe(9);
      expect(r.counts.lastWeek).toBe(6);
      expect(r.counts.delta).toBe(3);
      expect(r.counts.trend).toBe("上升");
      expect(r.categoryThisWeek).toEqual({ BUG: 4, OPTIMIZE: 3 });
      expect(r.done.length).toBe(1);
      expect(r.adoptedPending.length).toBe(1);
      expect(r.pending.length).toBe(1);
      expect(r.hotspots.length).toBeGreaterThan(0);
      expect(r.narrative).toContain("本周共收到员工反馈 9 条");
      expect(r.narrative).toContain("上升");
    });
  });

  describe("exportWeeklyDigest 一键导出", () => {
    it("产出 markdown 清单·含三段（高频/已优化/待拍板）", async () => {
      const d = await svc.exportWeeklyDigest();
      expect(d.filename).toMatch(/^feedback-weekly-\d{4}-\d{2}-\d{2}\.md$/);
      expect(d.content).toContain("# 员工反馈周报");
      expect(d.content).toContain("本周高频卡点 TOP");
      expect(d.content).toContain("本周已优化");
      expect(d.content).toContain("待拍板");
      expect(d.content).toContain("登录闪退已修");
    });
  });
});
