import {
  buildLiveObsRtmpPushUrl,
  buildLiveTrtcTicket,
  toLiveObsTrtcUserId,
  toLiveTrtcRoomId,
  toLiveTrtcUserId,
} from "./live-trtc.util";

describe("直播 TRTC 临时票据", () => {
  const originalAppId = process.env.TRTC_SDK_APP_ID;
  const originalSecret = process.env.TRTC_SECRET_KEY;

  afterEach(() => {
    if (originalAppId === undefined) delete process.env.TRTC_SDK_APP_ID;
    else process.env.TRTC_SDK_APP_ID = originalAppId;
    if (originalSecret === undefined) delete process.env.TRTC_SECRET_KEY;
    else process.env.TRTC_SECRET_KEY = originalSecret;
  });

  it("把平台 UUID 映射为稳定且不超过 32 字节的 TRTC UserID", () => {
    const raw = "58ec3b97-4d20-47b7-93f0-8fb4a7ec37fa";
    const mapped = toLiveTrtcUserId(raw);
    expect(mapped).toBe(toLiveTrtcUserId(raw));
    expect(mapped).not.toContain(raw);
    expect(Buffer.byteLength(mapped)).toBeLessThanOrEqual(32);
  });

  it("把含连字符的 UUID 映射为 RTMP 允许的字符串房间号", () => {
    const raw = "58ec3b97-4d20-47b7-93f0-8fb4a7ec37fa";
    const mapped = toLiveTrtcRoomId(raw);
    expect(mapped).toBe(toLiveTrtcRoomId(raw));
    expect(mapped).toMatch(/^[A-Za-z0-9_]+$/);
    expect(Buffer.byteLength(mapped)).toBeLessThanOrEqual(64);
    expect(toLiveTrtcRoomId("r1")).toBe("room_r1");
  });

  it("缺少正式配置时拒绝生成票据", () => {
    delete process.env.TRTC_SDK_APP_ID;
    delete process.env.TRTC_SECRET_KEY;
    expect(buildLiveTrtcTicket("u1", "room_1", 255)).toBeNull();
  });

  it("同时签发 UserSig 与字符串房间 PrivateMapKey", () => {
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";
    const ticket = buildLiveTrtcTicket("u1", "room_1", 255, 300);
    expect(ticket).toMatchObject({ sdkAppId: 1600030106, strRoomId: "room_1" });
    expect(ticket?.userSig).toBeTruthy();
    expect(ticket?.privateMapKey).toBeTruthy();
    expect(JSON.stringify(ticket)).not.toContain("test-only-secret");
  });

  it("生成 OBS 直推 TRTC 的短期地址且不泄露服务端密钥", () => {
    process.env.TRTC_SDK_APP_ID = "1600030106";
    process.env.TRTC_SECRET_KEY = "test-only-secret";
    const result = buildLiveObsRtmpPushUrl("58ec3b97-4d20-47b7-93f0-8fb4a7ec37fa", 300);

    expect(result?.pushUrl).toMatch(/^rtmp:\/\/rtmp\.rtc\.qq\.com\/push\/room_[a-f0-9]{40}\?/);
    expect(result?.trtcUserId).toBe(toLiveObsTrtcUserId("58ec3b97-4d20-47b7-93f0-8fb4a7ec37fa"));
    expect(result?.pushUrl).toContain("sdkappid=1600030106");
    expect(JSON.stringify(result)).not.toContain("test-only-secret");
  });
});
