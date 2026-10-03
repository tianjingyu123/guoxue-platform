import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { CozeOAuthService } from "./coze-oauth.service";
import { RedisService } from "../../redis/redis.service";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

/** 极简内存版 RedisService（仅实现本服务用到的 get/set/setNX/del） */
class FakeRedis {
  store = new Map<string, string>();
  async get(k: string) { return this.store.get(k) ?? null; }
  async set(k: string, v: string) { this.store.set(k, v); }
  async setNX(k: string) { if (this.store.has(k)) return false; this.store.set(k, "1"); return true; }
  async del(k: string) { this.store.delete(k); }
}

describe("CozeOAuthService", () => {
  const OLD_ENV = process.env;
  let redis: FakeRedis;
  let svc: CozeOAuthService;
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  });

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.COZE_OAUTH_CLIENT_ID;
    delete process.env.COZE_OAUTH_PUBLIC_KEY_ID;
    delete process.env.COZE_OAUTH_PRIVATE_KEY;
    delete process.env.COZE_API_BASE;
    mockFetch.mockReset();
    redis = new FakeRedis();
    svc = new CozeOAuthService(redis as unknown as RedisService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  const configure = () => {
    process.env.COZE_OAUTH_CLIENT_ID = "client-123";
    process.env.COZE_OAUTH_PUBLIC_KEY_ID = "pubkey-fingerprint-abc";
    process.env.COZE_OAUTH_PRIVATE_KEY = privateKey;
  };

  it("未配置时 isConfigured=false 且 getAccessToken 返回 null（不发请求）", async () => {
    expect(svc.isConfigured()).toBe(false);
    await expect(svc.getAccessToken()).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("配齐凭证后：签发合规 JWT(RS256/kid/iss/aud) 换取 token 并缓存", async () => {
    configure();
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ access_token: "coze_at_xyz", expires_in: 900, token_type: "Bearer" }),
    });

    const token = await svc.getAccessToken();
    expect(token).toBe("coze_at_xyz");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.coze.cn/api/permission/oauth2/token");
    const body = JSON.parse(init.body);
    expect(body.grant_type).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(body.duration_seconds).toBe(900);

    // 断言自签 JWT 结构（用公钥验签 + 校验声明）
    const assertion = (init.headers.Authorization as string).replace(/^Bearer /, "");
    const decodedHeader = JSON.parse(Buffer.from(assertion.split(".")[0], "base64url").toString());
    expect(decodedHeader.alg).toBe("RS256");
    expect(decodedHeader.kid).toBe("pubkey-fingerprint-abc");
    const verified = jwt.verify(assertion, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload;
    expect(verified.iss).toBe("client-123");
    expect(verified.aud).toBe("api.coze.cn");
    expect(verified.jti).toBeTruthy();
    expect(verified.exp! - verified.iat!).toBe(3600);

    expect(await redis.get("coze:oauth:access_token")).toBe("coze_at_xyz");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("海外域名 COZE_API_BASE 生效：端点与 aud 随之切换", async () => {
    configure();
    process.env.COZE_API_BASE = "https://api.coze.com";
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ access_token: "t", expires_in: 900 }),
    });
    await svc.getAccessToken();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.coze.com/api/permission/oauth2/token");
    const assertion = (init.headers.Authorization as string).replace(/^Bearer /, "");
    const verified = jwt.verify(assertion, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload;
    expect(verified.aud).toBe("api.coze.com");
  });

  it("命中缓存直接返回，不再发起换取请求", async () => {
    configure();
    await redis.set("coze:oauth:access_token", "cached_tok");
    await expect(svc.getAccessToken()).resolves.toBe("cached_tok");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("换取失败返回 null（供调用方回退 PAT），不缓存", async () => {
    configure();
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 401, json: async () => ({ error_code: 700, error_message: "invalid signature" }),
    });
    await expect(svc.getAccessToken()).resolves.toBeNull();
    expect(await redis.get("coze:oauth:access_token")).toBeNull();
  });

  it("expires_in 为绝对时间戳时也能正确换取（TTL 兼容）", async () => {
    configure();
    const abs = Math.floor(Date.now() / 1000) + 900; // 绝对 Unix 时间戳
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({ access_token: "tok_abs", expires_in: abs }),
    });
    await expect(svc.getAccessToken()).resolves.toBe("tok_abs");
    expect(await redis.get("coze:oauth:access_token")).toBe("tok_abs");
  });
});
