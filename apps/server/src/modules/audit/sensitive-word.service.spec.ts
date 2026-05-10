import { Test } from "@nestjs/testing"
import { SensitiveWordService } from "./sensitive-word.service"
import { RedisService } from "../../redis/redis.service"

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
}

describe("SensitiveWordService", () => {
  let svc: SensitiveWordService

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      providers: [
        SensitiveWordService,
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()
    svc = m.get(SensitiveWordService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("onModuleInit / loadWords", () => {
    it("从 Redis 缓存加载词库", async () => {
      mockRedis.getJson.mockResolvedValue(["加微信", "赌博", "六四"])
      await (svc as any).loadWords()
      expect(svc.listWords()).toContain("加微信")
    })

    it("缓存为空时使用默认词库并保存", async () => {
      mockRedis.getJson.mockResolvedValue(null)
      await (svc as any).loadWords()
      expect(svc.listWords().length).toBeGreaterThan(0)
      expect(mockRedis.setJson).toHaveBeenCalled()
    })

    it("缓存为空数组时使用默认词库", async () => {
      mockRedis.getJson.mockResolvedValue([])
      await (svc as any).loadWords()
      expect(svc.listWords().length).toBeGreaterThan(0)
    })
  })

  describe("check", () => {
    beforeEach(async () => {
      mockRedis.getJson.mockResolvedValue(["加微信", "赌博", "博彩", "贷款"])
      await (svc as any).loadWords()
    })

    it("空文本返回空数组", () => {
      expect(svc.check("")).toEqual([])
      expect(svc.check(null as any)).toEqual([])
    })

    it("无敏感词返回空数组", () => {
      expect(svc.check("今天天气真好")).toEqual([])
    })

    it("命中单个敏感词", () => {
      const hits = svc.check("加微信私聊")
      expect(hits).toEqual(["加微信"])
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
    it("添加并持久化", async () => {
      (svc as any).words = new Set<string>()
      await svc.addWord("新敏感词")
      expect((svc as any).words.has("新敏感词")).toBe(true)
      expect(mockRedis.setJson).toHaveBeenCalled()
    })
  })

  describe("addWords", () => {
    it("批量添加", async () => {
      (svc as any).words = new Set<string>()
      await svc.addWords(["词1", "词2"])
      expect(svc.listWords()).toContain("词1")
      expect(svc.listWords()).toContain("词2")
    })
  })

  describe("removeWord", () => {
    it("删除并持久化", async () => {
      (svc as any).words = new Set(["词1", "词2"])
      await svc.removeWord("词1")
      expect((svc as any).words.has("词1")).toBe(false)
      expect((svc as any).words.has("词2")).toBe(true)
      expect(mockRedis.setJson).toHaveBeenCalled()
    })
  })

  describe("listWords", () => {
    it("返回排序后的词列表", () => {
      (svc as any).words = new Set(["c", "a", "b"])
      expect(svc.listWords()).toEqual(["a", "b", "c"])
    })

    it("空词库返回空数组", () => {
      (svc as any).words = new Set()
      expect(svc.listWords()).toEqual([])
    })
  })

  describe("saveWords", () => {
    it("以 30 天 TTL 保存到 Redis", async () => {
      (svc as any).words = new Set(["词1"])
      await (svc as any).saveWords()
      expect(mockRedis.setJson).toHaveBeenCalledWith(
        "system:sensitive_words:v1",
        ["词1"],
        86400 * 30,
      )
    })
  })
})
