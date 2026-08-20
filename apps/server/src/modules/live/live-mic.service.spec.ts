import { LiveService } from "./live.service";
import { Prisma } from "@prisma/client";

describe("LiveService 直播连麦", () => {
  const originalTrtcSdkAppId = process.env.TRTC_SDK_APP_ID;
  const originalTrtcSecretKey = process.env.TRTC_SECRET_KEY;
  const prisma = {
    liveRoom: { findUnique: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
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

    const result = await service.joinMic("r1", "guest-1", 1, "VIDEO");

    expect(result.status).toBe("PENDING");
    expect(prisma.liveMic.create).toHaveBeenCalledWith({
      data: { liveRoomId: "r1", userId: "guest-1", position: 1, status: "PENDING", mediaMode: "VIDEO", source: "REQUEST" },
    });
  });

  it("未指定麦位时并发占位会自动尝试下一席", async () => {
    prisma.liveMic.findFirst.mockResolvedValue(null);
    prisma.liveMic.create
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("麦位已占用", {
        code: "P2002",
        clientVersion: "test",
      }))
      .mockResolvedValueOnce({ id: "m2", status: "PENDING", position: 2 });

    const result = await service.joinMic("r1", "guest-2");

    expect(result.position).toBe(2);
    expect(prisma.liveMic.create).toHaveBeenNthCalledWith(1, {
      data: { liveRoomId: "r1", userId: "guest-2", position: 1, status: "PENDING", mediaMode: "AUDIO", source: "REQUEST" },
    });
    expect(prisma.liveMic.create).toHaveBeenNthCalledWith(2, {
      data: { liveRoomId: "r1", userId: "guest-2", position: 2, status: "PENDING", mediaMode: "AUDIO", source: "REQUEST" },
    });
  });

  it("主播邀请只创建 INVITE 候场记录，不能代替受邀者开启设备", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "guest-invited" });
    prisma.liveMic.findFirst.mockResolvedValue(null);
    prisma.liveMic.create.mockResolvedValue({ id: "invite-1", status: "PENDING", source: "INVITE" });

    const result = await service.inviteMic("r1", "host-1", "guest-invited", undefined, "VIDEO");

    expect(result).toEqual(expect.objectContaining({ source: "INVITE", status: "PENDING" }));
    expect(prisma.liveMic.create).toHaveBeenCalledWith({
      data: {
        liveRoomId: "r1",
        userId: "guest-invited",
        position: 1,
        status: "PENDING",
        mediaMode: "VIDEO",
        source: "INVITE",
      },
    });
  });

  it("受邀用户本人接受后才进入 OCCUPIED", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "invite-1", status: "PENDING", source: "INVITE" });
    prisma.liveMic.update.mockResolvedValue({ id: "invite-1", status: "OCCUPIED", source: "INVITE" });

    const result = await service.respondMicInvite("r1", "guest-invited", "ACCEPT");

    expect(result).toEqual(expect.objectContaining({ status: "OCCUPIED" }));
    expect(prisma.liveMic.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "OCCUPIED", joinedAt: expect.any(Date) },
    });
  });

  it("主播不能通过管理接口替受邀用户接受邀请", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "invite-1", status: "PENDING", source: "INVITE" });
    await expect(service.manageMic("r1", "host-1", {
      userId: "guest-invited",
      action: "ACCEPT",
    })).rejects.toThrow("必须由受邀用户本人接受");
    expect(prisma.liveMic.update).not.toHaveBeenCalled();
  });

  it("非主播不能批准连麦申请", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "PENDING" });
    await expect(
      service.manageMic("r1", "other-user", { userId: "guest-1", action: "ACCEPT" }),
    ).rejects.toThrow("只有主播本人或管理员可以管理麦位");
    expect(prisma.liveMic.update).not.toHaveBeenCalled();
  });

  it("主播批准后嘉宾才可取得绑定房间的短期票据", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "OCCUPIED", mediaMode: "AUDIO" });
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

  it("获批视频嘉宾取得最小音视频权限而不是主播全权限", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "OCCUPIED", mediaMode: "VIDEO" });
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";

    const config = await service.getRtcConfig("r1", "guest-video");

    expect(config).toMatchObject({
      role: "GUEST",
      mediaMode: "VIDEO",
      canPublishAudio: true,
      canPublishVideo: true,
      hostUserId: "host-1",
    });
    expect(config.hostTrtcUserId).toMatch(/^u_[0-9a-f]{30}$/);
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
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "PENDING", mediaMode: "AUDIO" });
    await expect(service.getRtcConfig("r1", "guest-1")).rejects.toThrow("尚未获主播批准");
  });

  it("主播可查看全部申请，普通观众只看自己的申请与公开在麦嘉宾", async () => {
    prisma.liveMic.findMany.mockResolvedValue([]);

    await service.listMics("r1", "host-1");
    expect(prisma.liveMic.findMany).toHaveBeenLastCalledWith({
      where: { liveRoomId: "r1" },
      orderBy: { position: "asc" },
    });

    await service.listMics("r1", "guest-1");
    expect(prisma.liveMic.findMany).toHaveBeenLastCalledWith({
      where: {
        liveRoomId: "r1",
        OR: [
          { userId: "guest-1" },
          { status: { in: ["OCCUPIED", "MUTED"] } },
        ],
      },
      orderBy: { position: "asc" },
    });
  });

  it("公开麦位返回脱敏 TRTC 身份与真实席位资料", async () => {
    prisma.liveMic.findMany.mockResolvedValue([{
      id: "m1",
      liveRoomId: "r1",
      userId: "guest-video",
      position: 2,
      status: "OCCUPIED",
      mediaMode: "VIDEO",
    }]);
    prisma.user.findMany.mockResolvedValue([{
      id: "guest-video",
      nickname: "嘉宾甲",
      avatar: "https://example.com/avatar.jpg",
    }]);

    const result = await service.listMics("r1", "viewer-1");

    expect(result).toEqual([expect.objectContaining({
      userId: "guest-video",
      nickname: "嘉宾甲",
      trtcUserId: expect.stringMatching(/^u_[0-9a-f]{30}$/),
    })]);
  });

  it("被主播静音的嘉宾票据不允许发布音频", async () => {
    prisma.liveMic.findFirst.mockResolvedValue({ id: "m1", status: "MUTED", mediaMode: "AUDIO" });
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";

    const config = await service.getRtcConfig("r1", "guest-1");

    expect(config.canPublishAudio).toBe(false);
  });

  it("观众重复下麦保持幂等，不制造 404", async () => {
    prisma.liveMic.findFirst.mockResolvedValue(null);

    await expect(service.leaveMic("r1", "guest-1", "guest-1")).resolves.toEqual({
      success: true,
      alreadyLeft: true,
    });
    expect(prisma.liveMic.delete).not.toHaveBeenCalled();
  });

  it("远端离开后主播重复踢下麦保持幂等", async () => {
    prisma.liveMic.findFirst.mockResolvedValue(null);

    await expect(service.manageMic(
      "r1",
      "host-1",
      { userId: "guest-1", action: "KICK" },
    )).resolves.toEqual({ success: true, alreadyHandled: true });
    expect(prisma.liveMic.delete).not.toHaveBeenCalled();
  });
});
