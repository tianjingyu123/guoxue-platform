import { Test } from "@nestjs/testing";
import { AppGateway } from "./websocket.gateway";
import { WsAuthService } from "./ws-auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockWsAuth = {
  extractUser: jest.fn(),
};

const mockPrisma = {
  user: { findUnique: jest.fn() },
};

// 内存假 Redis：在线态迁 Redis 后，用真实语义的假实现支撑原有行为断言
const createFakeRedis = () => {
  const sets = new Map<string, Set<string>>();
  const kv = new Map<string, string>();
  const counters = new Map<string, number>();
  return {
    sadd: jest.fn(async (k: string, m: string) => {
      if (!sets.has(k)) sets.set(k, new Set());
      const s = sets.get(k)!;
      const had = s.has(m);
      s.add(m);
      return had ? 0 : 1;
    }),
    srem: jest.fn(async (k: string, m: string) => (sets.get(k)?.delete(m) ? 1 : 0)),
    scard: jest.fn(async (k: string) => sets.get(k)?.size ?? 0),
    smembers: jest.fn(async (k: string) => Array.from(sets.get(k) ?? [])),
    sismember: jest.fn(async (k: string, m: string) => sets.get(k)?.has(m) ?? false),
    incrBy: jest.fn(async (k: string, d: number) => {
      const v = (counters.get(k) ?? 0) + d;
      counters.set(k, v);
      return v;
    }),
    set: jest.fn(async (k: string, v: string) => { kv.set(k, v); }),
    get: jest.fn(async (k: string) => kv.get(k) ?? null),
    del: jest.fn(async (k: string) => { kv.delete(k); sets.delete(k); counters.delete(k); }),
    expire: jest.fn(async () => undefined),
    reset() { sets.clear(); kv.clear(); counters.clear(); },
  };
};
const fakeRedis = createFakeRedis();

