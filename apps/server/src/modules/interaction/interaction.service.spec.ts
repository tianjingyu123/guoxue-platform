import { Test } from "@nestjs/testing"
import { InteractionService } from "./interaction.service"
import { PrismaService } from "../../prisma/prisma.service"
import { NotificationService } from "../notification/notification.service"
import { BusinessException } from "../../common/business.exception"

const mockPrisma = {
  like: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  collect: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  follow: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  report: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  article: {
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  course: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  video: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  product: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  post: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  // 治理 TODO#3：举报满阈值自动隐藏（圈子治理配置 + 圈子）
  circleGovernanceConfig: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  circle: {
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({}),
  },
  userBehavior: {
    create: jest.fn().mockResolvedValue({}),
  },
}

const mockNotification = { send: jest.fn().mockResolvedValue({}) }

describe("InteractionService", () => {
  let svc: InteractionService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        InteractionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile()
    svc = mod.get(InteractionService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ═══════════════════ 点赞 ═══════════════════

  describe("toggleLike", () => {
    it("未点过赞则创建点赞", async () => {
      mockPrisma.like.findUnique.mockResolvedValue(null)
      mockPrisma.like.create.mockResolvedValue({ id: "l1" })
      const result = await svc.toggleLike("u1", { targetType: "ARTICLE", targetId: "a1" })
      expect(result.liked).toBe(true)
      expect(mockPrisma.like.create).toHaveBeenCalled()
    })

    it("已点过赞则取消点赞", async () => {
      mockPrisma.like.findUnique.mockResolvedValue({ id: "l1" })
      mockPrisma.like.delete.mockResolvedValue({})
      const result = await svc.toggleLike("u1", { targetType: "ARTICLE", targetId: "a1" })
      expect(result.liked).toBe(false)
      expect(mockPrisma.like.delete).toHaveBeenCalled()
    })
  })

  describe("removeLike", () => {
    it("按记录 ID 删除自己的点赞", async () => {
      mockPrisma.like.findUnique.mockResolvedValue({ id: "l1", userId: "u1" })
      mockPrisma.like.delete.mockResolvedValue({})

      const result = await svc.removeLike("u1", "l1")

      expect(result).toEqual({ success: true })
      expect(mockPrisma.like.delete).toHaveBeenCalledWith({ where: { id: "l1" } })
    })

    it("不能删除他人的点赞", async () => {
      mockPrisma.like.findUnique.mockResolvedValue({ id: "l1", userId: "u2" })
      await expect(svc.removeLike("u1", "l1")).rejects.toThrow(BusinessException)
      expect(mockPrisma.like.delete).not.toHaveBeenCalled()
    })

    it("记录不存在时不创建反向点赞", async () => {
      mockPrisma.like.findUnique.mockResolvedValue(null)
      await expect(svc.removeLike("u1", "missing")).rejects.toThrow(BusinessException)
      expect(mockPrisma.like.create).not.toHaveBeenCalled()
    })
  })

  describe("isLiked", () => {
    it("返回用户点赞的 targetId 集合", async () => {
      mockPrisma.like.findMany.mockResolvedValue([{ targetId: "a1" }, { targetId: "a3" }])
      const result = await svc.isLiked("u1", "ARTICLE", ["a1", "a2", "a3"])
      expect(result.includes("a1")).toBe(true)
      expect(result.includes("a2")).toBe(false)
      expect(result.includes("a3")).toBe(true)
    })
  })

  describe("getLikeCount", () => {
    it("返回点赞数", async () => {
      mockPrisma.like.count.mockResolvedValue(42)
      const result = await svc.getLikeCount("ARTICLE", "a1")
      expect(result).toBe(42)
    })
  })

  describe("getMyLikes", () => {
    it("多态批量补全目标详情（每类型一次查询，目标已删降级为 null）", async () => {
      mockPrisma.like.findMany.mockResolvedValue([
        { id: "l1", targetType: "ARTICLE", targetId: "a1", createdAt: new Date() },
        { id: "l2", targetType: "COURSE", targetId: "c1", createdAt: new Date() },
        { id: "l3", targetType: "ARTICLE", targetId: "a-deleted", createdAt: new Date() },
      ])
      mockPrisma.like.count.mockResolvedValue(3)
      mockPrisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "文章一", cover: "c.jpg", user: { nickname: "作者A", avatar: null } },
      ])
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "课程一", cover: null, user: { nickname: "讲师B", avatar: "b.png" } },
      ])

      const result = await svc.getMyLikes("u1", 1, 20)

      // 每种类型仅一次 findMany，绝不 N+1
      expect(mockPrisma.article.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.course.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ["a1", "a-deleted"] } } }),
      )

      expect(result.total).toBe(3)
      expect(result.items[0].target).toMatchObject({ id: "a1", type: "article", title: "文章一" })
      expect(result.items[0].target?.author).toEqual({ nickname: "作者A", avatar: "" })
      expect(result.items[1].target).toMatchObject({ id: "c1", type: "course", title: "课程一" })
      // 目标已删除 → null，前端降级"内容已删除"
      expect(result.items[2].target).toBeNull()
    })
  })

  // ═══════════════════ 评论 ═══════════════════

  describe("createComment", () => {
    it("创建评论成功", async () => {
      mockPrisma.comment.create.mockResolvedValue({
        id: "c1", content: "好文章",
        user: { id: "u1", nickname: "张三", avatar: null },
      })
      const result = await svc.createComment("u1", {
        targetType: "ARTICLE", targetId: "a1", content: "好文章",
      })
      expect(result.content).toBe("好文章")
      expect(mockPrisma.comment.create).toHaveBeenCalled()
    })
  })

  describe("listComments", () => {
    it("分页返回评论含回复", async () => {
      mockPrisma.comment.findMany.mockResolvedValue([{ id: "c1" }])
      mockPrisma.comment.count.mockResolvedValue(1)
      const result = await svc.listComments({ targetType: "ARTICLE", targetId: "a1" })
      expect(result.total).toBe(1)
      expect(result.comments).toHaveLength(1)
    })

    it("默认过滤已隐藏评论", async () => {
      mockPrisma.comment.findMany.mockResolvedValue([])
      mockPrisma.comment.count.mockResolvedValue(0)
      await svc.listComments({})
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) }),
      )
    })
  })

  describe("deleteComment", () => {
    it("评论不存在抛出 NotFoundException", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null)
      await expect(svc.deleteComment("no", "u1")).rejects.toThrow(BusinessException)
    })

    it("删除评论及子回复", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })
      mockPrisma.comment.deleteMany.mockResolvedValue({})
      mockPrisma.comment.delete.mockResolvedValue({})
      const result = await svc.deleteComment("c1", "u1")
      expect(result.success).toBe(true)
      expect(mockPrisma.comment.deleteMany).toHaveBeenCalledWith({ where: { parentId: "c1" } })
    })
  })

  describe("hideComment", () => {
    it("隐藏评论", async () => {
      mockPrisma.comment.update.mockResolvedValue({ id: "c1", status: "HIDDEN" })
      const result = await svc.hideComment("c1")
      expect(result.status).toBe("HIDDEN")
    })
  })

  // ═══════════════════ 收藏 ═══════════════════

  describe("toggleCollect", () => {
    it("未收藏则创建收藏", async () => {
      mockPrisma.collect.findUnique.mockResolvedValue(null)
      mockPrisma.collect.create.mockResolvedValue({ id: "cl1" })
      const result = await svc.toggleCollect("u1", { targetType: "ARTICLE", targetId: "a1" })
      expect(result.collected).toBe(true)
    })

    it("已收藏则取消收藏", async () => {
      mockPrisma.collect.findUnique.mockResolvedValue({ id: "cl1" })
      mockPrisma.collect.delete.mockResolvedValue({})
      const result = await svc.toggleCollect("u1", { targetType: "ARTICLE", targetId: "a1" })
      expect(result.collected).toBe(false)
    })
  })

  describe("getUserCollects", () => {
    it("分页返回用户收藏", async () => {
      mockPrisma.collect.findMany.mockResolvedValue([{ id: "cl1" }])
      mockPrisma.collect.count.mockResolvedValue(1)
      const result = await svc.getUserCollects("u1", 1, 10)
      expect(result.total).toBe(1)
    })
  })

  // ═══════════════════ 关注 ═══════════════════

  describe("toggleFollow", () => {
    it("不能关注自己", async () => {
      await expect(svc.toggleFollow("u1", { followedUserId: "u1" })).rejects.toThrow(BusinessException)
    })

    it("关注成功", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null)
      mockPrisma.follow.create.mockResolvedValue({ id: "f1" })
      const result = await svc.toggleFollow("u1", { followedUserId: "u2" })
      expect(result.followed).toBe(true)
    })

    it("取消关注", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({ id: "f1" })
      mockPrisma.follow.delete.mockResolvedValue({})
      const result = await svc.toggleFollow("u1", { followedUserId: "u2" })
      expect(result.followed).toBe(false)
    })
  })

  describe("getFollowers", () => {
    it("分页返回粉丝列表", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ id: "f1" }])
      mockPrisma.follow.count.mockResolvedValue(1)
      const result = await svc.getFollowers("u1")
      expect(result.total).toBe(1)
    })
  })

  describe("getFollowing", () => {
    it("分页返回关注列表", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ id: "f2" }])
      mockPrisma.follow.count.mockResolvedValue(1)
      const result = await svc.getFollowing("u1")
      expect(result.total).toBe(1)
    })
  })

  // ═══════════════════ 举报 ═══════════════════

  describe("report", () => {
    it("创建举报", async () => {
      mockPrisma.report.create.mockResolvedValue({ id: "r1", reason: "违规内容" })
      const result = await svc.report("u1", { targetType: "COMMENT", targetId: "c1", reason: "违规内容" })
      expect(result.id).toBe("r1")
      // 非 POST 举报不触发自动隐藏链路
      expect(mockPrisma.post.findUnique).not.toHaveBeenCalled()
    })
  })

  // 治理 TODO#3（2026-07-11）：圈内帖子被举报满阈值自动隐藏
  describe("report 满阈值自动隐藏", () => {
    const reportDto = { targetType: "POST", targetId: "p1", reason: "广告" }

    beforeEach(() => {
      mockPrisma.report.create.mockResolvedValue({ id: "r1" })
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({ reportAutoHideEnabled: true, reportAutoHideThreshold: 3 })
      mockPrisma.circle.findUnique.mockResolvedValue({ ownerId: "owner1", name: "测试圈" })
    })

    it("去重举报人满阈值：帖子置 HIDDEN+修正 postCount+通知圈主", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "PUBLISHED", title: "违规帖" })
      mockPrisma.report.findMany.mockResolvedValue([{ reporterId: "a" }, { reporterId: "b" }, { reporterId: "c" }])
      mockPrisma.post.updateMany.mockResolvedValue({ count: 1 })

      await svc.report("u1", reportDto)

      expect(mockPrisma.post.updateMany).toHaveBeenCalledWith({
        where: { id: "p1", status: { not: "HIDDEN" } },
        data: { status: "HIDDEN" },
      })
      expect(mockPrisma.circle.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { postCount: { decrement: 1 } } })
      expect(mockNotification.send).toHaveBeenCalledTimes(1)
      expect(mockNotification.send.mock.calls[0][0]).toBe("owner1")
      expect(mockNotification.send.mock.calls[0][1].title).toContain("自动隐藏")
      // 只数未处理举报且按举报人去重
      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { targetType: "POST", targetId: "p1", status: "PENDING" },
        distinct: ["reporterId"],
      }))
    })

    it("未达阈值：不隐藏不通知", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "PUBLISHED", title: "帖" })
      mockPrisma.report.findMany.mockResolvedValue([{ reporterId: "a" }, { reporterId: "b" }])
      await svc.report("u1", reportDto)
      expect(mockPrisma.post.updateMany).not.toHaveBeenCalled()
      expect(mockNotification.send).not.toHaveBeenCalled()
    })

    it("已隐藏的帖子不重复处理·圈子关闭 reportAutoHide 不处理", async () => {
      // 已隐藏
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "HIDDEN", title: "帖" })
      await svc.report("u1", reportDto)
      expect(mockPrisma.circleGovernanceConfig.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.post.updateMany).not.toHaveBeenCalled()
      // 开关关闭
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "PUBLISHED", title: "帖" })
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({ reportAutoHideEnabled: false, reportAutoHideThreshold: 3 })
      await svc.report("u1", reportDto)
      expect(mockPrisma.report.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.post.updateMany).not.toHaveBeenCalled()
    })

    it("非圈内帖子（无 circleId）不触发", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: null, status: "PUBLISHED", title: "帖" })
      await svc.report("u1", reportDto)
      expect(mockPrisma.circleGovernanceConfig.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.post.updateMany).not.toHaveBeenCalled()
    })
  })

  describe("listReports", () => {
    it("分页返回举报列表", async () => {
      mockPrisma.report.findMany.mockResolvedValue([{ id: "r1" }])
      mockPrisma.report.count.mockResolvedValue(1)
      const result = await svc.listReports({ page: 1, pageSize: 10 })
      expect(result.total).toBe(1)
    })
  })

  describe("processReport", () => {
    it("处理举报", async () => {
      mockPrisma.report.update.mockResolvedValue({ id: "r1", status: "PROCESSED" })
      const result = await svc.processReport("r1", "已删除违规内容")
      expect(result.status).toBe("PROCESSED")
    })
  })

  describe("dismissReport", () => {
    it("驳回举报", async () => {
      mockPrisma.report.update.mockResolvedValue({ id: "r1", status: "DISMISSED" })
      const result = await svc.dismissReport("r1")
      expect(result.status).toBe("DISMISSED")
    })
  })

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("getMyLikes: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.like.findMany.mockResolvedValue([])
      mockPrisma.like.count.mockResolvedValue(0)
      await svc.getMyLikes("u1", "abc" as any, 20)
      const arg = mockPrisma.like.findMany.mock.calls.at(-1)![0]
      expect(Number.isNaN(arg.skip)).toBe(false)
      expect(arg.skip).toBe(0)
    })
  })
})
