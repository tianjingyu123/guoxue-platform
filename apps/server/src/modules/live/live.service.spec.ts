import { Test } from "@nestjs/testing";
import { LiveService } from "./live.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LiveStreamService } from "./live-stream.service";
import { WebhookService } from "../webhook/webhook.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notification/notification.service";
import { ImService } from "../im/im.service";
import { BusinessException } from "../../common/business.exception";
import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine";

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
  product: {
    findMany: jest.fn(),
  },
  liveMinuteData: {
    aggregate: jest.fn(),
  },
  giftRecord: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  order: {
    aggregate: jest.fn(),
  },
  comment: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  like: {
    count: jest.fn(),
  },
  liveProduct: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  liveMutedUser: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  follow: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRedis = {
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  scard: jest.fn().mockResolvedValue(5),
  sismember: jest.fn().mockResolvedValue(false),
  smembers: jest.fn().mockResolvedValue([]),
};
const mockNotification = {
  send: jest.fn().mockResolvedValue({ id: "n1" }),
  batchSend: jest.fn().mockResolvedValue({ success: true, count: 0 }),
};
const mockStream = {
  genPushUrl: jest.fn().mockReturnValue("rtmp://push.example.com/live/room_r1"),
  genPlayUrls: jest.fn().mockReturnValue({ flv: "https://play.example.com/live/room_r1.flv" }),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };
