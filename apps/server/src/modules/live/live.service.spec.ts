import { Test } from "@nestjs/testing";
import { LiveService } from "./live.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LiveStreamService } from "./live-stream.service";
import { WebhookService } from "../webhook/webhook.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notification/notification.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  liveRoom: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  course: {
    findUnique: jest.fn(),
  },
  courseChapter: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockRedis = {
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  scard: jest.fn().mockResolvedValue(5),
  smembers: jest.fn().mockResolvedValue([]),
};
const mockNotification = {
  send: jest.fn().mockResolvedValue({ id: "n1" }),
  batchSend: jest.fn().mockResolvedValue({ success: true, count: 0 }),
};
const mockStream = {};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };
const mockAudit = {
  moderateTextOrThrow: jest.fn().mockResolvedValue(undefined),
  moderateImageOrThrow: jest.fn().mockResolvedValue(undefined),
  // 默认按 CIRCLE_ONLY 直生效；分流逻辑本体在 audit.service.spec 覆盖
  resolveContentVisibility: jest.fn().mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "APPROVED" }),
  openContentAudit: jest.fn().mockResolvedValue(undefined),
};

describe("LiveService", () => {
  let svc: LiveService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        LiveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: LiveStreamService, useValue: mockStream },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(LiveService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("createRoom", () => {
    it("创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] });
      const result = await svc.createRoom("u1", { title: "国学直播", hostUserId: "u1" });
      expect(result.id).toBe("r1");
    });

    it("带商品创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [{ productId: "p1" }] }),
      );
      const result = await svc.createRoom("u1", {
        title: "直播", hostUserId: "u1", productIds: ["p1"],
      });
      expect(result.products).toBeDefined();
    });

    it("未指定 hostUserId 时默认为当前用户", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [] }),
      );
      const result = await svc.createRoom("u1", { title: "直播", hostUserId: "u1" });
      expect(result.hostUserId).toBe("u1");
    });

    it("关联课程创建直播间", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [], courseId: "co1" }),
      );
      const result = await svc.createRoom("u1", { title: "课程直播", hostUserId: "u1", courseId: "co1" });
      expect(result.courseId).toBe("co1");
    });
  });

  describe("updateRoom", () => {
    it("更新直播间成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "u1" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", title: "新标题" });
      const result = await svc.updateRoom("u1", "r1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
  });

  describe("updateStatus", () => {
    it("WAITING → LIVING 成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "WAITING" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "LIVING", pushUrl: "rtmp://example.com" });
      const result = await svc.updateStatus("r1", "LIVING", { pushUrl: "rtmp://example.com" });
      expect(result.status).toBe("LIVING");
    });

    it("LIVING → ENDED 成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "LIVING" });
      mockPrisma.liveRoom.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data }),
      );
      const result = await svc.updateStatus("r1", "ENDED");
      expect(result.status).toBe("ENDED");
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it("LIVING → REPLAY 成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "LIVING" });
      mockPrisma.liveRoom.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data }),
      );
      const result = await svc.updateStatus("r1", "REPLAY", { replayUrl: "https://example.com/replay.mp4" });
      expect(result.replayUrl).toBe("https://example.com/replay.mp4");
    });

    it("开播（→LIVING）时给预约用户发 LIVE 类圈内通知（#25/#36）", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "WAITING" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "LIVING", title: "客厅布局答疑", circleId: "c1" });
      mockRedis.smembers.mockResolvedValue(["u1", "u2"]);
      await svc.updateStatus("r1", "LIVING", { pushUrl: "rtmp://example.com" });
      await new Promise((r) => setImmediate(r)); // fire-and-forget 刷微任务
      expect(mockRedis.smembers).toHaveBeenCalledWith("live:bookings:r1");
      expect(mockNotification.batchSend).toHaveBeenCalledWith(expect.objectContaining({
        userIds: ["u1", "u2"],
        type: "LIVE_STARTED",
        category: "LIVE",
        circleId: "c1",
        targetType: "LIVE_ROOM",
        targetId: "r1",
      }));
    });

    it("开播但无人预约：不发通知", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "WAITING" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "LIVING", title: "t", circleId: null });
      mockRedis.smembers.mockResolvedValue([]);
      await svc.updateStatus("r1", "LIVING");
      await new Promise((r) => setImmediate(r));
      expect(mockNotification.batchSend).not.toHaveBeenCalled();
    });

    it("非开播流转（→ENDED）不触发预约通知", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ status: "LIVING" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      await svc.updateStatus("r1", "ENDED");
      await new Promise((r) => setImmediate(r));
      expect(mockRedis.smembers).not.toHaveBeenCalled();
      expect(mockNotification.batchSend).not.toHaveBeenCalled();
    });
  });

  describe("endRoom", () => {
    it("结束直播间成功", async () => {
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      const result = await svc.endRoom("r1");
      expect(result.status).toBe("ENDED");
    });
  });

  describe("listRooms", () => {
    it("列出直播间（无过滤）", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      const result = await svc.listRooms();
      expect(result).toHaveProperty("rooms");
      expect(result.total).toBe(0);
    });

    it("按状态过滤（公共池自动附加开放范围隔离）", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms("LIVING");
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "LIVING", visibility: "PLATFORM", auditStatus: "APPROVED" } }),
      );
    });

    it("带 circleId（圈内列表）不加开放范围过滤", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms("LIVING", 1, 20, "c1");
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "LIVING", circleId: "c1" } }),
      );
    });

    it("scope=all（管理端）不加开放范围过滤", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms("LIVING", 1, 20, undefined, undefined, "all");
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "LIVING" } }),
      );
    });
  });

  describe("getRoom", () => {
    it("获取直播间详情成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "直播", user: {}, circle: {}, products: [],
      });
      mockPrisma.liveRoom.update.mockResolvedValue({});
      const result = await svc.getRoom("r1");
      expect(result.id).toBe("r1");
    });

    it("直播间不存在抛出 NotFoundException", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null);
      await expect(svc.getRoom("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteRoom", () => {
    it("删除直播间成功", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "u1" });
      mockPrisma.liveRoom.delete.mockResolvedValue({});
      const result = await svc.deleteRoom("u1", "r1");
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════ 课程联动 ═══════════════════

  describe("listCourseRooms", () => {
    it("获取课程关联的直播间列表", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([{ id: "r1", title: "课程直播", courseId: "co1" }]);
      mockPrisma.liveRoom.count.mockResolvedValue(1);
      const result = await svc.listCourseRooms("co1");
      expect(result.total).toBe(1);
      expect(result.rooms).toHaveLength(1);
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: "co1" } }),
      );
    });

    it("课程无直播间返回空列表", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      const result = await svc.listCourseRooms("co_empty");
      expect(result.total).toBe(0);
    });
  });

  describe("handleLiveEvent - 课程联动", () => {
    it("录制回调自动同步回放为课程章节", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", courseId: "co1", title: "国学直播课",
      });
      mockPrisma.liveRoom.update.mockResolvedValue({});
      mockPrisma.course.findUnique.mockResolvedValue({ id: "co1" });
      mockPrisma.courseChapter.findFirst.mockResolvedValue({ sortOrder: 3 });
      mockPrisma.courseChapter.create.mockResolvedValue({ id: "ch_new", title: "直播回放: 国学直播课" });

      await svc.handleLiveEvent("room_r1", 100, {
        video_url: "https://replay.example.com/live.mp4",
      });

      expect(mockPrisma.liveRoom.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({ status: "REPLAY" }),
      }));
      expect(mockPrisma.courseChapter.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          courseId: "co1",
          mediaUrl: "https://replay.example.com/live.mp4",
        }),
      }));
    });

    it("录制回调但房间未关联课程不创建章节", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r2", courseId: null, title: "普通直播",
      });
      mockPrisma.liveRoom.update.mockResolvedValue({});

      await svc.handleLiveEvent("room_r2", 100, {
        video_url: "https://replay.example.com/other.mp4",
      });

      expect(mockPrisma.courseChapter.create).not.toHaveBeenCalled();
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN 进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("listRooms: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms(undefined, "abc" as any, "xyz" as any);
      const arg = mockPrisma.liveRoom.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(20);
    });

    it("listCourseRooms: 负数 page 归一化第1页·skip=0", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listCourseRooms("co1", -2 as any, 10);
      const arg = mockPrisma.liveRoom.findMany.mock.calls.at(-1)![0];
      expect(arg.skip).toBe(0);
    });
  });
});
