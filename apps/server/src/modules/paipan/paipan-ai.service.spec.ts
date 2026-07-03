import { Test } from "@nestjs/testing"
import { PaipanAiService } from "./paipan-ai.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { CoinService } from "../coin/coin.service"
import { BusinessException } from "../../common/business.exception"
import { SCHOOL_DISCLAIMER } from "./bazi-schools"

const mockPrisma = {
  aiAnalysisRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  // 事务：把同一个 aiAnalysisRecord mock 透传给回调（spend 用注入的 coin mock，不走 tx）
  $transaction: jest.fn(),
}

const mockRedis = {
  incrWithTtl: jest.fn(),
}

const mockCoin = {
  getBalance: jest.fn(),
  spend: jest.fn(),
}

const mockBaziResult: any = {
  input: { name: "测试", gender: "男", year: 1990, month: 5, day: 15, hour: 10, minute: 0 },
  siZhu: {
    nian: { gan: "庚", zhi: "午", nayin: "路旁土", ganShiShen: "比肩", zhiShiShen: "正官", cangGan: [] },
    yue: { gan: "辛", zhi: "巳", nayin: "白蜡金", ganShiShen: "劫财", zhiShiShen: "偏印", cangGan: [] },
    ri: { gan: "庚", zhi: "午", nayin: "路旁土", ganShiShen: "日主", zhiShiShen: "正官", cangGan: [] },
    shi: { gan: "辛", zhi: "巳", nayin: "白蜡金", ganShiShen: "劫财", zhiShiShen: "偏印", cangGan: [] },
  },
  qiYun: { startAge: 5, desc: "5岁起运", daYun: [] },
  shenSha: [],
  geJu: { name: "正官格", type: "zheng", yongShen: "土", xiShen: "金", jiShen: "木", desc: "官星得令" },
  wuXingEnergy: { mu: 10, huo: 30, tu: 25, jin: 20, shui: 15, desc: "火旺" },
  kongWang: "戌亥",
  shengXiao: "马",
  fenXiTiShi: { ganHe: [], sanHe: [], sanHui: [], liuChong: [], liuHe: [], liuHai: [], sanXing: [] },
  taiYuan: { gan: "丙", zhi: "寅", nayin: "" },
  mingGong: { gan: "丙", zhi: "寅", nayin: "" },
  shenGong: { gan: "丙", zhi: "寅", nayin: "" },
  wangXiang: "",
}

