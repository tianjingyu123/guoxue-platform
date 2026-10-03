import * as crypto from "crypto";
import { UniverifyBridgeService } from "./univerify-bridge.service";

describe("运营商取号与本站会话交换", () => {
  const secret = "test-only-univerify-bridge-secret-32bytes";
  const auth = { loginVerifiedPhone: jest.fn().mockResolvedValue({ accessToken: "session" }) };
  const redis = { setNXShared: jest.fn().mockResolvedValue(true) };
  const bridge = new UniverifyBridgeService(auth as any, redis as any);
  const signed = (overrides: Record<string, unknown> = {}) => {
    const dto = {
      phone: "13800138000",
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
      referrerCode: "",
      ...overrides,
    };
    return {
      ...dto,
      signature: crypto.createHmac("sha256", secret)
        .update(`${dto.phone}\n${dto.timestamp}\n${dto.nonce}\n${dto.referrerCode}`)
        .digest("hex"),
    };
  };

  beforeEach(() => {
    process.env.REBU_UNIVERIFY_SHARED_SECRET = secret;
    jest.clearAllMocks();
    redis.setNXShared.mockResolvedValue(true);
  });
  afterAll(() => { delete process.env.REBU_UNIVERIFY_SHARED_SECRET; });

  it("有效短时签名仅用已验手机号建立本站会话", async () => {
    const dto = signed();
    await expect(bridge.exchange(dto)).resolves.toEqual({ accessToken: "session" });
    expect(auth.loginVerifiedPhone).toHaveBeenCalledWith(dto.phone, "");
  });

  it("篡改号码、过期或密钥未配置均拒绝，不能建立会话", async () => {
    await expect(bridge.exchange({ ...signed(), phone: "13900139000" })).rejects.toThrow();
    await expect(bridge.exchange(signed({ timestamp: Date.now() - 61_000 }))).rejects.toThrow();
    delete process.env.REBU_UNIVERIFY_SHARED_SECRET;
    await expect(bridge.exchange(signed())).rejects.toThrow();
    expect(auth.loginVerifiedPhone).not.toHaveBeenCalled();
  });

  it("同一 nonce 重放及共享 Redis 故障均拒绝", async () => {
    redis.setNXShared.mockResolvedValueOnce(false);
    await expect(bridge.exchange(signed())).rejects.toThrow();
    redis.setNXShared.mockRejectedValueOnce(new Error("Redis unavailable"));
    await expect(bridge.exchange(signed())).rejects.toThrow();
    expect(auth.loginVerifiedPhone).not.toHaveBeenCalled();
  });
});
