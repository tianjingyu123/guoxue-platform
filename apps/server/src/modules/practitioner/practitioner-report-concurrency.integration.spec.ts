import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PractitionerService } from "./practitioner.service";

/**
 * 只对显式隔离库运行。验证 PostgreSQL 事务锁在真实并发连接下的效果；不调用支付或模型。
 * XIAOBU_IT_DATABASE_URL=<隔离库> pnpm exec jest --runTestsByPath src/modules/practitioner/practitioner-report-concurrency.integration.spec.ts
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("工作台报告创建与导入并发 · 真实库", () => {
  let prisma: PrismaClient;
  let service: PractitionerService;
  const userId = `it-pr-report-${randomUUID()}`;

  const draft = (title: string) => ({
    ownerId: userId,
    type: "bazi",
    typeLabel: "八字命书",
    title,
    clientName: "测试客户",
  });

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.user.create({ data: { id: userId, nickname: "工作台并发隔离测试" } });
    service = new PractitionerService(prisma as any, { assertReportAccess: async () => ({ granted: true }) } as any);
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.practitionerReport.deleteMany({ where: { ownerId: userId } });
      await prisma.aiAnalysisRecord.deleteMany({ where: { userId } });
      await prisma.paipanRecord.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("两次手工新建抢最后一份免费配额，只有一份成功", async () => {
    await prisma.practitionerReport.createMany({ data: [draft("已有一"), draft("已有二")] });
    const results = await Promise.allSettled([
      service.createReport(userId, { type: "bazi", typeLabel: "八字命书", title: "并发甲", clientName: "甲" }),
      service.createReport(userId, { type: "bazi", typeLabel: "八字命书", title: "并发乙", clientName: "乙" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
    expect(String(rejected?.reason?.message)).toContain("免费版最多保存");
    expect(await prisma.practitionerReport.count({ where: { ownerId: userId } })).toBe(3);
  });

  it("同一份小卜报告同时导入，只产生一份工作台稿", async () => {
    await prisma.practitionerReport.deleteMany({ where: { ownerId: userId } });
    const chart = await prisma.paipanRecord.create({
      data: { userId, paipanType: "BAZI", clientName: "客户", clientBirth: "it", inputParams: {}, resultData: {} },
    });
    const source = await prisma.aiAnalysisRecord.create({
      data: {
        userId,
        paipanRecordId: chart.id,
        analyzeType: "REPORT_GENERAL",
        scene: "paipan_report",
        analysisContent: JSON.stringify({
          title: "八字报告",
          metadata: { paipanType: "bazi", reportType: "general" },
          sections: [{ id: "s1", title: "盘面事实", content: "结构化测试内容", deterministic: true }],
        }),
      },
    });
    const [first, second] = await Promise.all([
      service.importFromXiaobuReport(userId, { reportId: source.id }),
      service.importFromXiaobuReport(userId, { reportId: source.id }),
    ]);
    expect(first.id).toBe(second.id);
    expect(await prisma.practitionerReport.count({ where: { ownerId: userId } })).toBe(1);
  });
});