const mockIm = { createGroup: jest.fn().mockResolvedValue({ GroupId: "live_r1" }) };
const mockAudit = {
  moderateTextOrThrow: jest.fn().mockResolvedValue(undefined),
  moderateImageOrThrow: jest.fn().mockResolvedValue(undefined),
  // 默认按 CIRCLE_ONLY 直生效；分流逻辑本体在 audit.service.spec 覆盖
  resolveContentVisibility: jest.fn().mockResolvedValue({ visibility: "CIRCLE_ONLY", auditStatus: "APPROVED" }),
  openContentAudit: jest.fn().mockResolvedValue(undefined),
  queueContentModeration: jest.fn(),
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
        { provide: ImService, useValue: mockIm },
      ],
    }).compile();
    svc = mod.get(LiveService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (run: (tx: typeof mockPrisma) => unknown) => run(mockPrisma));
  });

  describe("streamer settings", () => {
    it("读取已持久化的直播通知与互动偏好", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        nickname: "清和先生",
        avatar: "https://img/avatar.webp",
        bio: "讲解易学经典",
        notifySettings: { liveNewViewer: false, liveReward: true, liveComment: true, liveOrder: false },
        creatorSettings: { liveCover: "https://img/cover.webp", livePrivacy: { allowGift: false, autoRecord: false } },
      });

      const result = await svc.getStreamerSettings("u1");

      expect(result.profile).toEqual({
        name: "清和先生",
        desc: "讲解易学经典",
        cover: "https://img/cover.webp",
      });
      expect(result.notify).toEqual({ newViewer: false, reward: true, comment: true, order: false });
      expect(result.privacy).toEqual({
        allowComment: true,
        allowGift: false,
        showViewCount: true,
        autoRecord: false,
      });
    });

    it("保存时只合并直播白名单键，不覆盖其他模块偏好", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        nickname: "旧名称",
        bio: "",
        notifySettings: { message: false, liveReward: false },
        creatorSettings: { specialty: "易经", livePrivacy: { allowGift: true } },
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.saveStreamerSettings("u1", {
        profile: { name: " 新直播间 ", desc: " 新简介 ", cover: "https://img/new.webp" },
        notify: { reward: true, order: false, unknown: true },
        privacy: { allowGift: false, showViewCount: false, unknown: true },
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: expect.objectContaining({
          nickname: "新直播间",
          bio: "新简介",
          notifySettings: expect.objectContaining({ message: false, liveReward: true, liveOrder: false }),
          creatorSettings: expect.objectContaining({
            specialty: "易经",
            liveCover: "https://img/new.webp",
            livePrivacy: { allowGift: false, showViewCount: false },
          }),
        }),
      });
      const data = mockPrisma.user.update.mock.calls[0][0].data;
      expect(data.notifySettings.unknown).toBeUndefined();
      expect(data.creatorSettings.livePrivacy.unknown).toBeUndefined();
    });

    it("拒绝空直播间名称", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        nickname: "旧名称", bio: "", notifySettings: {}, creatorSettings: {},
      });
      await expect(svc.saveStreamerSettings("u1", {
        profile: { name: "   ", desc: "", cover: "" },
      })).rejects.toThrow(BusinessException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("public live discovery", () => {
    it("匿名请求已关注直播时返回真实空列表且不查公共池", async () => {
      const result = await svc.listRooms(undefined, 1, 20, undefined, undefined, undefined, null);
      expect(result).toEqual({ rooms: [], total: 0, page: 1, pageSize: 20 });
      expect(mockPrisma.liveRoom.findMany).not.toHaveBeenCalled();
    });

    it("已登录关注筛选把关注主播集合下沉到数据库条件", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([{ followedUserId: "host1" }]);
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);

      await svc.listRooms("LIVING", 1, 20, undefined, undefined, undefined, "viewer1");

      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ hostUserId: { in: ["host1"] } }),
      }));
    });

    it("主播列表按主播去重并返回真实粉丝数，不再生成固定4.5评分", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([
        { id: "room-ended", cover: "", status: "ENDED", viewCount: 20, hostUserId: "host1" },
        { id: "room-live", cover: "cover.webp", status: "LIVING", viewCount: 10, hostUserId: "host1" },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "host1", nickname: "主播甲", avatar: "avatar.webp", bio: "专注经典", identityVerified: true },
      ]);
      mockPrisma.follow.findMany.mockResolvedValue([
        { followedUserId: "host1" },
        { followedUserId: "host1" },
      ]);

      const result = await svc.getHosts();

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: "room-live",
        name: "主播甲",
        followers: 2,
        liveCount: 2,
        rating: 0,
        isLive: true,
        verified: true,
      });
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ visibility: "PLATFORM", auditStatus: "APPROVED" }),
      }));
    });

    it("预告详情使用真实排期、预约状态、预约人数和分钟时长", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "room1",
        userId: "host1",
        hostUserId: "host1",
        title: "周易直播",
        cover: "",
        status: "WAITING",
        visibility: "PLATFORM",
        auditStatus: "APPROVED",
        startTime: new Date("2026-08-01T12:00:00.000Z"),
        endTime: new Date("2026-08-01T13:30:00.000Z"),
        user: { id: "host1", nickname: "主播甲", avatar: "avatar.webp", bio: "讲解周易" },
      });
      mockRedis.scard.mockResolvedValue(12);
      mockRedis.sismember.mockResolvedValue(true);
      mockPrisma.follow.count.mockResolvedValue(34);

      const result = await svc.getPreview("room1", "viewer1");

      expect(result).toMatchObject({
        hostId: "host1",
        hostFollowers: 34,
        bookedCount: 12,
        estimatedDuration: 90,
        scheduledAt: "2026-08-01T12:00:00.000Z",
        status: "WAITING",
        isBooked: true,
      });
    });
  });

  describe("getLiveProducts", () => {
    it("主播选品库排除精确隔离商品", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await svc.getLiveProducts("on");

      expect(mockPrisma.product.findMany.mock.calls[0][0].where.id).toEqual({
        notIn: [...PUBLIC_QUARANTINED_IDS.product],
      });
    });
  });

  describe("createRoom", () => {
    it("创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] });
      const result = await svc.createRoom("u1", { title: "国学直播", hostUserId: "u1" });
      expect(result.id).toBe("r1");
    });

    it("带商品创建直播间成功", async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }]);
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

    it("发布预约预告时必须同时提供首图和介绍", async () => {
      await expect(svc.createRoom("u1", {
        title: "预约直播",
        startTime: "2026-08-01T12:00:00.000Z",
        description: "本场介绍",
      })).rejects.toThrow("发布直播预告前请上传首图");
      await expect(svc.createRoom("u1", {
        title: "预约直播",
        startTime: "2026-08-01T12:00:00.000Z",
        cover: "https://img/cover.webp",
      })).rejects.toThrow("发布直播预告前请填写直播介绍");
      expect(mockPrisma.liveRoom.create).not.toHaveBeenCalled();
    });

    it("首图和介绍齐全的预约预告可发布并持久化介绍", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "preview1", products: [] });
      await svc.createRoom("u1", {
        title: "预约直播",
        description: "  本场讲解十二宫位  ",
        cover: "https://img/cover.webp",
        startTime: "2026-08-01T12:00:00.000Z",
      });
      expect(mockPrisma.liveRoom.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          description: "本场讲解十二宫位",
          cover: "https://img/cover.webp",
          startTime: new Date("2026-08-01T12:00:00.000Z"),
        }),
      }));
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

  describe("updateRoomProducts", () => {
    it("房主可按请求顺序事务替换本场商品", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p2" }, { id: "p1" }]);
      mockPrisma.liveProduct.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.liveProduct.createMany.mockResolvedValue({ count: 2 });

      const result = await svc.updateRoomProducts("host1", "room1", ["p2", "p1"]);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.liveProduct.deleteMany).toHaveBeenCalledWith({ where: { liveId: "room1" } });
      expect(mockPrisma.liveProduct.createMany).toHaveBeenCalledWith({
        data: [
          { liveId: "room1", productId: "p2", sortOrder: 0 },
          { liveId: "room1", productId: "p1", sortOrder: 1 },
        ],
      });
      expect(result).toEqual({ success: true, count: 2, productIds: ["p2", "p1"] });
    });

    it("清空商品时只删除关联，不写空批次", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.liveProduct.deleteMany.mockResolvedValue({ count: 2 });

      await svc.updateRoomProducts("host1", "room1", []);

      expect(mockPrisma.liveProduct.deleteMany).toHaveBeenCalledWith({ where: { liveId: "room1" } });
      expect(mockPrisma.liveProduct.createMany).not.toHaveBeenCalled();
    });

    it("非房主不能修改商品", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });

      await expect(svc.updateRoomProducts("other", "room1", ["p1"])).rejects.toThrow(BusinessException);

      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("下架或不存在商品拒绝整批保存，不破坏原清单", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }]);

      await expect(svc.updateRoomProducts("host1", "room1", ["p1", "off"])).rejects.toThrow("部分商品已下架或不存在");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.liveProduct.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("updateRoom 编辑事务", () => {
    it("待开播场次可原位更新配置和商品，不会新建直播间", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "host1", status: "WAITING", circleId: "circle1",
        cover: "https://img/cover.webp", description: "本场介绍", startTime: new Date("2026-08-01T12:00:00.000Z"),
      });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }]);
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "room1", title: "新标题", status: "WAITING" });
      mockPrisma.liveProduct.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.liveProduct.createMany.mockResolvedValue({ count: 1 });

      const result: any = await svc.updateRoom("host1", "room1", {
        title: "新标题", description: "新介绍", startTime: "2026-08-01 20:00", chargeType: "PAID", chargePrice: 9.9,
        quality: "hd", orientation: "landscape", productIds: ["p1"],
      });

      expect(mockPrisma.liveRoom.create).not.toHaveBeenCalled();
      expect(mockPrisma.liveRoom.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "room1" },
        data: expect.objectContaining({ title: "新标题", description: "新介绍", chargeType: "PAID", chargePrice: 9.9, quality: "hd", orientation: "landscape" }),
      }));
      expect(mockPrisma.liveProduct.createMany).toHaveBeenCalledWith({ data: [{ liveId: "room1", productId: "p1", sortOrder: 0 }] });
      expect(result.id).toBe("room1");
      expect(mockAudit.queueContentModeration).toHaveBeenCalledWith(expect.objectContaining({
        contentType: "LIVE",
        contentId: "room1",
        userId: "host1",
        circleId: "circle1",
        text: "新标题\n新介绍",
      }));
    });

    it("直播开始后拒绝修改排期配置", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", status: "LIVING" });
      await expect(svc.updateRoom("host1", "room1", { quality: "hd" })).rejects.toThrow("直播开始后不能修改");
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });
  });

  describe("直播收费护栏", () => {
    it("付费直播缺少有效票价时拒绝更新", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "host1", status: "WAITING", circleId: "circle1", chargeType: "FREE", chargePrice: null,
      });
      await expect(svc.updateRoom("host1", "room1", { chargeType: "PAID", chargePrice: 0 }))
        .rejects.toThrow("付费直播必须设置大于 0 元的票价");
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });
  });

  describe("getRoom 观看计数", () => {
    const room = {
      id: "room1", hostUserId: "host1", userId: "creator1", visibility: "CIRCLE_ONLY",
      auditStatus: "APPROVED", products: [], user: null, circle: null,
    };

    it("主播查看自己的管理详情不虚增观看量", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
      await svc.getRoom("room1", "host1");
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });

    it("普通观众查看公开详情仍正常计一次观看", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
      mockPrisma.liveRoom.update.mockResolvedValue({});
      await svc.getRoom("room1", "viewer1");
      expect(mockPrisma.liveRoom.update).toHaveBeenCalledWith({
        where: { id: "room1" }, data: { viewCount: { increment: 1 } },
      });
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

  describe("startLive（房主自主开播·拍板 20260711）", () => {
    const waitingRoom = {
      id: "r1", status: "WAITING", auditStatus: "APPROVED", hostUserId: "host1", title: "国学直播", circleId: null,
    };

    it("非房主且非管理员 → 403", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(waitingRoom);
      await expect(svc.startLive("r1", "someone-else", false)).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });

    it("房主本人开播成功，创建 IM AVChatRoom 弹幕群并回写 imGroupId", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(waitingRoom);
      mockPrisma.liveRoom.update.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));
      mockIm.createGroup.mockResolvedValue({ GroupId: "live_r1" });
      const result: any = await svc.startLive("r1", "host1", false);
      expect(result.status).toBe("LIVING");
      expect(mockIm.createGroup).toHaveBeenCalledWith("live_r1", expect.any(String), "AVChatRoom", "host1");
      // imGroupId 回写落库
      expect(mockPrisma.liveRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { imGroupId: "live_r1" } }),
      );
      expect(result.imGroupId).toBe("live_r1");
    });

    it("管理员可代任意房间开播", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(waitingRoom);
      mockPrisma.liveRoom.update.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));
      const result: any = await svc.startLive("r1", "admin1", true);
      expect(result.status).toBe("LIVING");
    });

    it("IM 建群失败 fail-open：只记日志，开播不受影响", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(waitingRoom);
      mockPrisma.liveRoom.update.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));
      mockIm.createGroup.mockRejectedValue(new Error("IM 未配置，请联系管理员"));
      const result: any = await svc.startLive("r1", "host1", false);
      expect(result.status).toBe("LIVING");
      expect(result.imGroupId).toBeUndefined();
    });
  });

  describe("endRoom", () => {
    it("结束直播间成功（内部调用·无操作者时跳过房主校验）", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "host1" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      const result = await svc.endRoom("r1");
      expect(result.status).toBe("ENDED");
    });

    it("房主本人可结束直播", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "host1" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      const result = await svc.endRoom("r1", "host1", false);
      expect(result.status).toBe("ENDED");
    });

    it("非房主且非管理员结束直播 → 403", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "host1" });
      await expect(svc.endRoom("r1", "someone-else", false)).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
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

    it("带 circleId（圈内列表）不加开放范围过滤，但排除 SELF_ONLY/已下架", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(0);
      await svc.listRooms("LIVING", 1, 20, "c1");
      expect(mockPrisma.liveRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "LIVING", circleId: "c1", visibility: { not: "SELF_ONLY" }, auditStatus: { not: "REJECTED" } },
        }),
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

  describe("getMyRooms", () => {
    it("返回管理端需要的真实直播形态、商品数与回放字段", async () => {
      const createdAt = new Date();
      mockPrisma.liveRoom.findMany.mockResolvedValue([{
        id: "r1",
        title: "测试回放",
        cover: "https://img/cover.webp",
        status: "REPLAY",
        viewCount: 18,
        chargeType: "FREE",
        orientation: "landscape",
        quality: "uhd",
        replayUrl: "https://media/replay.mp4",
        startTime: createdAt,
        endTime: createdAt,
        createdAt,
        visibility: "PLATFORM",
        auditStatus: "APPROVED",
        _count: { products: 2 },
      }]);

      const result = await svc.getMyRooms("host1");

      expect(result.stats).toMatchObject({ totalViews: 18, endedCount: 1, totalCount: 1 });
      expect(result.rooms[0]).toMatchObject({
        productCount: 2,
        hasProducts: true,
        orientation: "landscape",
        quality: "uhd",
        replayUrl: "https://media/replay.mp4",
      });
    });
  });

  describe("getConsoleData", () => {
    it("返回直播间真实画质档位且空数据使用零值", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "host1", viewCount: 0, title: "测试直播", quality: "uhd",
      });
      mockPrisma.liveMinuteData.aggregate.mockResolvedValue({ _max: { onlineCount: null }, _avg: { onlineCount: null } });
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: null } });
      mockPrisma.giftRecord.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.comment.count.mockResolvedValue(0);
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.like.count.mockResolvedValue(0);
      mockPrisma.liveProduct.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await svc.getConsoleData("r1", "host1");

      expect(result.quality).toBe("uhd");
      expect(result.stats).toMatchObject({ onlineCount: 0, totalViews: 0, totalGift: 0, totalSales: 0 });
      expect(mockPrisma.liveRoom.findUnique).toHaveBeenCalledWith({
        where: { id: "r1" },
        select: { hostUserId: true, viewCount: true, title: true, quality: true },
      });
    });

    it("非房主不能读取主播控制台", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", viewCount: 0, title: "直播", quality: "basic" });
      await expect(svc.getConsoleData("r1", "other")).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveMinuteData.aggregate).not.toHaveBeenCalled();
    });
  });

  describe("listMutedUsers", () => {
    it("房主仅能读取当前有效禁言并获得安全用户资料", async () => {
      const mutedAt = new Date("2026-07-21T10:00:00.000Z");
      const expiresAt = new Date("2099-07-21T11:00:00.000Z");
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.liveMutedUser.findMany.mockResolvedValue([
        { id: "m1", liveRoomId: "r1", userId: "u1", mutedBy: "host1", mutedAt, expiresAt: null },
        { id: "m2", liveRoomId: "r1", userId: "u2", mutedBy: "host1", mutedAt, expiresAt },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "观众甲", avatar: "https://img.example/a.jpg" },
        { id: "u2", nickname: "观众乙", avatar: null },
      ]);

      const result = await svc.listMutedUsers("r1", "host1");

      expect(mockPrisma.liveMutedUser.findMany).toHaveBeenCalledWith({
        where: {
          liveRoomId: "r1",
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
        orderBy: { mutedAt: "desc" },
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["u1", "u2"] } },
        select: { id: true, nickname: true, avatar: true },
      });
      expect(result).toEqual([
        { id: "m1", userId: "u1", nickname: "观众甲", avatar: "https://img.example/a.jpg", mutedAt, expiresAt: null, isPermanent: true },
        { id: "m2", userId: "u2", nickname: "观众乙", avatar: null, mutedAt, expiresAt, isPermanent: false },
      ]);
    });

    it("非房主不能读取禁言名单", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });

      await expect(svc.listMutedUsers("r1", "other")).rejects.toThrow(BusinessException);

      expect(mockPrisma.liveMutedUser.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it("管理员可以读取空禁言名单且不额外查询用户", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.liveMutedUser.findMany.mockResolvedValue([]);

      await expect(svc.listMutedUsers("r1", "admin1", true)).resolves.toEqual([]);

      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
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

    it("委托开播时返回真实主播资料而不是创建人资料", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1",
        title: "直播",
        userId: "creator1",
        hostUserId: "host1",
        visibility: "PLATFORM",
        auditStatus: "APPROVED",
        user: { id: "creator1", nickname: "创建人", avatar: "", bio: "", _count: { followers: 1 } },
        circle: null,
        products: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "host1", nickname: "真实主播", avatar: "host.webp", bio: "专注经典讲解", _count: { followers: 18 },
      });
      mockPrisma.liveRoom.update.mockResolvedValue({});

      const result = await svc.getRoom("r1", "viewer1");

      expect(result.user).toMatchObject({ id: "host1", nickname: "真实主播", bio: "专注经典讲解" });
      expect(result.user?._count.followers).toBe(18);
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
