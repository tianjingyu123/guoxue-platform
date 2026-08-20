import { RedisService } from "../../redis/redis.service";
import { LivePresenceService } from "./live-presence.service";

describe("LivePresenceService", () => {
  let redis: RedisService;
  let service: LivePresenceService;
  const prisma = {
    liveRoom: { update: jest.fn() },
  };

  beforeEach(() => {
    delete process.env.REDIS_URL;
    redis = new RedisService();
    prisma.liveRoom.update.mockReset().mockResolvedValue({ viewCount: 1 });
    service = new LivePresenceService(prisma as any, redis);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
  });

  it("同一登录用户多次心跳和多设备只累计一次且只算一个在线", async () => {
    const first = await service.touch("room-1", "session-00000001", "viewer-1");
    const heartbeat = await service.touch("room-1", "session-00000002", "viewer-1");

    expect(first).toEqual({ onlineCount: 1, firstVisit: true });
    expect(heartbeat).toEqual({ onlineCount: 1, firstVisit: false });
    expect(prisma.liveRoom.update).toHaveBeenCalledTimes(1);
  });

  it("两个游客会话分别累计并实时反映离房", async () => {
    await service.touch("room-1", "anonymous-session-a");
    const second = await service.touch("room-1", "anonymous-session-b");
    const left = await service.leave("room-1", "anonymous-session-a");

    expect(second.onlineCount).toBe(2);
    expect(left.onlineCount).toBe(1);
    expect(prisma.liveRoom.update).toHaveBeenCalledTimes(2);
  });

  it("数据库累计失败会撤销去重键，使下一次心跳可以重试", async () => {
    prisma.liveRoom.update.mockRejectedValueOnce(new Error("db unavailable"));
    await expect(service.touch("room-1", "anonymous-session-a")).rejects.toThrow("db unavailable");

    await expect(service.touch("room-1", "anonymous-session-a")).resolves.toMatchObject({ firstVisit: true });
    expect(prisma.liveRoom.update).toHaveBeenCalledTimes(2);
  });

  it("超过活跃窗口的会话自动清理", async () => {
    await redis.zadd("live:presence:room-1", 1_000, "stale-member");

    await expect(service.getOnlineCount("room-1", 1_000 + LivePresenceService.ACTIVE_WINDOW_MS + 1))
      .resolves.toBe(0);
  });

  it("下播清除在线集合与兼容快照", async () => {
    await service.touch("room-1", "anonymous-session-a");
    await service.clearActive("room-1");

    await expect(service.getOnlineCount("room-1")).resolves.toBe(0);
  });
});
