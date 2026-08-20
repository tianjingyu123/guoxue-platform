import { LiveMixingService } from "./live-mixing.service";
import { toLiveObsTrtcUserId, toLiveTrtcRoomId, toLiveTrtcUserId } from "./live-trtc.util";

describe("LiveMixingService", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const memory = new Map<string, unknown>();
  const mockPrisma = {
    liveMic: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    liveRoom: { findUnique: jest.fn() },
  };
  const mockRedis = {
    setJson: jest.fn(async (key: string, value: unknown) => { memory.set(key, value); }),
    getJson: jest.fn(async (key: string) => memory.get(key) || null),
    mgetJson: jest.fn(async (keys: string[]) => keys.map((key) => memory.get(key) || null)),
    del: jest.fn(async (key: string) => { memory.delete(key); }),
    runExclusive: jest.fn(async (_name: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  };
  const mockStream = {
    genPushUrl: jest.fn((key: string) => `rtmp://push.example.com/live/${key}?txSecret=masked&txTime=ABC`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    memory.clear();
    process.env.LIVE_MULTI_GUEST_MIXING_ENABLED = "true";
    delete process.env.LIVE_OBS_TRTC_INGEST_ENABLED;
    process.env.TENCENT_SECRET_ID = "test-secret-id";
    process.env.TENCENT_SECRET_KEY = "test-secret-key";
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-trtc-key";
    process.env.TRTC_MIXING_REGION = "ap-beijing";
    mockPrisma.liveMic.findFirst.mockResolvedValue({ id: "mic-1" });
    mockPrisma.liveMic.findMany.mockResolvedValue([{ userId: "guest-1" }]);
    mockPrisma.liveRoom.findUnique.mockResolvedValue({
      status: "LIVING",
      hostUserId: "host-1",
      orientation: "portrait",
      trtcRoomId: toLiveTrtcRoomId("room-1"),
    });
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  function service() {
    return new LiveMixingService(mockPrisma as never, mockRedis as never, mockStream as never);
  }

  it("手机主播真实进房后即启动统一 CDN 输出，不再等待首位嘉宾", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Response: { TaskId: "task-1", RequestId: "request-1" } }),
    } as Response);

    const result = await service().markHostReady("room-1", "host-1");

    expect(result).toEqual({ active: true, streamMode: "MIXED", streamKey: "room_room-1_mix" });
    expect(mockStream.genPushUrl).toHaveBeenCalledWith("room_room-1_mix", 86_400);
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.RoomId).toBe(toLiveTrtcRoomId("room-1"));
    expect(payload.RoomIdType).toBe(1);
    expect(payload.WithTranscoding).toBe(1);
    expect(payload.VideoParams.LayoutParams.MixLayoutMode).toBe(1);
    expect(payload.VideoParams.LayoutParams.MaxVideoUser.UserMediaStream.UserInfo.UserId).toBe(toLiveTrtcUserId("host-1"));
    expect(payload.PublishCdnParams[0].PublishCdnUrl).toContain("room_room-1_mix");
    expect(JSON.stringify(memory.get("live:mix:room-1"))).not.toContain("test-secret");
  });

  it("腾讯云启动失败时保留原流，不把整场直播打黑", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Response: { Error: { Code: "FailedOperation", Message: "denied" }, RequestId: "request-failed" } }),
    } as Response);

    await expect(service().markHostReady("room-1", "host-1")).resolves.toEqual({
      active: false,
      streamMode: "ORIGIN",
      reason: "START_FAILED",
    });
    expect(memory.get("live:mix:room-1")).toEqual(expect.objectContaining({
      status: "FAILED",
      errorCode: "FailedOperation",
      retryAt: expect.any(String),
    }));

    await expect(service().markHostReady("room-1", "host-1")).resolves.toEqual({
      active: false,
      streamMode: "ORIGIN",
      reason: "START_COOLDOWN",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("混流开关关闭时播放接口始终返回原流", async () => {
    process.env.LIVE_MULTI_GUEST_MIXING_ENABLED = "false";
    memory.set("live:mix:room-1", {
      taskId: "old-task",
      streamKey: "room_room-1_mix",
      status: "ACTIVE",
      lastHeartbeatAt: new Date().toISOString(),
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Response: { RequestId: "request-disabled-stop" } }),
    } as Response);

    await expect(service().playback("room-1", "room_room-1")).resolves.toEqual({
      streamKey: "room_room-1",
      streamMode: "ORIGIN",
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(memory.has("live:mix:room-1")).toBe(false);
  });

  it("主播租约失效后停止任务并清除统一输出状态", async () => {
    memory.set("live:mix:room-1", {
      taskId: "task-1",
      streamKey: "room_room-1_mix",
      status: "ACTIVE",
      lastHeartbeatAt: new Date().toISOString(),
    });
    mockPrisma.liveMic.findMany.mockResolvedValue([]);
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Response: { RequestId: "request-stop" } }),
    } as Response);

    await expect(service().markHostNotReady("room-1", "host-1")).resolves.toEqual({
      active: false,
      streamMode: "ORIGIN",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      SdkAppId: 1600030106,
      TaskId: "task-1",
    });
    expect(memory.has("live:mix:room-1")).toBe(false);
  });

  it("OBS 媒体在线时可在房间公开前建立同房混流输出", async () => {
    process.env.LIVE_OBS_TRTC_INGEST_ENABLED = "true";
    mockPrisma.liveRoom.findUnique.mockResolvedValue({
      status: "WAITING",
      hostUserId: "host-1",
      orientation: "landscape",
      trtcRoomId: toLiveTrtcRoomId("room-1"),
    });
    memory.set("live:stream-status:room-1", { status: "online" });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Response: { TaskId: "obs-task", RequestId: "obs-request" } }),
    } as Response);

    await expect(service().prepareObs("room-1")).resolves.toEqual({
      active: true,
      streamMode: "MIXED",
      streamKey: "room_room-1_mix",
    });
    const payload = JSON.parse(String((global.fetch as jest.Mock).mock.calls[0][1]?.body));
    expect(payload.VideoParams.LayoutParams.MaxVideoUser.UserMediaStream.UserInfo.UserId)
      .toBe(toLiveObsTrtcUserId("room-1"));
  });
});
