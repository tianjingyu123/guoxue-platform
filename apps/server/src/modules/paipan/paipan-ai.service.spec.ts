import { Test } from "@nestjs/testing"
import { PaipanAiService } from "./paipan-ai.service"
import { PrismaService } from "../../prisma/prisma.service"
import { BusinessException } from "../../common/business.exception"

const mockPrisma = {
  aiAnalysisRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
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
      ],
    }).compile()
    svc = mod.get(PaipanAiService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
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
