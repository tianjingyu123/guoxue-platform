import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { AppleLoginService } from "./apple-login.service";

describe("AppleLoginService", () => {
  const originalFetch = global.fetch;
  const originalAudience = process.env.APPLE_LOGIN_AUDIENCE;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalAudience === undefined) delete process.env.APPLE_LOGIN_AUDIENCE;
    else process.env.APPLE_LOGIN_AUDIENCE = originalAudience;
  });

  function fixture(audience = "com.rebu.iosapprebu") {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const kid = "test-key";
    const token = jwt.sign(
      {
        sub: "apple-user-1",
        email_verified: "true",
        is_private_email: "true",
        real_user_status: 2,
      },
      privateKey,
      {
        algorithm: "RS256",
        keyid: kid,
        issuer: "https://appleid.apple.com",
        audience,
        expiresIn: "5m",
      },
    );
    const jwk = publicKey.export({ format: "jwk" });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }] }),
    } as Response);
    return { token };
  }

  it("验证签名、issuer、audience 并返回稳定 subject", async () => {
    process.env.APPLE_LOGIN_AUDIENCE = "com.rebu.iosapprebu";
    const { token } = fixture();
    const service = new AppleLoginService();

    await expect(service.verifyIdentityToken(token)).resolves.toEqual({
      subject: "apple-user-1",
      audience: "com.rebu.iosapprebu",
      emailVerified: true,
      isPrivateEmail: true,
      realUserStatus: 2,
    });
  });

  it("拒绝其他应用签发对象的令牌", async () => {
    process.env.APPLE_LOGIN_AUDIENCE = "com.rebu.iosapprebu";
    const { token } = fixture("com.example.other");
    const service = new AppleLoginService();

    await expect(service.verifyIdentityToken(token)).rejects.toThrow();
  });

  it("同一公钥在缓存期内不重复请求 Apple JWKS", async () => {
    const { token } = fixture();
    const service = new AppleLoginService();
    await service.verifyIdentityToken(token);
    await service.verifyIdentityToken(token);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