// Socket mock factory — 返回 any 避免 Socket<...> 完整类型报错
const makeSocket = (overrides: Record<string, any> = {}): any => ({
  id: `socket-${Math.random().toString(36).slice(2, 6)}`,
  handshake: {
    headers: { "x-forwarded-for": "1.2.3.4" },
    address: "1.2.3.4",
  },
  data: {},
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

// Server mock
const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

describe("AppGateway", () => {
  let gw: AppGateway;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AppGateway,
        { provide: WsAuthService, useValue: mockWsAuth },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: fakeRedis },
      ],
    }).compile();
    gw = mod.get(AppGateway);
    gw.server = mockServer as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer.to.mockReturnThis(); // clearAllMocks 会重置 mockReturnThis，需重新设置
    // 重置网关内部状态，避免测试间累积
    gw["socketMap"].clear();
    gw["eventRateLimit"].clear();
    fakeRedis.reset();
  });

  // ═══════════════ 纯逻辑方法 ═══════════════

  describe("在线状态查询", () => {
    it("getOnlineCount 初始为0", async () => {
      expect(await gw.getOnlineCount()).toBe(0);
    });

    it("isUserOnline 返回false", async () => {
      expect(await gw.isUserOnline("u1")).toBe(false);
    });

    it("getOnlineUsers 返回空数组", async () => {
      expect(await gw.getOnlineUsers()).toEqual([]);
    });

    it("getOnlineUserIds 返回空数组", async () => {
      expect(await gw.getOnlineUserIds()).toEqual([]);
    });
  });

  describe("事件速率限制", () => {
    it("首次事件允许通过", () => {
      const result = gw["checkEventRate"]("s1", "typing", 3, 3000);
      expect(result).toBe(true);
    });

    it("超限后拒绝", () => {
      // 快速消耗配额
      for (let i = 0; i < 3; i++) gw["checkEventRate"]("s2", "typing", 3, 3000);
      const result = gw["checkEventRate"]("s2", "typing", 3, 3000);
      expect(result).toBe(false);
    });
  });

  // ═══════════════ 连接管理 ═══════════════

  describe("handleConnection", () => {
    it("认证失败断开连接", async () => {
      mockWsAuth.extractUser.mockReturnValue(null);
      const client = makeSocket();
      await gw.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith("auth_error", expect.any(Object));
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it("被封禁用户断开连接", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u1", role: "USER", nickname: "张三" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "BANNED" });
      const client = makeSocket();
      await gw.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith("auth_error", expect.objectContaining({ message: expect.stringContaining("限制") }));
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it("认证成功建立连接", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u1", role: "USER", nickname: "张三" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s1" });

      await gw.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith("user:u1");
      expect(client.emit).toHaveBeenCalledWith("welcome", expect.objectContaining({ userId: "u1" }));
      expect(await gw.isUserOnline("u1")).toBe(true);
      expect(await gw.getOnlineCount()).toBe(1);
    });

    it("管理员连接加入admin房间", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "admin1", role: "SUPER_ADMIN", nickname: "管理员" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s2" });

      await gw.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith("admin");
      expect(client.join).toHaveBeenCalledWith("user:admin1");
    });
  });

  describe("handleDisconnect", () => {
    it("正常断开连接清理在线状态", async () => {
      // 先建立连接
      mockWsAuth.extractUser.mockReturnValue({ userId: "u2", role: "USER", nickname: "李四" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s3" });
      await gw.handleConnection(client);
      expect(await gw.getOnlineCount()).toBe(1);

      await gw.handleDisconnect(client);
      expect(await gw.getOnlineCount()).toBe(0);
    });
  });

  // ═══════════════ 客户端事件 ═══════════════

  describe("ping/pong", () => {
    it("ping 返回 pong", () => {
      const client = makeSocket();
      gw.handlePing(client);
      expect(client.emit).toHaveBeenCalledWith("pong", expect.objectContaining({
        time: expect.any(Number),
        serverTime: expect.any(String),
      }));
    });
  });

  describe("房间操作", () => {
    it("join_room 加入并通知", () => {
      const client = makeSocket();
      gw.handleJoinRoom(client, "room1");
      expect(client.join).toHaveBeenCalledWith("room1");
      expect(client.emit).toHaveBeenCalledWith("joined", { room: "room1" });
    });

    it("join_room 非法参数忽略", () => {
      const client = makeSocket();
      gw.handleJoinRoom(client, 123 as any);
      expect(client.join).not.toHaveBeenCalled();
    });

    it("leave_room 离开并通知", () => {
      const client = makeSocket();
      gw.handleLeaveRoom(client, "room1");
      expect(client.leave).toHaveBeenCalledWith("room1");
      expect(client.emit).toHaveBeenCalledWith("left", { room: "room1" });
    });

    it("join_circle 加入圈子房间", () => {
      const client = makeSocket();
      gw.handleJoinCircle(client, "circle-1");
      expect(client.join).toHaveBeenCalledWith("circle:circle-1");
    });

    it("leave_circle 离开圈子房间", () => {
      const client = makeSocket();
      gw.handleLeaveCircle(client, "circle-1");
      expect(client.leave).toHaveBeenCalledWith("circle:circle-1");
    });
  });

  describe("在线状态订阅", () => {
    it("subscribe_presence 加入房间并返回当前状态", async () => {
      const client = makeSocket();
      await gw.handleSubscribePresence(client, "target-user");
      expect(client.join).toHaveBeenCalledWith("presence:target-user");
      expect(client.emit).toHaveBeenCalledWith("presence_update", { userId: "target-user", status: "offline" });
    });

    it("unsubscribe_presence 离开房间", () => {
      const client = makeSocket();
      gw.handleUnsubscribePresence(client, "target-user");
      expect(client.leave).toHaveBeenCalledWith("presence:target-user");
    });
  });

  describe("打字状态", () => {
    it("用户打字广播到房间", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u1", role: "USER" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-typing" });
      await gw.handleConnection(client);

      gw.handleTyping(client, { room: "circle:1", isTyping: true });
      expect(mockServer.to).toHaveBeenCalledWith("circle:1");
      expect(mockServer.emit).toHaveBeenCalledWith("typing", expect.objectContaining({
        userId: "u1",
        isTyping: true,
      }));
    });
  });

  describe("send_message", () => {
    it("发送消息到房间", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u-msg", role: "USER" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-msg" });
      await gw.handleConnection(client);

      gw.handleSendMessage(client, { room: "circle:1", content: "你好" });
      expect(mockServer.emit).toHaveBeenCalledWith("new_message", expect.objectContaining({
        userId: "u-msg",
        content: "你好",
      }));
    });

    it("缺少参数不发送", async () => {
      const client = makeSocket({ id: "s-empty" });
      gw.handleSendMessage(client, { room: "", content: "" });
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  // ═══════════════ 直播事件 ═══════════════

  describe("直播事件", () => {
    it("live:join 加入直播间", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u-live", role: "USER", nickname: "观众" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-live" });
      await gw.handleConnection(client);

      jest.clearAllMocks();
      gw.handleLiveJoin(client, "room-1");
      expect(client.join).toHaveBeenCalledWith("live:room-1");
      expect(mockServer.emit).toHaveBeenCalledWith("live:user_joined", expect.any(Object));
    });

    it("live:leave 离开直播间", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u-live", role: "USER" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-live2" });
      await gw.handleConnection(client);

      jest.clearAllMocks();
      gw.handleLiveLeave(client, "room-1");
      expect(client.leave).toHaveBeenCalledWith("live:room-1");
    });

    it("live:chat 直播弹幕", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u-chat", role: "USER", nickname: "水友" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-chat" });
      await gw.handleConnection(client);

      jest.clearAllMocks();
      gw.handleLiveChat(client, { roomId: "r1", content: "666" });
      expect(mockServer.to).toHaveBeenCalledWith("live:r1");
      expect(mockServer.emit).toHaveBeenCalledWith("live:chat", expect.objectContaining({
        content: "666",
      }));
    });

    it("live:like 直播点赞", async () => {
      mockWsAuth.extractUser.mockReturnValue({ userId: "u-like", role: "USER" });
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      const client = makeSocket({ id: "s-like" });
      await gw.handleConnection(client);

      jest.clearAllMocks();
      gw.handleLiveLike(client, { roomId: "r1" });
      expect(mockServer.emit).toHaveBeenCalledWith("live:like", expect.any(Object));
    });
  });

  // ═══════════════ 推送API ═══════════════

  describe("推送API", () => {
    it("sendToUser 推送给指定用户", () => {
      gw.sendToUser("u1", "test_event", { msg: "hello" });
      expect(mockServer.to).toHaveBeenCalledWith("user:u1");
      expect(mockServer.emit).toHaveBeenCalledWith("test_event", { msg: "hello" });
    });

    it("sendToAdmins 推送给管理员", () => {
      gw.sendToAdmins("alert", { level: "warn" });
      expect(mockServer.to).toHaveBeenCalledWith("admin");
      expect(mockServer.emit).toHaveBeenCalledWith("alert", { level: "warn" });
    });

    it("broadcast 广播所有用户", () => {
      gw.broadcast("announce", { title: "通知" });
      expect(mockServer.emit).toHaveBeenCalledWith("announce", { title: "通知" });
    });

    it("sendToRoom 推送到指定房间", () => {
      gw.sendToRoom("circle:1", "new_post", { id: 1 });
      expect(mockServer.to).toHaveBeenCalledWith("circle:1");
      expect(mockServer.emit).toHaveBeenCalledWith("new_post", { id: 1 });
    });

    it("sendToUsers 推送给多个用户", () => {
      gw.sendToUsers(["u1", "u2"], "batch", { data: 1 });
      expect(mockServer.to).toHaveBeenCalledWith("user:u1");
      expect(mockServer.to).toHaveBeenCalledWith("user:u2");
    });

    it("notifyImMessage 推送IM消息", () => {
      gw.notifyImMessage("u1", {
        fromUserId: "u2",
        text: "你好",
        msgTime: 1700000000,
      });
      expect(mockServer.emit).toHaveBeenCalledWith("im_new_message", expect.objectContaining({
        fromUserId: "u2",
        text: "你好",
      }));
    });

    it("notifyImGroupMessage 推送IM群消息", () => {
      gw.notifyImGroupMessage("group1", {
        fromUserId: "u2",
        text: "群消息",
        msgTime: 1700000000,
      });
      expect(mockServer.to).toHaveBeenCalledWith("circle:group1");
      expect(mockServer.emit).toHaveBeenCalledWith("im_group_message", expect.any(Object));
    });
  });
});
