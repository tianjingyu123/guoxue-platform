import { cssCredentialBoundary } from "./live-media-credential.repository";

describe("推流凭据脱敏边界", () => {
  const room = "00000000-0000-4000-8000-000000000001", now = 1800000000000;
  const url = (seconds = 3600) => `rtmp://push.example.invalid/live/room_${room}?txSecret=SYNTHETIC_SECRET&txTime=${((now / 1000) + seconds).toString(16)}`;
  it("只留下精确范围和过期时间，不保存凭据、参数或 URL", () => {
    const result = cssCredentialBoundary(room, url(), now);
    expect(result).toEqual({ scope: { provider: "CSS", domain: "push.example.invalid", appName: "live", streamName: `room_${room}` },
      expiresAt: new Date(now + 3600000) });
    expect(JSON.stringify(result)).not.toMatch(/SYNTHETIC|txSecret|txTime|rtmp:/);
  });
  it.each([0, -1, 86401])("过期/超长有效期 %s 拒绝", seconds => {
    expect(() => cssCredentialBoundary(room, url(seconds), now)).toThrow("LIVE_CREDENTIAL_BOUNDARY_INVALID");
  });
  it.each(["http://", "rtmp://user:password@", "rtmps://"])("非预期协议或用户信息 %s 不向异常链输出", prefix => {
    expect(() => cssCredentialBoundary(room, url().replace("rtmp://", prefix), now)).toThrow(/^LIVE_CREDENTIAL_BOUNDARY_INVALID$/);
  });
  it("重复时间参数或串房地址拒绝", () => {
    expect(() => cssCredentialBoundary(room, url() + "&txTime=123", now)).toThrow();
    expect(() => cssCredentialBoundary(room, url().replace(room, "other-room"), now)).toThrow();
  });
});
