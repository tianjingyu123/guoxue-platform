import { Test } from "@nestjs/testing"
import { SensitiveWordService } from "./sensitive-word.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"

const mockPrisma = {
  sensitiveWord: {
    count: jest.fn().mockResolvedValue(0),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
}

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
}

function row(word: string, category = "GENERAL", replacement: string | null = null, remark: string | null = null) {
  return { id: word, word, category, replacement, remark, enabled: true, createdAt: new Date(), updatedAt: new Date() }
}

describe("SensitiveWordService", () => {
  let svc: SensitiveWordService

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      providers: [
        SensitiveWordService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()
    svc = m.get(SensitiveWordService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.sensitiveWord.count.mockResolvedValue(0)
    mockPrisma.sensitiveWord.createMany.mockResolvedValue({ count: 0 })
    mockPrisma.sensitiveWord.findMany.mockResolvedValue([])
    mockRedis.getJson.mockResolvedValue(null)
  })

  describe("onModuleInit / loadWords", () => {
    it("DB 有词时直接加载（不再播种）", async () => {
      mockPrisma.sensitiveWord.count.mockResolvedValue(3)
      mockPrisma.sensitiveWord.findMany.mockResolvedValue([row("加微信"), row("赌博"), row("六四")])
      await (svc as any).loadWords()
      expect(svc.listWords()).toContain("加微信")
      expect(mockPrisma.sensitiveWord.createMany).not.toHaveBeenCalled()
    })

    it("DB 为空时播种默认词库并迁移旧版 Redis 词", async () => {
      mockRedis.getJson.mockResolvedValue(["旧版遗留词"])
      mockPrisma.sensitiveWord.findMany.mockResolvedValue([row("赌博"), row("旧版遗留词")])
      await (svc as any).loadWords()
      expect(mockPrisma.sensitiveWord.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      )
      const seeded = mockPrisma.sensitiveWord.createMany.mock.calls[0][0].data as Array<{ word: string }>
      expect(seeded.map((d) => d.word)).toContain("旧版遗留词")
      expect(seeded.map((d) => d.word)).toContain("赌博")
      expect(svc.listWords()).toContain("旧版遗留词")
    })

    it("合规词（COMPLIANCE_A/B）不进通用拦截集，只进合规词条", async () => {
      mockPrisma.sensitiveWord.count.mockResolvedValue(3)
      mockPrisma.sensitiveWord.findMany.mockResolvedValue([
        row("赌博"),
        row("改运", "COMPLIANCE_A"),
        row("算命", "COMPLIANCE_B", "命理文化分析"),
      ])
      await (svc as any).loadWords()
      expect(svc.listWords()).toEqual(["赌博"])
      expect(svc.check("大师帮你改运算命")).toEqual([])
      const compliance = svc.getComplianceWords()
      expect(compliance).toContainEqual({ word: "改运", level: "A", replacement: null, remark: null })
      expect(compliance).toContainEqual({ word: "算命", level: "B", replacement: "命理文化分析", remark: null })
    })
  })

  describe("check", () => {
    beforeEach(() => {
      (svc as any).words = new Set(["加微信", "赌博", "博彩", "贷款"])
    })

    it("空文本返回空数组", () => {
      expect(svc.check("")).toEqual([])
      expect(svc.check(null as any)).toEqual([])
    })

    it("无敏感词返回空数组", () => {
      expect(svc.check("今天天气真好")).toEqual([])
    })

    it("命中单个敏感词", () => {
      expect(svc.check("加微信私聊")).toEqual(["加微信"])
    })

    it("命中多个敏感词", () => {
      const hits = svc.check("加微信参与赌博和博彩")
      expect(hits).toContain("加微信")
      expect(hits).toContain("赌博")
      expect(hits).toContain("博彩")
    })

    it("大小写不敏感", () => {
      (svc as any).words = new Set(["VIP", "test"])
      expect(svc.check("vip服务")).toContain("VIP")
      expect(svc.check("TEST内容")).toContain("test")
    })

    it("词库为空时返回空数组", () => {
      (svc as any).words = new Set()
      expect(svc.check("赌博")).toEqual([])
    })
  })

  describe("hasSensitive", () => {
    it("有敏感词返回 true", () => {
      (svc as any).words = new Set(["赌博"])
      expect(svc.hasSensitive("参与赌博")).toBe(true)
    })

    it("无敏感词返回 false", () => {
      (svc as any).words = new Set(["赌博"])
      expect(svc.hasSensitive("正常内容")).toBe(false)
    })
  })

  describe("filter", () => {
    it("替换敏感词为星号", () => {
      (svc as any).words = new Set(["赌博", "加微信"])
      const { clean, hits } = svc.filter("参与赌博加微信")
      expect(hits).toHaveLength(2)
      expect(clean).not.toContain("赌博")
      expect(clean).not.toContain("加微信")
    })

    it("无敏感词时原样返回", () => {
      (svc as any).words = new Set(["赌博"])
      const { clean, hits } = svc.filter("正常文本")
      expect(clean).toBe("正常文本")
      expect(hits).toEqual([])
    })
  })

  describe("addWord", () => {
    it("默认 GENERAL：upsert 入库并进通用拦截集", async () => {
      (svc as any).words = new Set<string>()
      ;(svc as any).entries = new Map()
      await svc.addWord("新敏感词")
      expect(mockPrisma.sensitiveWord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { word: "新敏感词" } }),
      )
      expect((svc as any).words.has("新敏感词")).toBe(true)
    })

    it("合规 B 级：带 replacement 入库，不进通用拦截集", async () => {
      (svc as any).words = new Set<string>()
      ;(svc as any).entries = new Map()
      await svc.addWord("算命", "COMPLIANCE_B", "命理文化分析")
      expect((svc as any).words.has("算命")).toBe(false)
      expect(svc.getComplianceWords()).toContainEqual({
        word: "算命", level: "B", replacement: "命理文化分析", remark: null,
      })
    })
  })

  describe("addWords", () => {
    it("批量添加去重去空并入库", async () => {
      (svc as any).words = new Set<string>()
      ;(svc as any).entries = new Map()
      await svc.addWords(["词1", "词2", " 词1 ", ""])
      expect(mockPrisma.sensitiveWord.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      )
      const data = mockPrisma.sensitiveWord.createMany.mock.calls[0][0].data as Array<{ word: string }>
      expect(data).toHaveLength(2)
      expect(svc.listWords()).toEqual(["词1", "词2"])
    })
  })

  describe("removeWord", () => {
    it("删除 DB 记录并同步内存", async () => {
      (svc as any).words = new Set(["词1", "词2"])
      ;(svc as any).entries = new Map([["词1", row("词1")], ["词2", row("词2")]])
      await svc.removeWord("词1")
      expect(mockPrisma.sensitiveWord.deleteMany).toHaveBeenCalledWith({ where: { word: "词1" } })
      expect((svc as any).words.has("词1")).toBe(false)
      expect((svc as any).words.has("词2")).toBe(true)
    })
  })

  describe("listWords / listEntries", () => {
    it("listWords 返回排序后的通用词", () => {
      (svc as any).words = new Set(["c", "a", "b"])
      expect(svc.listWords()).toEqual(["a", "b", "c"])
    })

    it("listEntries 支持按分类过滤", async () => {
      mockPrisma.sensitiveWord.count.mockResolvedValue(2)
      mockPrisma.sensitiveWord.findMany.mockResolvedValue([row("赌博"), row("改运", "COMPLIANCE_A")])
      await (svc as any).loadWords()
      expect(svc.listEntries("COMPLIANCE_A").map((e) => e.word)).toEqual(["改运"])
      expect(svc.listEntries()).toHaveLength(2)
    })

    it("空词库返回空数组", () => {
      (svc as any).words = new Set()
      expect(svc.listWords()).toEqual([])
    })
  })
})
