import { Test } from "@nestjs/testing"
import { AuditService } from "./audit.service"
import { PrismaService } from "../../prisma/prisma.service"
import { ModerationService } from "./moderation.service"
import { ModerationAiService } from "./moderation-ai.service"
import { SensitiveWordService } from "./sensitive-word.service"

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}

const mockModeration = {
  imageModeration: jest.fn(),
  textModeration: jest.fn(),
  isImagePass: jest.fn(),
  isTextPass: jest.fn(),
  getBlockedLabels: jest.fn(),
  getTextSuggestion: jest.fn(),
}

const mockModerationAi = {
  available: false,
  review: jest.fn(),
}

const mockSensitiveWord = {
  check: jest.fn().mockReturnValue([]),
}

describe("AuditService", () => {
  let svc: AuditService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ModerationService, useValue: mockModeration },
        { provide: ModerationAiService, useValue: mockModerationAi },
        { provide: SensitiveWordService, useValue: mockSensitiveWord },
      ],
    }).compile()
    svc = mod.get(AuditService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("log", () => {
    it("记录审计日志", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "a1", action: "LOGIN" })
      const result = await svc.log({ userId: "u1", action: "LOGIN", ip: "127.0.0.1" })
      expect(result.action).toBe("LOGIN")
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u1", action: "LOGIN", ip: "127.0.0.1" }),
        }),
      )
    })
  })

  describe("moderateImage", () => {
    it("图片审核通过", async () => {
      mockModeration.imageModeration.mockResolvedValue({ Suggestion: "Pass" })
      mockModeration.isImagePass.mockReturnValue(true)
      mockModeration.getBlockedLabels.mockReturnValue([])
      mockPrisma.auditLog.create.mockResolvedValue({})
      const result = await svc.moderateImage("https://img.example.com/1.jpg")
      expect(result.passed).toBe(true)
    })

    it("图片审核不通过", async () => {
      mockModeration.imageModeration.mockResolvedValue({ Suggestion: "Block" })
      mockModeration.isImagePass.mockReturnValue(false)
      mockModeration.getBlockedLabels.mockReturnValue(["Porn", "Politics"])
      mockPrisma.auditLog.create.mockResolvedValue({})
      const result = await svc.moderateImage("https://img.example.com/bad.jpg")
      expect(result.passed).toBe(false)
      expect(result.labels).toContain("Porn")
    })
  })

  describe("moderateText", () => {
    it("文本审核通过", async () => {
      mockModeration.textModeration.mockResolvedValue({ Suggestion: "Pass" })
      mockModeration.getTextSuggestion.mockReturnValue("Pass")
      mockModeration.getBlockedLabels.mockReturnValue([])
      mockPrisma.auditLog.create.mockResolvedValue({})
      const result = await svc.moderateText("正常内容")
      expect(result.passed).toBe(true)
    })

    it("文本审核不通过", async () => {
      mockModeration.textModeration.mockResolvedValue({ Suggestion: "Block" })
      mockModeration.getTextSuggestion.mockReturnValue("Block")
      mockModeration.getBlockedLabels.mockReturnValue(["Abuse"])
      mockPrisma.auditLog.create.mockResolvedValue({})
      const result = await svc.moderateText("违规内容")
      expect(result.passed).toBe(false)
    })
  })

  describe("list", () => {
    it("分页返回审计日志", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: "a1" }])
      mockPrisma.auditLog.count.mockResolvedValue(1)
      const result = await svc.list({ page: 1, pageSize: 10 })
      expect(result.total).toBe(1)
      expect(result.logs).toHaveLength(1)
    })

    it("按 action 过滤", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)
      await svc.list({ action: "LOGIN" })
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ action: "LOGIN" }) }),
      )
    })

    it("按日期范围过滤", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)
      await svc.list({ startDate: "2026-01-01", endDate: "2026-01-31" })
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      )
    })
  })

  describe("getActions", () => {
    it("返回去重的 action 列表", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ action: "LOGIN" }, { action: "UPDATE" }])
      const result = await svc.getActions()
      expect(result).toHaveLength(2)
    })
  })

  describe("moderateTextOrThrow 审核服务不可用时 fail-open", () => {
    it("腾讯审核凭证失效/API失败(THIRD_AI_FAILED)时放行，不阻断 UGC", async () => {
      const { BusinessException } = require("../../common/business.exception")
      const { ErrorCode } = require("../../common/error-codes")
      mockSensitiveWord.check.mockReturnValue([]) // 本地词库不命中
      mockModeration.textModeration.mockRejectedValue(
        new BusinessException(ErrorCode.THIRD_AI_FAILED, "tms TextModeration 失败: 凭证无效"),
      )
      // 不应抛异常（fail-open 放行）
      await expect(svc.moderateTextOrThrow("正常内容", { scene: "UGC" })).resolves.toBeUndefined()
    })

    it("本地敏感词命中时硬拦截（仍抛 BLOCKED）", async () => {
      mockSensitiveWord.check.mockReturnValue(["违禁词"])
      await expect(svc.moderateTextOrThrow("含违禁词的内容", { scene: "UGC" })).rejects.toThrow()
      mockSensitiveWord.check.mockReturnValue([])
    })
  })
})
