import { Test, TestingModule } from "@nestjs/testing"
import { ReportService } from "./report.service"
import { PrismaService } from "../../prisma/prisma.service"

function mockPrisma() {
  const reportMethods = ["findFirst", "findUnique", "findMany", "create", "update", "count", "delete", "upsert"]
  const postMethods = ["findUnique", "update"]
  const commentMethods = ["findUnique", "update"]
  const circleMethods = ["findUnique", "update"]
  const courseMethods = ["findUnique", "update"]
  const productMethods = ["findUnique", "update"]
  const articleMethods = ["findUnique", "update"]
  const userMethods = ["findUnique", "update"]

  const m: any = {}
  m.report = {}
  m.post = {}
  m.comment = {}
  m.circle = {}
  m.course = {}
  m.product = {}
  m.article = {}
  m.user = {}

  for (const method of reportMethods) m.report[method] = jest.fn()
  for (const method of postMethods) m.post[method] = jest.fn()
  for (const method of commentMethods) m.comment[method] = jest.fn()
  for (const method of circleMethods) m.circle[method] = jest.fn()
  for (const method of courseMethods) m.course[method] = jest.fn()
  for (const method of productMethods) m.product[method] = jest.fn()
  for (const method of articleMethods) m.article[method] = jest.fn()
  for (const method of userMethods) m.user[method] = jest.fn()

  return m
}

describe("ReportService", () => {
  let svc: ReportService
  let prisma: ReturnType<typeof mockPrisma>

  beforeAll(async () => {
    prisma = mockPrisma()
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    svc = m.get(ReportService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("submit", () => {
    it("创建举报成功", async () => {
      prisma.report.findFirst.mockResolvedValue(null)
      prisma.report.create.mockResolvedValue({ id: "rp1", reason: "违规内容" })
      const result: any = await svc.submit("u1", { targetType: "POST", targetId: "p1", reason: "违规内容" })
      expect(result.id).toBe("rp1")
    })

    it("重复提交未处理举报返回提示", async () => {
      prisma.report.findFirst.mockResolvedValue({ id: "rp1", status: "PENDING" })
      const result: any = await svc.submit("u1", { targetType: "POST", targetId: "p1", reason: "又违规" })
      expect(result).toHaveProperty("message")
      expect(result.report.id).toBe("rp1")
    })

    it("已处理的举报可以再次提交", async () => {
      prisma.report.findFirst.mockResolvedValue(null)
      prisma.report.create.mockResolvedValue({ id: "rp2", reason: "再次举报" })
      const result: any = await svc.submit("u1", { targetType: "COMMENT", targetId: "c1", reason: "再次举报" })
      expect(result.id).toBe("rp2")
    })
  })

  describe("handle", () => {
    it("举报不存在时报错", async () => {
      prisma.report.findUnique.mockResolvedValue(null)
      await expect(svc.handle("noexist", { action: "DISMISS" })).rejects.toThrow("举报不存在")
    })

    it("已处理举报不能再次处理", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await expect(svc.handle("rp1", { action: "DISMISS" })).rejects.toThrow("已处理")
    })

    it("DISMISS 直接标记已处理", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING" })
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED", result: "DISMISS" })
      const result = await svc.handle("rp1", { action: "DISMISS" })
      expect(result.status).toBe("PROCESSED")
    })

    it("DISMISS 可附带备注", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING" })
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED", result: "DISMISS: 内容正常" })
      const result = await svc.handle("rp1", { action: "DISMISS", note: "内容正常" })
      expect(result.result).toContain("内容正常")
    })

    it("DELETE_CONTENT 隐藏帖子", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "POST", targetId: "p1" })
      prisma.post.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      const result = await svc.handle("rp1", { action: "DELETE_CONTENT" })
      expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "HIDDEN" } })
      expect(result.status).toBe("PROCESSED")
    })

    it("DELETE_CONTENT 隐藏评论", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "COMMENT", targetId: "c1" })
      prisma.comment.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "DELETE_CONTENT" })
      expect(prisma.comment.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { status: "HIDDEN" } })
    })

    it("BAN_USER 根据帖子找到作者并封禁", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "POST", targetId: "p1" })
      prisma.post.findUnique.mockResolvedValue({ userId: "bad_user" })
      prisma.user.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "BAN_USER" })
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "bad_user" }, data: { status: "DISABLED" } })
    })

    it("BAN_USER 直接封禁被举报用户", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "USER", targetId: "u_bad" })
      prisma.user.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "BAN_USER" })
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u_bad" }, data: { status: "DISABLED" } })
    })

    it("WARN_USER 警告用户", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "USER", targetId: "u_warn" })
      prisma.user.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "WARN_USER" })
      expect(prisma.user.update).toHaveBeenCalled()
    })

    it("DELETE_CONTENT 处理课程下架", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "COURSE", targetId: "co1" })
      prisma.course.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "DELETE_CONTENT" })
      expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: "co1" }, data: { auditStatus: "REJECTED" } })
    })

    it("DELETE_CONTENT 处理商品下架", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "PRODUCT", targetId: "prod1" })
      prisma.product.update.mockResolvedValue({})
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      await svc.handle("rp1", { action: "DELETE_CONTENT" })
      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: "prod1" }, data: { status: "OFF_SHELF" } })
    })

    it("内部删除失败不影响主流程", async () => {
      prisma.report.findUnique.mockResolvedValue({ id: "rp1", status: "PENDING", targetType: "POST", targetId: "p1" })
      prisma.post.update.mockRejectedValue(new Error("DB error"))
      prisma.report.update.mockResolvedValue({ id: "rp1", status: "PROCESSED" })
      const result = await svc.handle("rp1", { action: "DELETE_CONTENT" })
      expect(result.status).toBe("PROCESSED")
    })
  })

  describe("list", () => {
    it("分页返回举报列表", async () => {
      prisma.report.findMany.mockResolvedValue([{ id: "rp1" }])
      prisma.report.count.mockResolvedValue(1)
      const result = await svc.list({ page: 1, pageSize: 20 })
      expect(result.total).toBe(1)
      expect(result.items).toHaveLength(1)
    })

    it("按状态筛选", async () => {
      prisma.report.findMany.mockResolvedValue([])
      prisma.report.count.mockResolvedValue(0)
      await svc.list({ status: "PENDING", page: 1, pageSize: 20 })
      expect(prisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: "PENDING" },
      }))
    })

    it("按目标类型筛选", async () => {
      prisma.report.findMany.mockResolvedValue([])
      prisma.report.count.mockResolvedValue(0)
      await svc.list({ targetType: "POST", page: 1, pageSize: 20 })
      expect(prisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { targetType: "POST" },
      }))
    })
  })

  describe("getTargetStats", () => {
    it("返回举报统计", async () => {
      prisma.report.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3)
      const stats = await svc.getTargetStats("POST", "p1")
      expect(stats.totalReports).toBe(5)
      expect(stats.pendingReports).toBe(3)
    })
  })
})
