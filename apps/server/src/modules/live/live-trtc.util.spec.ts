import { buildLiveTrtcTicket, toLiveTrtcUserId } from "./live-trtc.util";

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
});
