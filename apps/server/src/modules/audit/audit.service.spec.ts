import { Test } from "@nestjs/testing"
import { AuditService } from "./audit.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { ModerationService } from "./moderation.service"
import { ModerationAiService } from "./moderation-ai.service"
import { SensitiveWordService } from "./sensitive-word.service"

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  configSystem: {
    findUnique: jest.fn(),
  },
  contentAuditRecord: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  article: { findMany: jest.fn(), update: jest.fn() },
  course: { findMany: jest.fn(), update: jest.fn() },
  video: { findMany: jest.fn(), update: jest.fn() },
  liveRoom: { findMany: jest.fn(), update: jest.fn() },
}

const mockRedis = {
  delByPattern: jest.fn().mockResolvedValue(undefined),
}

const mockModeration = {
  imageModeration: jest.fn(),
  textModeration: jest.fn(),
  isImagePass: jest.fn(),
  isTextPass: jest.fn(),
  getBlockedLabels: jest.fn(),
  getTextSuggestion: jest.fn(),
  getImageSuggestion: jest.fn(),
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
        { provide: RedisService, useValue: mockRedis },
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

    it("page='abc' 时 skip 不为 NaN（safePagination 归一化）", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)
      await svc.list({ page: "abc" as any })
      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(Number.isNaN(arg.skip)).toBe(false)
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

  describe("moderateImageOrThrow — UGC 图片先审后发（P0 合规）", () => {
    it("无图片时直接放行（不调用审核）", async () => {
      await expect(svc.moderateImageOrThrow([], { scene: "CIRCLE_POST" })).resolves.toBeUndefined()
      await expect(svc.moderateImageOrThrow(undefined, { scene: "CIRCLE_POST" })).resolves.toBeUndefined()
      await expect(svc.moderateImageOrThrow("   ", { scene: "CIRCLE_POST" })).resolves.toBeUndefined()
      expect(mockModeration.imageModeration).not.toHaveBeenCalled()
    })

    it("Pass 放行（单张 URL 亦支持）", async () => {
      mockModeration.imageModeration.mockResolvedValue({ Suggestion: "Pass" })
      mockModeration.getImageSuggestion.mockReturnValue("Pass")
      mockModeration.getBlockedLabels.mockReturnValue([])
      await expect(svc.moderateImageOrThrow("https://img/1.jpg", { scene: "USER_AVATAR" })).resolves.toBeUndefined()
      expect(mockModeration.imageModeration).toHaveBeenCalledWith({ imageUrl: "https://img/1.jpg", bizType: "USER_AVATAR" })
    })

    it("任一张 Block 即硬拦截（抛 CONTENT_MODERATION_BLOCKED）并记 CONTENT_BLOCK_IMAGE 日志", async () => {
      mockModeration.imageModeration.mockResolvedValue({ Suggestion: "Block" })
      mockModeration.getImageSuggestion.mockReturnValue("Block")
      mockModeration.getBlockedLabels.mockReturnValue(["Porn"])
      mockPrisma.auditLog.create.mockResolvedValue({})
      await expect(
        svc.moderateImageOrThrow(["https://img/ok.jpg", "https://img/bad.jpg"], { scene: "PRODUCT_REVIEW", userId: "u1" }),
      ).rejects.toThrow()
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "CONTENT_BLOCK_IMAGE" }) }),
      )
    })

    it("Review 转人工复审但 fail-open 放行（记 CONTENT_REVIEW_IMAGE）", async () => {
      mockModeration.imageModeration.mockResolvedValue({ Suggestion: "Review" })
      mockModeration.getImageSuggestion.mockReturnValue("Review")
      mockModeration.getBlockedLabels.mockReturnValue([])
      mockPrisma.auditLog.create.mockResolvedValue({})
      await expect(svc.moderateImageOrThrow("https://img/x.jpg", { scene: "CIRCLE_POST" })).resolves.toBeUndefined()
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "CONTENT_REVIEW_IMAGE" }) }),
      )
    })

    it("审核服务不可用（抛异常）时 fail-open 放行，不阻断上传", async () => {
      mockModeration.imageModeration.mockRejectedValue(new Error("网络超时"))
      await expect(svc.moderateImageOrThrow("https://img/x.jpg", { scene: "CIRCLE_POST" })).resolves.toBeUndefined()
    })
  })

  // ───── 内容开放范围 + 平台审核分流（P2/P3）─────

  describe("resolveContentVisibility", () => {
    it("默认（未传 visibility）= CIRCLE_ONLY，圈内直生效 APPROVED", async () => {
      const r = await svc.resolveContentVisibility({ circleId: "c1" })
      expect(r).toEqual({ visibility: "CIRCLE_ONLY", auditStatus: "APPROVED" })
      expect(mockPrisma.configSystem.findUnique).not.toHaveBeenCalled()
    })

    it("非法 visibility 归一为 CIRCLE_ONLY", async () => {
      const r = await svc.resolveContentVisibility({ visibility: "WHATEVER", circleId: "c1" })
      expect(r.visibility).toBe("CIRCLE_ONLY")
    })

    it("PLATFORM + 平台管理员 → 自动过审 APPROVED", async () => {
      const r = await svc.resolveContentVisibility({ visibility: "PLATFORM", circleId: "c1", isAdmin: true })
      expect(r).toEqual({ visibility: "PLATFORM", auditStatus: "APPROVED" })
    })

    it("PLATFORM + 官方圈 → 自动过审 APPROVED", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "official-1" })
      const r = await svc.resolveContentVisibility({ visibility: "PLATFORM", circleId: "official-1" })
      expect(r).toEqual({ visibility: "PLATFORM", auditStatus: "APPROVED" })
    })

    it("PLATFORM + 普通圈成员 → PENDING（进平台人工审核队列）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "official-1" })
      const r = await svc.resolveContentVisibility({ visibility: "PLATFORM", circleId: "c-normal" })
      expect(r).toEqual({ visibility: "PLATFORM", auditStatus: "PENDING" })
    })
  })

  describe("openContentAudit", () => {
    it("登记 ContentAuditRecord（机审已过 PASSED·责任到人）", async () => {
      mockPrisma.contentAuditRecord.create.mockResolvedValue({})
      await svc.openContentAudit({ contentType: "VIDEO", contentId: "v1", circleId: "c1", submitterId: "u1" })
      expect(mockPrisma.contentAuditRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentType: "VIDEO", contentId: "v1", circleId: "c1", submitterId: "u1",
            auditMode: "PRE_PUBLISH", machineStatus: "PASSED",
          }),
        }),
      )
    })

    it("登记失败只记日志不抛出（不回滚发布）", async () => {
      mockPrisma.contentAuditRecord.create.mockRejectedValue(new Error("db down"))
      await expect(
        svc.openContentAudit({ contentType: "ARTICLE", contentId: "a1", submitterId: "u1" }),
      ).resolves.toBeUndefined()
    })
  })

  describe("reviewContent", () => {
    const pendingRecord = {
      id: "rec1", contentType: "VIDEO", contentId: "v1", circleId: "c1",
      submitterId: "u1", finalStatus: "PENDING",
    }

    it("通过：回写内容表 APPROVED + 失效列表缓存 + 记审计日志", async () => {
      mockPrisma.contentAuditRecord.findUnique.mockResolvedValue(pendingRecord)
      mockPrisma.contentAuditRecord.update.mockImplementation(({ data }: any) => Promise.resolve({ ...pendingRecord, ...data }))
      mockPrisma.video.update.mockResolvedValue({})
      mockPrisma.auditLog.create.mockResolvedValue({})

      const r = await svc.reviewContent("rec1", "admin1", "approve")
      expect(r.finalStatus).toBe("APPROVED")
      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: "v1" },
        data: { auditStatus: "APPROVED", auditReason: null },
      })
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("video:list:*")
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "CONTENT_AUDIT_APPROVE" }) }),
      )
    })

    it("驳回：记驳回原因（发布者可见）+ 回写 REJECTED", async () => {
      mockPrisma.contentAuditRecord.findUnique.mockResolvedValue(pendingRecord)
      mockPrisma.contentAuditRecord.update.mockImplementation(({ data }: any) => Promise.resolve({ ...pendingRecord, ...data }))
      mockPrisma.video.update.mockResolvedValue({})
      mockPrisma.auditLog.create.mockResolvedValue({})

      const r = await svc.reviewContent("rec1", "admin1", "reject", "内容与平台调性不符")
      expect(r.finalStatus).toBe("REJECTED")
      expect(r.rejectReason).toBe("内容与平台调性不符")
      expect(mockPrisma.video.update).toHaveBeenCalledWith({
        where: { id: "v1" },
        data: { auditStatus: "REJECTED", auditReason: "内容与平台调性不符" },
      })
    })

    it("已审结记录不可重复审核（抛业务异常）", async () => {
      mockPrisma.contentAuditRecord.findUnique.mockResolvedValue({ ...pendingRecord, finalStatus: "APPROVED" })
      await expect(svc.reviewContent("rec1", "admin1", "approve")).rejects.toThrow()
    })

    it("记录不存在抛业务异常", async () => {
      mockPrisma.contentAuditRecord.findUnique.mockResolvedValue(null)
      await expect(svc.reviewContent("nope", "admin1", "approve")).rejects.toThrow()
    })

    it("ARTICLE（无 auditReason 列）只回写 auditStatus", async () => {
      mockPrisma.contentAuditRecord.findUnique.mockResolvedValue({ ...pendingRecord, contentType: "ARTICLE", contentId: "a1" })
      mockPrisma.contentAuditRecord.update.mockImplementation(({ data }: any) => Promise.resolve({ ...pendingRecord, ...data }))
      mockPrisma.article.update.mockResolvedValue({})
      mockPrisma.auditLog.create.mockResolvedValue({})

      await svc.reviewContent("rec1", "admin1", "approve")
      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { auditStatus: "APPROVED" },
      })
    })
  })
})