describe("PaipanAiService", () => {
  let svc: PaipanAiService

  beforeAll(async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key"
    const mod = await Test.createTestingModule({
      providers: [
        PaipanAiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CoinService, useValue: mockCoin },
      ],
    }).compile()
    svc = mod.get(PaipanAiService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedis.incrWithTtl.mockResolvedValue({ count: 1, ttl: 86400 })
    // 计费默认场景：该盘尚无流派点评（首份免费）· 非会员 · 余额充足 · 扣币成功
    mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0)
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockCoin.getBalance.mockResolvedValue({ balance: 1000 })
    mockCoin.spend.mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ aiAnalysisRecord: mockPrisma.aiAnalysisRecord }),
    )
  })

  describe("analyzeBazi", () => {
    it("存在缓存记录直接返回", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({
        id: "r1", analysisContent: "已有分析", createdAt: new Date(),
      })
      const result = await svc.analyzeBazi("u1", "p1", mockBaziResult)
      expect(result.isCached).toBe(true)
      expect(result.analysisContent).toBe("已有分析")
    })

    it("无 API Key 时返回友好提示", async () => {
      delete process.env.DEEPSEEK_API_KEY
      // 重建 service 以读取新环境变量
      const mod2 = await Test.createTestingModule({
        providers: [
          PaipanAiService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
        ],
      }).compile()
      const svc2 = mod2.get(PaipanAiService)
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r2", analysisContent: "AI解析服务暂未配置，请联系管理员",
      })
      const result = await svc2.analyzeBazi("u1", "p1", mockBaziResult)
      expect(result.analysisContent).toContain("暂未配置")
      process.env.DEEPSEEK_API_KEY = "sk-test-key"
    })

    it("调用 DeepSeek API 分析成功", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r3", analysisContent: "AI分析结果...", tokenUsage: { promptTokens: 1000, completionTokens: 500 },
      })
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "AI分析结果..." } }],
          usage: { prompt_tokens: 1000, completion_tokens: 500 },
        }),
      })
      const result = await svc.analyzeBazi("u1", "p1", mockBaziResult)
      expect(result.analysisContent).toBe("AI分析结果...")
      expect(result.isCached).toBe(false)
    })

    it("回归：无 school 走通用分析（analyzeType=GENERAL·不触发每日限额）", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r-g", analysisContent: "通用分析", createdAt: new Date(),
      })
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "通用分析" } }],
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
      })
      await svc.analyzeBazi("u1", "p1", mockBaziResult)
      // 缓存查询与落库均为 GENERAL，行为完全不变
      expect(mockPrisma.aiAnalysisRecord.findFirst).toHaveBeenCalledWith({
        where: { userId: "u1", paipanRecordId: "p1", analyzeType: "GENERAL" },
      })
      expect(mockPrisma.aiAnalysisRecord.create.mock.calls[0][0].data.analyzeType).toBe("GENERAL")
      // 通用分析不受流派每日限额约束
      expect(mockRedis.incrWithTtl).not.toHaveBeenCalled()
    })
  })

  describe("analyzeBazi 流派点评（AI 师徒）", () => {
    function mockFetchOk(content = "流派点评内容") {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
      })
      global.fetch = fetchMock as any
      return fetchMock
    }

    it("school=ziping 走流派 prompt（师父人设进 system·免责句要求进 user prompt·落库 BAZI_SCHOOL+school）", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r-s1", analysisContent: "流派点评内容", createdAt: new Date(),
      })
      const fetchMock = mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping")

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      const systemMsg = body.messages.find((m: any) => m.role === "system").content
      const userMsg = body.messages.find((m: any) => m.role === "user").content
      // 师父人设写入 system prompt（非通用专家 prompt）
      expect(systemMsg).toContain("衡真先生")
      expect(systemMsg).toContain("子平真诠")
      // user prompt 要求开头固定输出免责句 + 流派章节
      expect(userMsg).toContain(SCHOOL_DISCLAIMER)
      expect(userMsg).toContain("格局判定")
      // 落库 analyzeType=BAZI_SCHOOL + school 字段
      const createData = mockPrisma.aiAnalysisRecord.create.mock.calls[0][0].data
      expect(createData.analyzeType).toBe("BAZI_SCHOOL")
      expect(createData.school).toBe("ziping")
      // 响应带 school/master
      expect(result.school).toBe("ziping")
      expect(result.master).toBe("衡真先生")
      expect(result.isCached).toBe(false)
    })

    it("缓存键含 school：查缓存按流派区分，不同流派不互相命中", async () => {
      // mangpai 无缓存 → 走生成；断言 findFirst 条件精确含 school
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r-s2", analysisContent: "盲派点评", createdAt: new Date(),
      })
      mockFetchOk("盲派点评")
      await svc.analyzeBazi("u1", "p1", mockBaziResult, "mangpai")
      expect(mockPrisma.aiAnalysisRecord.findFirst).toHaveBeenCalledWith({
        where: { userId: "u1", paipanRecordId: "p1", analyzeType: "BAZI_SCHOOL", school: "mangpai" },
      })

      // 同流派已有记录 → 直接命中缓存，不再调 AI、不消耗限额
      jest.clearAllMocks()
      mockRedis.incrWithTtl.mockResolvedValue({ count: 1, ttl: 86400 })
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({
        id: "r-s2", analysisContent: "盲派点评", createdAt: new Date(),
      })
      const cached: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "mangpai")
      expect(cached.isCached).toBe(true)
      expect(cached.master).toBe("琴鹤先生")
      expect(mockRedis.incrWithTtl).not.toHaveBeenCalled()
      expect(mockPrisma.aiAnalysisRecord.create).not.toHaveBeenCalled()
    })

    it("每日限额：超过 10 次拒绝并提示明日再来", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      mockRedis.incrWithTtl.mockResolvedValue({ count: 11, ttl: 3600 })
      const fetchMock = jest.fn()
      global.fetch = fetchMock as any

      await expect(svc.analyzeBazi("u1", "p1", mockBaziResult, "xinpai"))
        .rejects.toThrow("今日请师父看盘次数已用完，明日再来")
      // 限额 key 按用户+日期计数
      expect(mockRedis.incrWithTtl.mock.calls[0][0]).toMatch(/^paipan:school-analyze:u1:\d{8}$/)
      // 超限不得触发 AI 调用与落库
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockPrisma.aiAnalysisRecord.create).not.toHaveBeenCalled()
    })

    it("非法 school 值抛业务异常（服务层防御）", async () => {
      await expect(svc.analyzeBazi("u1", "p1", mockBaziResult, "unknown-school"))
        .rejects.toThrow(BusinessException)
      expect(mockPrisma.aiAnalysisRecord.findFirst).not.toHaveBeenCalled()
    })
  })

  describe("流派点评计费闸门（2026-07-03 拍板：首份免费·会员免费·非会员 30 币/次）", () => {
    function mockFetchOk(content = "流派点评内容") {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
      })
      global.fetch = fetchMock as any
      return fetchMock
    }

    beforeEach(() => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null) // 无缓存
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({
        id: "r-bill", analysisContent: "流派点评内容", createdAt: new Date(),
      })
    })

    it("首份流派点评免费：不查会员不扣币（体验钩子）", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0) // 该盘尚无任何流派点评
      mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping")

      expect(result.costCoin).toBe(0)
      expect(mockCoin.getBalance).not.toHaveBeenCalled()
      expect(mockCoin.spend).not.toHaveBeenCalled()
      expect(mockPrisma.aiAnalysisRecord.create).toHaveBeenCalled()
    })

    it("有效会员追加点评免费：不扣币", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1) // 已有一份流派点评（追加）
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "GOLD", memberExpire: null }) // 终身会员
      mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "mangpai")

      expect(result.costCoin).toBe(0)
      expect(mockCoin.spend).not.toHaveBeenCalled()
      expect(mockPrisma.aiAnalysisRecord.create).toHaveBeenCalled()
    })

    it("非会员追加点评扣币成功：AI 成功后事务内 spend+建记录（默认 30 币）", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1)
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null })
      mockCoin.getBalance.mockResolvedValue({ balance: 100 })
      const fetchMock = mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "xinpai")

      // 扣币在 AI 调用之后、与建记录同一事务内（第三参传 tx）
      expect(fetchMock).toHaveBeenCalled()
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockCoin.spend).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ amountCoin: 30, scene: "BOT_CALL", refId: "p1" }),
        expect.anything(),
      )
      expect(result.costCoin).toBe(30)
      expect(mockPrisma.aiAnalysisRecord.create).toHaveBeenCalled()
    })

    it("会员已过期视为非会员：照常扣币", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1)
      mockPrisma.user.findUnique.mockResolvedValue({
        memberLevel: "GOLD",
        memberExpire: new Date(Date.now() - 86400_000), // 昨天过期
      })
      mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "mangpai")

      expect(result.costCoin).toBe(30)
      expect(mockCoin.spend).toHaveBeenCalled()
    })

    it("国学币不足：调 AI 前预检拒绝，message 带单价，无记录残留", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(2)
      mockCoin.getBalance.mockResolvedValue({ balance: 5 }) // 余额不足 30
      const fetchMock = jest.fn()
      global.fetch = fetchMock as any

      await expect(svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping"))
        .rejects.toThrow("国学币不足，追加师父点评需 30 币")
      // 明知不足不烧 AI 成本，且不落任何记录
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockCoin.spend).not.toHaveBeenCalled()
      expect(mockPrisma.aiAnalysisRecord.create).not.toHaveBeenCalled()
    })

    it("并发透支兜底：事务内扣币失败整体回滚，不落记录（统一余额不足文案）", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1)
      mockCoin.getBalance.mockResolvedValue({ balance: 100 }) // 预检通过
      const { ErrorCode } = await import("../../common/error-codes")
      mockCoin.spend.mockRejectedValue(new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "虚拟币余额不足"))
      mockFetchOk()

      await expect(svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping"))
        .rejects.toThrow("国学币不足，追加师父点评需 30 币")
      // spend 在 create 之前抛出 → 记录未创建（真实事务下即便已创建也会回滚）
      expect(mockPrisma.aiAnalysisRecord.create).not.toHaveBeenCalled()
    })

    it("并发防重：同盘同流派唯一约束冲突(P2002)返回已存在记录，不重复扣币", async () => {
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0) // 首份免费路径（chargeCoin=0）
      mockPrisma.aiAnalysisRecord.findFirst
        .mockResolvedValueOnce(null) // 缓存查询未命中 → 继续生成
        .mockResolvedValueOnce({ id: "dup-1", analysisContent: "已存在点评", createdAt: new Date() }) // 冲突后回查
      const { Prisma } = await import("@prisma/client")
      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "x",
      } as any)
      mockPrisma.aiAnalysisRecord.create.mockRejectedValue(p2002)
      mockFetchOk()

      const result: any = await svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping")

      // 事务整体回滚（未扣币）→ 幂等返回已落库的那一份
      expect(result.id).toBe("dup-1")
      expect(result.isCached).toBe(true)
      expect(result.costCoin).toBe(0)
      expect(mockCoin.spend).not.toHaveBeenCalled()
    })

    it("单价走环境变量 PAIPAN_SCHOOL_PRICE_COIN", async () => {
      process.env.PAIPAN_SCHOOL_PRICE_COIN = "50"
      try {
        mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1)
        mockCoin.getBalance.mockResolvedValue({ balance: 40 }) // 够默认价 30，但不够 50
        const fetchMock = jest.fn()
        global.fetch = fetchMock as any

        await expect(svc.analyzeBazi("u1", "p1", mockBaziResult, "ziping"))
          .rejects.toThrow("国学币不足，追加师父点评需 50 币")
        expect(fetchMock).not.toHaveBeenCalled()
      } finally {
        delete process.env.PAIPAN_SCHOOL_PRICE_COIN
      }
    })
  })

  describe("getAnalysesByPaipanRecord", () => {
    it("返回该盘全部分析并标注 school/master", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([
        { id: "a1", paipanRecordId: "p1", analyzeType: "GENERAL", school: null, analysisContent: "通用", isCached: false, createdAt: new Date() },
        { id: "a2", paipanRecordId: "p1", analyzeType: "BAZI_SCHOOL", school: "ziping", analysisContent: "子平", isCached: false, createdAt: new Date() },
        { id: "a3", paipanRecordId: "p1", analyzeType: "BAZI_SCHOOL", school: "xinpai", analysisContent: "新派", isCached: false, createdAt: new Date() },
      ])
      const result = await svc.getAnalysesByPaipanRecord("p1", "u1")
      expect(result.total).toBe(3)
      expect(result.items[0].master).toBeNull()
      expect(result.items[1].master).toBe("衡真先生")
      expect(result.items[2].master).toBe("明澈先生")
      expect(mockPrisma.aiAnalysisRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paipanRecordId: "p1", userId: "u1" } }),
      )
      // pricing 元数据：已有流派点评 → firstFree=false；非会员；默认单价 30
      expect(result.pricing).toEqual({ firstFree: false, priceCoin: 30, isMember: false })
    })

    it("pricing：该盘尚无流派点评时 firstFree=true·会员时 isMember=true", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([
        { id: "a1", paipanRecordId: "p1", analyzeType: "GENERAL", school: null, analysisContent: "通用", isCached: false, createdAt: new Date() },
      ])
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "GOLD", memberExpire: null })
      const result = await svc.getAnalysesByPaipanRecord("p1", "u1")
      expect(result.pricing).toEqual({ firstFree: true, priceCoin: 30, isMember: true })
    })
  })

  describe("getAnalysisRecord", () => {
    it("返回分析记录", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({
        id: "r1", paipanRecordId: "p1", analyzeType: "GENERAL",
        analysisContent: "分析内容", modelName: null, tokenUsage: null,
        isCached: false, createdAt: new Date(),
      })
      const result = await svc.getAnalysisRecord("r1", "u1")
      expect(result.id).toBe("r1")
    })

    it("记录不存在", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      await expect(svc.getAnalysisRecord("no", "u1")).rejects.toThrow(BusinessException)
    })
  })

  describe("getAnalysisByPaipanRecord", () => {
    it("根据排盘记录ID获取分析", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({
        id: "r1", paipanRecordId: "p1", analyzeType: "GENERAL",
        analysisContent: "分析内容", modelName: null, tokenUsage: null,
        isCached: false, createdAt: new Date(),
      })
      const result = await svc.getAnalysisByPaipanRecord("p1", "u1")
      expect(result.paipanRecordId).toBe("p1")
    })

    it("无分析记录", async () => {
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue(null)
      await expect(svc.getAnalysisByPaipanRecord("no", "u1")).rejects.toThrow(BusinessException)
    })
  })

  describe("getUserAnalysisHistory", () => {
    it("分页返回用户分析历史", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([{ id: "r1" }])
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1)
      const result = await svc.getUserAnalysisHistory("u1", 1, 10)
      expect(result.total).toBe(1)
    })
  })
})
