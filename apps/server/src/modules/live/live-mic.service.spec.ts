import { LiveService } from "./live.service";

describe("LiveService 直播连麦", () => {
  const originalTrtcSdkAppId = process.env.TRTC_SDK_APP_ID;
  const originalTrtcSecretKey = process.env.TRTC_SECRET_KEY;
  const prisma = {
    liveRoom: { findUnique: jest.fn() },
    liveMic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const service = new LiveService(
    prisma as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.liveRoom.findUnique.mockResolvedValue({
      id: "r1",
      status: "LIVING",
      hostUserId: "host-1",
      trtcRoomId: "room_r1",
    });
  });

  afterEach(() => {
    if (originalTrtcSdkAppId === undefined) delete process.env.TRTC_SDK_APP_ID;
    else process.env.TRTC_SDK_APP_ID = originalTrtcSdkAppId;
    if (originalTrtcSecretKey === undefined) delete process.env.TRTC_SECRET_KEY;
    else process.env.TRTC_SECRET_KEY = originalTrtcSecretKey;
  });

  it("观众申请只进入 PENDING，不会直接占用已批准麦位", async () => {
    prisma.liveMic.findFirst.mockResolvedValue(null);
    prisma.liveMic.findUnique.mockResolvedValue(null);
    prisma.liveMic.create.mockResolvedValue({ id: "m1", status: "PENDING", position: 1 });

    const result = await service.joinMic("r1", "guest-1", 1);

    expect(result.status).toBe("PENDING");
    expect(prisma.liveMic.create).toHaveBeenCalledWith({
      data: { liveRoomId: "r1", userId: "guest-1", position: 1, status: "PENDING" },
    });
  });

  it("非主播不能批准连麦申请", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "PENDING" });
    await expect(
      service.manageMic("r1", "other-user", { userId: "guest-1", action: "ACCEPT" }),
    ).rejects.toThrow("只有主播本人或管理员可以管理麦位");
    expect(prisma.liveMic.update).not.toHaveBeenCalled();
  });

  it("主播批准后嘉宾才可取得绑定房间的短期票据", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "OCCUPIED" });
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";

    const config = await service.getRtcConfig("r1", "guest-1");

    expect(config).toMatchObject({
      sdkAppId: 1600030106,
      strRoomId: "room_r1",
      role: "GUEST",
      mediaMode: "AUDIO",
      canPublishAudio: true,
    });
    expect(config.privateMapKey).toBeTruthy();
  });

  it("主播取得视频开播票据，CDN 流标识与直播播放流一致", async () => {
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";

    const config = await service.getRtcConfig("r1", "host-1");

    expect(config).toMatchObject({
      strRoomId: "room_r1",
      role: "HOST",
      mediaMode: "VIDEO",
      canPublishAudio: true,
      canPublishVideo: true,
      streamId: "room_r1",
    });
  });

  it("待审批嘉宾不能取得票据", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "PENDING" });
    await expect(service.getRtcConfig("r1", "guest-1")).rejects.toThrow("尚未获主播批准");
  });

  it("主播可查看全部申请，普通观众只能查看自己的申请", async () => {
    prisma.liveMic.findMany.mockResolvedValue([]);

    await service.listMics("r1", "host-1");
    expect(prisma.liveMic.findMany).toHaveBeenLastCalledWith({
      where: { liveRoomId: "r1" },
      orderBy: { position: "asc" },
    });

    await service.listMics("r1", "guest-1");
    expect(prisma.liveMic.findMany).toHaveBeenLastCalledWith({
      where: { liveRoomId: "r1", userId: "guest-1" },
      orderBy: { position: "asc" },
    });
  });

  it("被主播静音的嘉宾票据不允许发布音频", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "MUTED" });
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";

    const config = await service.getRtcConfig("r1", "guest-1");

    expect(config.canPublishAudio).toBe(false);
  });
});
