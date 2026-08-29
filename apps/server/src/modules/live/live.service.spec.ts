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
import { CirclePublishGrantService } from "../circle/circle-publish-grant.service";
import { LivePresenceService } from "./live-presence.service";
import { toLiveObsTrtcUserId, toLiveTrtcRoomId } from "./live-trtc.util";
import { CoinService } from "../coin/coin.service";

const mockPrisma = {
  liveRoom: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  liveWatchProgress: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
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
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  gift: {
    findUnique: jest.fn(),
  },
  order: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  ledgerEntry: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  userEarning: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  comment: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  like: {
    count: jest.fn(),
    upsert: jest.fn(),
  },
  liveProduct: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  liveMutedUser: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  liveMic: {
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  circleMember: {
    findFirst: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  follow: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  scard: jest.fn().mockResolvedValue(5),
  sismember: jest.fn().mockResolvedValue(false),
  smembers: jest.fn().mockResolvedValue([]),
  setNX: jest.fn().mockResolvedValue(true),
  ttl: jest.fn().mockResolvedValue(3),
};
const mockNotification = {
  send: jest.fn().mockResolvedValue({ id: "n1" }),
  batchSend: jest.fn().mockResolvedValue({ success: true, count: 0 }),
};
const mockStream = {
  isReady: jest.fn().mockReturnValue(true),
  genPushUrl: jest.fn().mockReturnValue("rtmp://push.example.com/live/room_r1"),
  genPlayUrls: jest.fn().mockReturnValue({ flv: "https://play.example.com/live/room_r1.flv" }),
  genPlayUrlWithAuth: jest.fn().mockReturnValue({ flv: "https://play.example.com/live/room_r1.flv" }),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };
const mockIm = {
  createGroup: jest.fn().mockResolvedValue({ GroupId: "live_r1" }),
  sendGroupMsg: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
  relayLiveGroupMsg: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
  relayLiveGift: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
};
const mockPublishGrants = { assertCanPublish: jest.fn().mockResolvedValue(undefined) };
const mockPresence = {
  getOnlineCount: jest.fn().mockResolvedValue(2),
  touch: jest.fn().mockResolvedValue({ onlineCount: 2, firstVisit: true }),
  leave: jest.fn().mockResolvedValue({ onlineCount: 1 }),
  clearActive: jest.fn().mockResolvedValue(undefined),
};
const mockCoin = {
  getLiveGiftSpendingPreference: jest.fn().mockResolvedValue({ configured: false, eligible: true }),
  updateLiveGiftSpendingPreference: jest.fn().mockResolvedValue({ configured: true, eligible: true }),
  assertLiveGiftSpendAllowed: jest.fn().mockResolvedValue({ spentTodayCoin: 0, reminderEnabled: true }),
  spend: jest.fn().mockResolvedValue({ remaining: 100 }),
};
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
        { provide: CirclePublishGrantService, useValue: mockPublishGrants },
        { provide: LivePresenceService, useValue: mockPresence },
        { provide: CoinService, useValue: mockCoin },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ImService, useValue: mockIm },
      ],
    }).compile();
    svc = mod.get(LiveService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream.isReady.mockReturnValue(true);
    mockRedis.getJson.mockResolvedValue(null);
    mockRedis.setNX.mockResolvedValue(true);
    delete process.env.LIVE_OBS_TRTC_INGEST_ENABLED;
    delete process.env.TRTC_SDK_APP_ID;
    delete process.env.TRTC_SECRET_KEY;
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
    beforeEach(() => {
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "manager1" });
    });

    it("创建直播间成功", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] });
      const result = await svc.createRoom("u1", { title: "国学直播", hostUserId: "u1", circleId: "c1" });
      expect(result.id).toBe("r1");
      expect(mockPublishGrants.assertCanPublish).not.toHaveBeenCalled();
      expect(mockAudit.resolveContentVisibility).toHaveBeenCalledWith(expect.objectContaining({
        visibility: "CIRCLE_ONLY",
        circleId: "c1",
      }));
    });

    it("只有明确选择全平台时才申请平台发布资格", async () => {
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "r-platform", title: "平台直播", products: [] });
      await svc.createRoom("u1", { title: "平台直播", circleId: "c1", visibility: "PLATFORM" });
      expect(mockPublishGrants.assertCanPublish).toHaveBeenCalledWith("u1", "c1", "LIVE", false);
      expect(mockAudit.resolveContentVisibility).toHaveBeenCalledWith(expect.objectContaining({ visibility: "PLATFORM" }));
    });

    it("拒绝没有所属圈子的仅圈子直播，避免产生广场不可见的孤立房间", async () => {
      await expect(svc.createRoom("u1", {
        title: "不可见直播",
        visibility: "CIRCLE_ONLY",
      })).rejects.toThrow("仅圈子可见的直播必须选择所属圈子");
      expect(mockPrisma.liveRoom.create).not.toHaveBeenCalled();
    });

    it("拒绝普通成员冒用他人圈子发起直播", async () => {
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);
      await expect(svc.createRoom("u1", {
        title: "越权直播",
        circleId: "c1",
      })).rejects.toThrow("只有圈主或圈子管理员可以在该圈发起直播");
      expect(mockPrisma.liveRoom.create).not.toHaveBeenCalled();
    });

    it("圈子合伙人与管理员一样可以在所属圈子开播", async () => {
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "partner1" });
      mockPrisma.liveRoom.create.mockResolvedValue({ id: "partner-live", products: [] });
      await expect(svc.createRoom("u1", { title: "合伙人直播", circleId: "c1" }))
        .resolves.toEqual(expect.objectContaining({ id: "partner-live" }));
      expect(mockPrisma.circleMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ role: { in: ["OWNER", "ADMIN", "PARTNER"] } }),
      }));
    });

    it("带商品创建直播间成功", async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }]);
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [{ productId: "p1" }] }),
      );
      const result = await svc.createRoom("u1", {
        title: "直播", hostUserId: "u1", circleId: "c1", productIds: ["p1"],
      });
      expect(result.products).toBeDefined();
    });

    it("未指定 hostUserId 时默认为当前用户", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [] }),
      );
      const result = await svc.createRoom("u1", { title: "直播", hostUserId: "u1", circleId: "c1" });
      expect(result.hostUserId).toBe("u1");
    });

    it("关联课程创建直播间", async () => {
      mockPrisma.liveRoom.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "r1", ...data, products: [], courseId: "co1" }),
      );
      const result = await svc.createRoom("u1", { title: "课程直播", hostUserId: "u1", circleId: "c1", courseId: "co1" });
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
        circleId: "c1",
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

  describe("getRoom 纯读取", () => {
    const room = {
      id: "room1", hostUserId: "host1", userId: "creator1", visibility: "CIRCLE_ONLY",
      auditStatus: "APPROVED", circleId: "circle1", products: [], user: null, circle: null,
    };

    it("主播查看自己的管理详情不虚增观看量", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
      await svc.getRoom("room1", "host1");
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });

    it("圈成员轮询详情不会虚增观看量", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "member1" });
      await svc.getRoom("room1", "viewer1");
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });

    it("非圈成员即使知道房间 ID 也无法读取圈内详情", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);
      await expect(svc.getRoom("room1", "outsider1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });
  });

  describe("直播观看会话", () => {
    const livingRoom = {
      id: "room1", hostUserId: "host1", userId: "creator1", status: "LIVING",
      visibility: "PLATFORM", auditStatus: "APPROVED", circleId: null,
    };

    it("观众心跳进入唯一在线服务", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(livingRoom);

      await expect(svc.touchPresence("room1", "live-session-0001", "viewer1"))
        .resolves.toEqual({ onlineCount: 2, firstVisit: true });
      expect(mockPresence.touch).toHaveBeenCalledWith("room1", "live-session-0001", "viewer1");
    });

    it("主播查看自己的直播不计为观众", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(livingRoom);

      await expect(svc.touchPresence("room1", "live-session-0001", "host1"))
        .resolves.toEqual({ onlineCount: 2, firstVisit: false });
      expect(mockPresence.touch).not.toHaveBeenCalled();
    });
  });

  describe("直播回放观看进度", () => {
    const replayRoom = {
      id: "room1",
      hostUserId: "host1",
      userId: "creator1",
      status: "REPLAY",
      replayUrl: "https://example.com/replay.mp4",
      visibility: "PLATFORM",
      auditStatus: "APPROVED",
    };

    it("没有进度记录时返回可安全续播的零进度", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(replayRoom);
      mockPrisma.liveWatchProgress.findUnique.mockResolvedValue(null);

      await expect(svc.getWatchProgress("viewer1", "room1")).resolves.toEqual({
        positionSeconds: 0,
        durationSeconds: 0,
        completed: false,
        lastWatchedAt: null,
      });
    });

    it("非圈成员不能借回放进度接口探测圈内直播", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        ...replayRoom,
        circleId: "circle1",
        visibility: "CIRCLE_ONLY",
      });
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);
      await expect(svc.getWatchProgress("outsider1", "room1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveWatchProgress.findUnique).not.toHaveBeenCalled();
    });

    it("保存进度时自动钳制播放位置并识别已看完", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(replayRoom);
      mockPrisma.liveWatchProgress.findUnique.mockResolvedValue(null);
      mockPrisma.liveWatchProgress.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const result = await svc.saveWatchProgress("viewer1", "room1", {
        positionSeconds: 999,
        durationSeconds: 100,
        clientSessionId: "session-123",
        clientSequence: 1,
      });

      expect(result).toEqual(expect.objectContaining({
        userId: "viewer1",
        liveRoomId: "room1",
        positionSeconds: 100,
        durationSeconds: 100,
        completed: true,
      }));
    });

    it("同一会话的重复或乱序请求不会覆盖较新进度", async () => {
      const current = {
        id: "p1",
        userId: "viewer1",
        liveRoomId: "room1",
        positionSeconds: 80,
        durationSeconds: 100,
        completed: false,
        clientSessionId: "session-123",
        clientSequence: 8,
      };
      mockPrisma.liveRoom.findUnique.mockResolvedValue(replayRoom);
      mockPrisma.liveWatchProgress.findUnique.mockResolvedValue(current);

      const result = await svc.saveWatchProgress("viewer1", "room1", {
        positionSeconds: 40,
        durationSeconds: 100,
        clientSessionId: "session-123",
        clientSequence: 7,
      });

      expect(result).toBe(current);
      expect(mockPrisma.liveWatchProgress.upsert).not.toHaveBeenCalled();
    });
  });

  describe("直播拉流可见性", () => {
    it("圈成员可以获取正在直播的签名拉流地址", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "room1",
        status: "LIVING",
        hostUserId: "host1",
        userId: "creator1",
        circleId: "circle1",
        visibility: "CIRCLE_ONLY",
        auditStatus: "APPROVED",
        quality: "basic",
      });
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "member1" });

      await expect(svc.getPlayUrl("room1", "viewer1")).resolves.toEqual(expect.objectContaining({ quality: "basic" }));
      expect(mockStream.genPlayUrlWithAuth).toHaveBeenCalledWith("room_room1", "viewer1");
    });

    it("非圈成员不能通过拉流接口绕过圈内可见性", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "room1",
        status: "LIVING",
        hostUserId: "host1",
        userId: "creator1",
        circleId: "circle1",
        visibility: "CIRCLE_ONLY",
        auditStatus: "APPROVED",
      });
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);

      await expect(svc.getPlayUrl("room1", "outsider1")).rejects.toThrow(BusinessException);
      expect(mockStream.genPlayUrlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe("直播公屏可见性", () => {
    const circleRoom = {
      id: "room1",
      hostUserId: "host1",
      userId: "creator1",
      circleId: "circle1",
      visibility: "CIRCLE_ONLY",
      auditStatus: "APPROVED",
      status: "LIVING",
    };

    it("匿名和圈外用户不能读取圈内直播评论", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(circleRoom);
      await expect(svc.listComments("room1")).rejects.toThrow(BusinessException);

      mockPrisma.circleMember.findFirst.mockResolvedValue(null);
      await expect(svc.listComments("room1", "outsider1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.comment.findMany).not.toHaveBeenCalled();
    });

    it("有效圈成员只读取公开且未软删除评论，并强制每页最多20条", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(circleRoom);
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "member1" });
      mockPrisma.comment.findMany.mockResolvedValue([{ id: "comment1", status: "PUBLISHED", deletedAt: null }]);
      mockPrisma.comment.count.mockResolvedValue(1);

      await expect(svc.listComments("room1", "member1", 1, 100)).resolves.toEqual(
        expect.objectContaining({ total: 1, pageSize: 20 }),
      );
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          targetType: "LIVESTREAM",
          targetId: "room1",
          parentId: null,
          status: "PUBLISHED",
          deletedAt: null,
        },
        include: expect.objectContaining({
          replies: expect.objectContaining({ where: { status: "PUBLISHED", deletedAt: null } }),
        }),
        take: 20,
      }));
    });

    it("圈外用户不能通过直播专属评论或点赞写接口绕过可见性", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(circleRoom);
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);

      await expect(svc.sendComment("room1", "outsider1", "绕过评论")).rejects.toThrow(BusinessException);
      await expect(svc.toggleLike("room1", "outsider1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
      expect(mockPrisma.like.upsert).not.toHaveBeenCalled();
    });

    it("watch-context 返回真实互动能力且不暴露在线身份", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(circleRoom);
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "member1" });
      mockPrisma.user.findUnique.mockResolvedValue({ creatorSettings: { livePrivacy: { allowGift: false } } });
      mockPrisma.liveMutedUser.findUnique.mockResolvedValue(null);
      mockRedis.getJson.mockResolvedValue({ followersOnly: false });

      await expect(svc.getWatchContext("room1", "member1")).resolves.toEqual(expect.objectContaining({
        room: expect.objectContaining({ allowGift: false }),
        viewer: expect.objectContaining({ canComment: true, canLike: true, canGift: false }),
        interaction: { allowComment: true, allowLike: true, allowGift: false },
        online: { count: 2, avatars: [] },
      }));
    });
  });

  describe("直播互动治理", () => {
    beforeEach(() => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "room1",
        status: "LIVING",
        hostUserId: "host1",
      });
      mockPrisma.liveMutedUser.findUnique.mockResolvedValue(null);
      mockPrisma.comment.create.mockResolvedValue({ id: "comment1", content: "你好" });
    });

    it("慢速模式使用 Redis 原子租约阻止同一用户连续刷屏", async () => {
      mockRedis.getJson.mockResolvedValue({ slowModeSeconds: 5, followersOnly: false });
      mockRedis.setNX.mockResolvedValue(false);
      mockRedis.ttl.mockResolvedValue(4);

      await expect(svc.sendComment("room1", "viewer1", "你好")).rejects.toThrow("4 秒后再评论");
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it("仅关注者评论模式拒绝未关注用户但不影响主播", async () => {
      mockRedis.getJson.mockResolvedValue({ slowModeSeconds: 0, followersOnly: true });
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      await expect(svc.sendComment("room1", "viewer1", "你好")).rejects.toThrow("仅允许已关注主播");
      await expect(svc.sendComment("room1", "host1", "欢迎大家")).resolves.toEqual(
        expect.objectContaining({ id: "comment1" }),
      );
    });

    it("主播可设置互动规则并获得规范化回读", async () => {
      await expect(svc.updateModerationSettings("room1", "host1", {
        slowModeSeconds: 10,
        followersOnly: true,
      })).resolves.toEqual({ slowModeSeconds: 10, followersOnly: true });
      expect(mockRedis.setJson).toHaveBeenCalledWith(
        "live:moderation:room1",
        { slowModeSeconds: 10, followersOnly: true },
        26 * 60 * 60,
      );
    });

    it("评论通过审核并持久化后由服务端中继到直播 IM 群", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "room1",
        status: "LIVING",
        hostUserId: "host1",
        imGroupId: "live_room1",
      });

      await expect(svc.sendComment("room1", "viewer1", "讲得很好")).resolves.toEqual(
        expect.objectContaining({ id: "comment1" }),
      );
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockIm.relayLiveGroupMsg).toHaveBeenCalledWith("live_room1", "你好", "viewer1");
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

    it("CSS 模式下横屏 OBS 房间也禁止绕过媒体预检直接开播", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        ...waitingRoom,
        orientation: "landscape",
      });

      await expect(svc.startLive("r1", "host1", false)).rejects.toThrow(
        "OBS 直播必须先通过专用页面检测到真实媒体流",
      );
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });

    it("IM 建群失败 fail-open：只记日志，开播不受影响", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue(waitingRoom);
      mockPrisma.liveRoom.update.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));
      mockIm.createGroup.mockRejectedValue(new Error("IM 未配置，请联系管理员"));
      const result: any = await svc.startLive("r1", "host1", false);
      expect(result.status).toBe("LIVING");
      expect(result.imGroupId).toBeUndefined();
    });

    it("推拉流配置不完整时拒绝进入 LIVING，避免产生假开播状态", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1",
        status: "WAITING",
        auditStatus: "APPROVED",
        hostUserId: "host1",
        title: "国学直播",
        circleId: null,
      });
      mockStream.isReady.mockReturnValue(false);

      await expect(svc.startLive("r1", "host1", false)).rejects.toThrow(
        "直播推拉流配置不完整",
      );
      expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
    });
  });

  describe("endRoom", () => {
    it("结束直播间成功（内部调用·无操作者时跳过房主校验）", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "host1" });
      mockPrisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" });
      const result = await svc.endRoom("r1");
      expect(result.status).toBe("ENDED");
      expect(mockPrisma.liveMic.deleteMany).toHaveBeenCalledWith({ where: { liveRoomId: "r1" } });
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

    it("直播列表返回实时在线人数，不再用累计观看冒充在线", async () => {
      mockPrisma.liveRoom.findMany.mockResolvedValue([{
        id: "r1", status: "LIVING", viewCount: 999, user: null, circle: null, _count: { products: 0 },
      }]);
      mockPrisma.liveRoom.count.mockResolvedValue(1);
      mockPresence.getOnlineCount.mockResolvedValueOnce(7);

      const result = await svc.listRooms("LIVING");

      expect(result.rooms[0]).toMatchObject({ id: "r1", viewCount: 999, onlineCount: 7 });
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
      mockPresence.getOnlineCount.mockResolvedValueOnce(0);
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        hostUserId: "host1", viewCount: 0, title: "测试直播", quality: "uhd", startTime: null, imGroupId: "live_r1",
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
      expect(result.imGroupId).toBe("live_r1");
      expect(result.stats).toMatchObject({ onlineCount: 0, totalViews: 0, totalGift: 0, totalSales: 0 });
      expect(mockPrisma.order.aggregate).toHaveBeenCalledWith({
        where: {
          type: "PRODUCT",
          sourceContentType: "LIVE",
          sourceContentId: "r1",
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        },
        _sum: { amount: true },
      });
      expect(mockPrisma.liveRoom.findUnique).toHaveBeenCalledWith({
        where: { id: "r1" },
        select: { hostUserId: true, viewCount: true, title: true, quality: true, startTime: true, imGroupId: true },
      });
    });

    it("非房主不能读取主播控制台", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", viewCount: 0, title: "直播", quality: "basic" });
      await expect(svc.getConsoleData("r1", "other")).rejects.toThrow(BusinessException);
      expect(mockPrisma.liveMinuteData.aggregate).not.toHaveBeenCalled();
    });

    it("公屏把数据库最新优先结果转为时间正序展示", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", viewCount: 2, title: "直播", quality: "basic" });
      mockPrisma.liveMinuteData.aggregate.mockResolvedValue({ _max: { onlineCount: 2 }, _avg: { onlineCount: 1 } });
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 0 } });
      mockPrisma.giftRecord.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.comment.count.mockResolvedValue(2);
      mockPrisma.comment.findMany.mockResolvedValue([
        { userId: "u2", content: "后来消息", createdAt: new Date("2026-08-12T12:00:02Z") },
        { userId: "u1", content: "先来消息", createdAt: new Date("2026-08-12T12:00:01Z") },
      ]);
      mockPrisma.like.count.mockResolvedValue(0);
      mockPrisma.liveProduct.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "甲" }, { id: "u2", nickname: "乙" }]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await svc.getConsoleData("r1", "host1");
      expect(result.danmaku.map((item) => item.content)).toEqual(["先来消息", "后来消息"]);
    });
  });

  describe("getEarnings", () => {
    it("带货页区分直播 GMV 与主播实际佣金，不把成交额冒充可提现收益", async () => {
      const paidAt = new Date();
      mockPrisma.liveRoom.findMany.mockResolvedValue([{ id: "r1", title: "测试直播" }]);
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1", targetId: "p1", sourceContentId: "r1", amount: 88, paidAt, createdAt: paidAt }]);
      mockPrisma.giftRecord.findMany.mockResolvedValue([]);
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([{ id: "le1", refId: "o1", amount: 8.8, createdAt: paidAt }]);
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.userEarning.findMany.mockResolvedValue([]);
      mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 0 } });
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await svc.getEarnings("host1", "7d");

      expect(result.stats).toMatchObject({ goods: 8.8, gmv: 88, total: 8.8 });
      expect(result.records[0]).toMatchObject({ type: "goods", amount: 8.8, live: "测试直播" });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          type: "PRODUCT",
          sourceContentType: "LIVE",
          sourceContentId: { in: ["r1"] },
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        }),
      }));
      expect(mockPrisma.ledgerEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          refType: "ORDER",
          refId: { in: ["o1"] },
          beneficiaryType: "USER",
          beneficiaryId: "host1",
          category: "COMMISSION",
          status: { in: ["PENDING", "SETTLED"] },
        }),
      }));
    });
  });

  describe("flashSaleOrder", () => {
    it("旧直播秒杀伪下单入口明确关闭，不返回无支付订单的成功结果", async () => {
      await expect(svc.flashSaleOrder("fs1", "u1")).rejects.toThrow("直播专属秒杀即将开放");
    });
  });

  describe("featureRoomProduct", () => {
    it("主播只能把本场真实商品设为讲解中", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", status: "LIVING" });
      mockPrisma.liveProduct.findFirst.mockResolvedValue({ productId: "p1" });

      const result = await svc.featureRoomProduct("host1", "r1", "p1");

      expect(result).toEqual({ featuredProductId: "p1" });
      expect(mockRedis.set).toHaveBeenCalledWith("live:featured-product:r1", "p1", 172800);
    });

    it("取消讲解会清除实时状态", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1", status: "LIVING" });

      await expect(svc.featureRoomProduct("host1", "r1", null)).resolves.toEqual({ featuredProductId: null });
      expect(mockRedis.del).toHaveBeenCalledWith("live:featured-product:r1");
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
        mockPrisma.courseChapter.findFirst
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ sortOrder: 3 });
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

      it("同一录制回调重复投递时不重复创建课程章节", async () => {
        mockPrisma.liveRoom.findUnique.mockResolvedValue({
          id: "r1", courseId: "co1", title: "国学直播课", replayUrl: "https://replay.example.com/live.mp4",
        });

        const result = await svc.handleLiveEvent("room_r1", 100, {
          video_url: "https://replay.example.com/live.mp4",
        });

        expect(result).toEqual({ roomId: "r1", duplicate: true });
        expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
        expect(mockPrisma.courseChapter.create).not.toHaveBeenCalled();
      });

      it("推流与断流回调写入真实连接态", async () => {
        mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1" });
        mockRedis.getJson.mockResolvedValue(null);

        await svc.handleLiveEvent("room_r1", 1, { width: 1280, height: 720, video_fps: 30 });
        expect(mockRedis.setJson).toHaveBeenLastCalledWith(
          "live:stream-status:r1",
          expect.objectContaining({
            status: "online",
            metrics: { resolution: "1280x720", fps: 30 },
          }),
          172800,
        );

        mockRedis.getJson.mockResolvedValue({ status: "online", connectedAt: "2026-08-15T00:00:00.000Z" });
        await svc.handleLiveEvent("room_r1", 0, { errmsg: "network" });
        expect(mockRedis.setJson).toHaveBeenLastCalledWith(
          "live:stream-status:r1",
          expect.objectContaining({ status: "offline", reason: "network" }),
          172800,
        );
      });

      it("OBS 未收到推流回调时拒绝进入 LIVING", async () => {
        mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", hostUserId: "host1", status: "WAITING" });
        mockRedis.getJson.mockResolvedValue({ status: "offline" });

        await expect(svc.startObsLive("r1", "host1", false)).rejects.toThrow("尚未检测到 OBS 推流");
        expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
      });

      it("CSS 模式也拒绝通过 OBS 专用接口启动竖屏房间", async () => {
        mockPrisma.liveRoom.findUnique.mockResolvedValue({
          id: "r1", hostUserId: "host1", status: "WAITING", orientation: "portrait",
        });
        mockRedis.getJson.mockResolvedValue({ status: "online" });

        await expect(svc.startObsLive("r1", "host1", false)).rejects.toThrow(
          "该直播间不是 OBS 电脑直播形态",
        );
        expect(mockPrisma.liveRoom.update).not.toHaveBeenCalled();
      });

      it("CSS 模式收到在线回调后通过 OBS 专用入口开播", async () => {
        const room = {
          id: "r1", hostUserId: "host1", status: "WAITING", auditStatus: "APPROVED",
          title: "OBS 直播", circleId: null, orientation: "landscape",
        };
        mockPrisma.liveRoom.findUnique.mockResolvedValue(room);
        mockRedis.getJson.mockResolvedValue({ status: "online", connectedAt: "2026-08-27T00:00:00.000Z" });
        mockPrisma.liveRoom.update.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));

        const result: any = await svc.startObsLive("r1", "host1", false);

        expect(result.status).toBe("LIVING");
        expect(mockPrisma.liveRoom.update).toHaveBeenCalled();
      });

      it("CSS 直播中重新进入 OBS 工作台时重新签发推流地址", async () => {
        mockPrisma.liveRoom.findUnique.mockResolvedValue({
          id: "r1", hostUserId: "host1", status: "LIVING",
          pushUrl: "rtmp://push.example.com/live/room_r1?txTime=EXPIRED",
          orientation: "landscape", trtcRoomId: null,
        });
        mockStream.genPushUrl.mockReturnValueOnce(
          "rtmp://push.example.com/live/room_r1?txSecret=fresh&txTime=FRESH",
        );

        const result = await svc.getStreamUrls("r1", "host1", false);

        expect(mockStream.genPushUrl).toHaveBeenCalledWith("room_r1");
        expect(result.pushUrl).toBe(
          "rtmp://push.example.com/live/room_r1?txSecret=fresh&txTime=FRESH",
        );
        expect(result.pushUrl).not.toContain("EXPIRED");
      });

      it("OBS 同房模式返回 TRTC RTMP 地址并登记回调房间映射", async () => {
        process.env.LIVE_OBS_TRTC_INGEST_ENABLED = "true";
        process.env.TRTC_SDK_APP_ID = "1600030106";
        process.env.TRTC_SECRET_KEY = "test-only-secret";
        mockPrisma.liveRoom.findUnique.mockResolvedValue({
          id: "r1", hostUserId: "host1", status: "WAITING", pushUrl: null,
          orientation: "landscape", trtcRoomId: null,
        });

        const result = await svc.getStreamUrls("r1", "host1", false);

        expect(result.ingestMode).toBe("TRTC_RTMP");
        expect(result.pushUrl).toMatch(/^rtmp:\/\/rtmp\.rtc\.qq\.com\/push\/room_r1\?/);
        expect(JSON.stringify(result)).not.toContain("test-only-secret");
        expect(mockRedis.set).toHaveBeenCalledWith("live:trtc-room-map:room_r1", "r1", 172800);
      });

      it("TRTC OBS 进房事件不冒充媒体在线，收到视频事件后才放行", async () => {
        process.env.LIVE_OBS_TRTC_INGEST_ENABLED = "true";
        mockRedis.get.mockResolvedValue("r1");
        mockPrisma.liveRoom.findUnique.mockResolvedValue({
          id: "r1", hostUserId: "host1", orientation: "landscape", status: "WAITING",
        });
        const userId = toLiveObsTrtcUserId("r1");

        await svc.handleTrtcEvent({
          EventGroupId: 1, EventType: 103,
          EventInfo: { RoomId: toLiveTrtcRoomId("r1"), UserId: userId, Reason: 1 },
        });
        expect(mockRedis.setJson).toHaveBeenLastCalledWith(
          "live:stream-status:r1",
          expect.objectContaining({ status: "offline", reason: "1", media: { audio: false, video: false } }),
          172800,
        );

        mockRedis.getJson.mockResolvedValue({ status: "offline", media: { audio: false, video: false } });
        await svc.handleTrtcEvent({
          EventGroupId: 2, EventType: 201,
          EventInfo: { RoomId: toLiveTrtcRoomId("r1"), UserId: userId, width: 1280, height: 720 },
        });
        expect(mockRedis.setJson).toHaveBeenLastCalledWith(
          "live:stream-status:r1",
          expect.objectContaining({ status: "online", media: { audio: false, video: true } }),
          172800,
        );
      });
    });

  describe("直播互动资金与重复操作保护", () => {
    beforeEach(() => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", hostUserId: "host1", userId: "creator1", status: "LIVING", title: "国学直播",
      });
      mockPrisma.user.findUnique.mockResolvedValue({ creatorSettings: { livePrivacy: { allowGift: true } } });
    });

    it("首次送礼将幂等键与扣币结果绑定到同一赠礼记录", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue(null);
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1",
        hostUserId: "host1",
        status: "LIVING",
        title: "国学直播",
        imGroupId: "live_r1",
      });
      mockPrisma.gift.findUnique.mockResolvedValue({ id: "g1", status: "ACTIVE", priceCoin: 12, name: "心意" });
      mockPrisma.giftRecord.create.mockResolvedValue({
        id: "gr1", idempotencyKey: "live-gift:r1:request-001", userId: "u1", liveRoomId: "r1",
        toUserId: "host1", giftId: "g1", quantity: 2, totalCoin: 24,
      });

      const result = await svc.sendGift("r1", "u1", "g1", 2, "live-gift:r1:request-001");

      expect(result.id).toBe("gr1");
      expect(mockPrisma.giftRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: "live-gift:r1:request-001", totalCoin: 24 }),
      }));
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockIm.relayLiveGift).toHaveBeenCalledWith("live_r1", {
        recordId: "gr1",
        giftId: "g1",
        giftName: "心意",
        quantity: 2,
      }, "u1");
    });

    it("相同幂等键重放直接返回原记录且不重新进入扣币事务", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue({
        id: "gr1", idempotencyKey: "live-gift:r1:request-001", userId: "u1", liveRoomId: "r1",
        toUserId: "host1", giftId: "g1", quantity: 2, totalCoin: 24,
      });

      const result = await svc.sendGift("r1", "u1", "g1", 2, "live-gift:r1:request-001");

      expect(result.id).toBe("gr1");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.liveRoom.findUnique).toHaveBeenCalledWith({ where: { id: "r1" } });
      expect(mockIm.relayLiveGift).not.toHaveBeenCalled();
    });

    it("拒绝用同一幂等键更换礼物或数量", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue({
        id: "gr1", idempotencyKey: "live-gift:r1:request-001", userId: "u1", liveRoomId: "r1",
        toUserId: "host1", giftId: "g1", quantity: 1, totalCoin: 12,
      });

      await expect(svc.sendGift("r1", "u1", "g2", 1, "live-gift:r1:request-001"))
        .rejects.toThrow("送礼幂等键已被其他请求使用");
    });

    it("服务端拒绝圈外用户或主播关闭礼物后的送礼请求", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", hostUserId: "host1", userId: "creator1", circleId: "circle1",
        visibility: "CIRCLE_ONLY", auditStatus: "APPROVED", status: "LIVING",
      });
      mockPrisma.circleMember.findFirst.mockResolvedValue(null);
      await expect(svc.sendGift("r1", "outsider1", "g1", 1, "live-gift:r1:outsider-001"))
        .rejects.toThrow(BusinessException);

      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "member1" });
      mockPrisma.user.findUnique.mockResolvedValue({ creatorSettings: { livePrivacy: { allowGift: false } } });
      await expect(svc.sendGift("r1", "member1", "g1", 1, "live-gift:r1:disabled-001"))
        .rejects.toThrow("未开放礼物功能");
      expect(mockPrisma.giftRecord.findUnique).not.toHaveBeenCalled();
    });

    it("重复点赞使用 upsert 并返回服务端真实计数", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING" });
      mockPrisma.like.upsert.mockResolvedValue({ id: "like1" });
      mockPrisma.like.count.mockResolvedValue(7);

      await expect(svc.toggleLike("r1", "u1")).resolves.toEqual({ liked: true, likeCount: 7 });
      expect(mockPrisma.like.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId_targetType_targetId: { userId: "u1", targetType: "LIVESTREAM", targetId: "r1" } },
      }));
    });
  });

  describe("礼物经营统计权限", () => {
    it("允许主播本人读取经营统计", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.giftRecord.groupBy.mockResolvedValue([
        { userId: "viewer1", _sum: { totalCoin: 88 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "viewer1", nickname: "用户一", avatar: null },
      ]);

      await expect(svc.giftRanking("r1", "host1")).resolves.toEqual([
        { userId: "viewer1", nickname: "用户一", avatar: null, totalCoin: 88 },
      ]);
    });

    it("允许管理员读取经营统计", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });
      mockPrisma.giftRecord.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(svc.giftRanking("r1", "admin1", true)).resolves.toEqual([]);
    });

    it("拒绝普通观众读取他人的消费统计", async () => {
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "host1" });

      await expect(svc.giftRanking("r1", "viewer1")).rejects.toThrow("只有主播本人或管理员");
      expect(mockPrisma.giftRecord.groupBy).not.toHaveBeenCalled();
    });
  });

  describe("直播送礼消费保护设置", () => {
    it("读取与更新都委托统一币账户策略服务", async () => {
      await expect(svc.getGiftSpendingPreference("viewer1")).resolves.toEqual({ configured: false, eligible: true });
      const input = { singleLimitCoin: 100, dailyLimitCoin: 500, reminderEnabled: true };
      await expect(svc.updateGiftSpendingPreference("viewer1", input)).resolves.toEqual({ configured: true, eligible: true });
      expect(mockCoin.getLiveGiftSpendingPreference).toHaveBeenCalledWith("viewer1");
      expect(mockCoin.updateLiveGiftSpendingPreference).toHaveBeenCalledWith("viewer1", input);
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
