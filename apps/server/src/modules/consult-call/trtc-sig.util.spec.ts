import { createHmac } from "crypto";
import { inflateSync } from "zlib";
import { buildTrtcConfig } from "./trtc-sig.util";

describe("咨询指定房间票据（仅本地合成密钥）", () => {
  const originalEnv = process.env;
  const secret = "LOCAL_SYNTHETIC_NOT_A_CLOUD_KEY", room = "consult_0123456789abcdef";
  const user = "d86f53c6-320f-4149-bda1-078271a0cc08";
  const decode = (ticket: string) => JSON.parse(inflateSync(Buffer.from(ticket.replace(/\*/g, "+").replace(/-/g, "/").replace(/_/g, "="), "base64")).toString());
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-06T00:00:00Z"));
    process.env = { ...originalEnv, TRTC_SDK_APP_ID: "1400000002", TRTC_SECRET_KEY: "PUBLIC_ONLY",
      TRTC_CALLBACK_KEY: "PUBLIC_CALLBACK", CONSULT_TRTC_SDK_APP_ID: "1400000001",
      CONSULT_TRTC_SECRET_KEY: secret, CONSULT_TRTC_CALLBACK_KEY: "CONSULT_CALLBACK" };
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });
  it.each(["VOICE", "VIDEO"] as const)("%s 真实签名绑定字符串房间、映射身份与精确权限", type => {
    const result = buildTrtcConfig(user, room, type, 300);
    expect(result.configured).toBe(true); expect(result.strRoomId).toBe(room);
    expect(result.userId).toMatch(/^c_[a-f0-9]{30}$/); expect(result.userId).not.toContain(user);
    expect(result.expiresAt).toBe("2026-09-06T00:05:00.000Z");
    expect(JSON.stringify(result)).not.toContain(secret);
    const doc = decode(result.privateMapKey!);
    const content = `TLS.identifier:${doc["TLS.identifier"]}\nTLS.sdkappid:${doc["TLS.sdkappid"]}\nTLS.time:${doc["TLS.time"]}\nTLS.expire:${doc["TLS.expire"]}\nTLS.userbuf:${doc["TLS.userbuf"]}\n`;
    expect(doc["TLS.sig"]).toBe(createHmac("sha256", secret).update(content).digest("base64"));
    const bytes = Buffer.from(doc["TLS.userbuf"], "base64"), length = bytes.readUInt16BE(1), offset = 3 + length;
    expect(bytes[0]).toBe(1); expect(bytes.subarray(3, offset).toString()).toBe(result.userId);
    expect(bytes.readUInt32BE(offset)).toBe(1400000001);
    expect(bytes.readUInt32BE(offset + 4)).toBe(0);
    expect(bytes.readUInt32BE(offset + 8)).toBe(Date.now() / 1000 + 300);
    expect(bytes.readUInt32BE(offset + 12)).toBe(type === "VOICE" ? 15 : 63);
    expect(bytes.readUInt16BE(offset + 20)).toBe(room.length);
    expect(bytes.subarray(offset + 22).toString()).toBe(room);
    const sig = decode(result.userSig!);
    expect(sig["TLS.identifier"]).toBe(result.userId); expect(sig["TLS.expire"]).toBe(300);
    expect(sig["TLS.userbuf"]).toBeUndefined();
  });
  it("双方身份不同，同一平台账号在不同通话也不复用RTC身份", () => {
    const first = buildTrtcConfig(user, room, "VOICE");
    expect(buildTrtcConfig(user, room, "VOICE").userId).toBe(first.userId);
    expect(buildTrtcConfig("another-synthetic-user", room, "VOICE").userId).not.toBe(first.userId);
    expect(buildTrtcConfig(user, "consult_fedcba9876543210", "VOICE").userId).not.toBe(first.userId);
  });
  it.each(["", "0", "-1", "1.5", "4294967296", "NaN"])("非法AppId不生成部分票据：%s", appId => {
    process.env.CONSULT_TRTC_SDK_APP_ID = appId;
    expect(buildTrtcConfig(user, room, "VOICE")).toMatchObject({ configured: false, userSig: null, privateMapKey: null, expiresAt: null });
  });
  it("缺密钥或非法用户/房间/类型不签发", () => {
    for (const args of [["", room, "VOICE"], [" space ", room, "VOICE"], [user, "other_room", "VOICE"], [user, room, "OTHER"]]) {
      expect(buildTrtcConfig(args[0], args[1], args[2] as "VOICE").configured).toBe(false);
    }
    process.env.CONSULT_TRTC_SECRET_KEY = " ";
    expect(buildTrtcConfig(user, room, "VOICE").configured).toBe(false);
  });
  it.each([0, -1, 1.5, 86401, Infinity])("非法有效期不生成票据：%s", seconds => {
    expect(buildTrtcConfig(user, room, "VOICE", seconds).configured).toBe(false);
  });
  it.each(["CONSULT_TRTC_SDK_APP_ID", "CONSULT_TRTC_SECRET_KEY", "CONSULT_TRTC_CALLBACK_KEY"])("缺少%s绝不借用公共直播配置", key => {
    delete process.env[key];
    expect(buildTrtcConfig(user, room, "VOICE")).toMatchObject({ configured: false, userSig: null, privateMapKey: null });
  });
  it("共享应用或回调密钥不签发私密咨询凭据", () => {
    process.env.CONSULT_TRTC_SDK_APP_ID = process.env.TRTC_SDK_APP_ID;
    expect(buildTrtcConfig(user, room, "VOICE").configured).toBe(false);
    process.env.CONSULT_TRTC_SDK_APP_ID = "1400000001";
    process.env.CONSULT_TRTC_CALLBACK_KEY = process.env.TRTC_CALLBACK_KEY;
    expect(buildTrtcConfig(user, room, "VOICE").configured).toBe(false);
  });
});
