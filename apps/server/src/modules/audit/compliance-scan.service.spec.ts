import { Test } from "@nestjs/testing"
import { ComplianceScanService } from "./compliance-scan.service"
import { SensitiveWordService } from "./sensitive-word.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"

/** 模拟 ComplianceScanRecord 表：四元组唯一约束 + skipDuplicates 语义 */
function makeRecordStore() {
  const store = new Set<string>()
  return {
    store,
    createMany: jest.fn(async ({ data }: { data: Array<{ targetType: string; targetId: string; field: string; word: string }> }) => {
      let count = 0
      for (const d of data) {
        const key = `${d.targetType}|${d.targetId}|${d.field}|${d.word}`
        if (store.has(key)) continue
        store.add(key)
        count++
      }
      return { count }
    }),
  }
}

describe("ComplianceScanService", () => {
  let svc: ComplianceScanService
  let recordStore: ReturnType<typeof makeRecordStore>

  const mockPrisma: Record<string, any> = {}

  const mockSensitiveWord = {
    getComplianceWords: jest.fn().mockReturnValue([
      { word: "改运", level: "A", replacement: null, remark: "功效承诺类" },
      { word: "算命", level: "B", replacement: "命理文化分析", remark: null },
    ]),
  }

  const mockRedis = {
    runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
  }

  beforeEach(async () => {
    recordStore = makeRecordStore()
    Object.assign(mockPrisma, {
      product: { findMany: jest.fn().mockResolvedValue([]) },
      course: { findMany: jest.fn().mockResolvedValue([]) },
      post: { findMany: jest.fn().mockResolvedValue([]) },
      couponTemplate: { findMany: jest.fn().mockResolvedValue([]) },
      marketingPage: { findMany: jest.fn().mockResolvedValue([]) },
      marketingPageComponent: { findMany: jest.fn().mockResolvedValue([]) },
      complianceScanRecord: {
        createMany: recordStore.createMany,
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      // 豁免域：正常扫描流程中绝不应触碰
      classicChapter: { findMany: jest.fn() },
      poetry: { findMany: jest.fn() },
    })

    const m = await Test.createTestingModule({
      providers: [
        ComplianceScanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SensitiveWordService, useValue: mockSensitiveWord },
      ],
    }).compile()
    svc = m.get(ComplianceScanService)
  })

  it("扫描命中：商品文案含 A 级词、课程简介含 B 级词 → 产出分级记录与建议", async () => {
    mockPrisma.product.findMany.mockResolvedValueOnce([
      { id: "p1", title: "开光貔貅助你改运", intro: null, detail: "正常详情" },
    ]).mockResolvedValue([])
    mockPrisma.course.findMany.mockResolvedValueOnce([
      { id: "c1", title: "易学入门", intro: "大师算命体验课" },
    ]).mockResolvedValue([])

    const report = await svc.scanAll()

    expect(report.hitsByLevel.A).toBe(1) // p1.title 改运
    expect(report.hitsByLevel.B).toBe(1) // c1.intro 算命
    expect(report.created).toBe(2)
    const created = recordStore.createMany.mock.calls.flatMap((c) => c[0].data)
    expect(created).toContainEqual(
      expect.objectContaining({ targetType: "PRODUCT", targetId: "p1", field: "title", word: "改运", level: "A" }),
    )
    expect(created).toContainEqual(
      expect.objectContaining({
        targetType: "COURSE", targetId: "c1", field: "intro", word: "算命", level: "B",
        suggestion: expect.stringContaining("命理文化分析"),
      }),
    )
  })

  it("豁免域不扫：古籍/诗词正文（ClassicChapter/Poetry）不进扫描范围", async () => {
    mockPrisma.post.findMany.mockResolvedValueOnce([
      { id: "post1", title: null, content: "讨论《易经》中占卜的文化史" },
    ]).mockResolvedValue([])

    await svc.scanAll()

    expect(mockPrisma.classicChapter.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.poetry.findMany).not.toHaveBeenCalled()
  })

  it("幂等：同目标同字段同词重复扫描不重复产出 OPEN 记录", async () => {
    // 单批不足 BATCH 时游标扫描一次即止：两轮 scanAll 各消费一次 findMany
    const rows = [{ id: "p1", title: "改运法宝", intro: null, detail: null }]
    mockPrisma.product.findMany
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(rows)
      .mockResolvedValue([])

    const first = await svc.scanAll()
    const second = await svc.scanAll()

    expect(first.created).toBe(1)
    expect(second.totalHits).toBe(1) // 依旧命中
    expect(second.created).toBe(0) // 但不重复产出
    expect(recordStore.store.size).toBe(1)
  })

  it("月扫 cron 走 runExclusive 互斥", async () => {
    await svc.monthlyScan()
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("compliance-scan", 3600, expect.any(Function))
  })

  it("处置记录：标记 RESOLVED 落处理人与时间", async () => {
    mockPrisma.complianceScanRecord.findUnique.mockResolvedValue({ id: "r1", status: "OPEN" })
    await svc.updateStatus("r1", "RESOLVED", "admin-1")
    expect(mockPrisma.complianceScanRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({ status: "RESOLVED", resolvedBy: "admin-1" }),
      }),
    )
  })
})
