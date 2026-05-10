import { Test, TestingModule } from "@nestjs/testing";
import { WsAuthService } from "./ws-auth.service";

describe("WsAuthService", () => {
  let svc: WsAuthService;

  beforeEach(async () => {
    process.env.JWT_SECRET = "test-jwt-secret";
    const mod: TestingModule = await Test.createTestingModule({
      providers: [WsAuthService],
    }).compile();
    svc = mod.get(WsAuthService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("Token验证", () => {
    it("无效token应返回null", () => {
      expect(svc.verifyToken("invalid.token.string")).toBeNull();
    });

    it("空token应返回null", () => {
      expect(svc.verifyToken("")).toBeNull();
    });

    it("格式错误的token应返回null", () => {
      expect(svc.verifyToken("not-a-jwt")).toBeNull();
    });

    it("过期token应返回null", () => {
      // 构造一个过期的HS256 JWT
      const expiredPayload = Buffer.from(JSON.stringify({
        sub: "user-1", role: "USER", exp: Math.floor(Date.now() / 1000) - 3600,
      })).toString("base64url");
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const token = `${header}.${expiredPayload}.invalidsig`;
      expect(svc.verifyToken(token)).toBeNull();
    });
  });

  describe("extractUser", () => {
    it("无token应返回null", () => {
      expect(svc.extractUser({})).toBeNull();
      expect(svc.extractUser({ query: {} })).toBeNull();
    });

    it("有token但无效应返回null", () => {
      expect(svc.extractUser({ auth: { token: "bad" } })).toBeNull();
      expect(svc.extractUser({ query: { token: "bad" } })).toBeNull();
    });
  });

  describe("有效Token验证", () => {
    it("应能验证正确签名的HS256 JWT", () => {
      const { createHmac } = require("crypto");
      const payload = { sub: "user-1", role: "USER", exp: Math.floor(Date.now() / 1000) + 3600 };
      const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const hmac = createHmac("sha256", process.env.JWT_SECRET);
      hmac.update(`${headerB64}.${payloadB64}`);
      const sig = hmac.digest("base64url").replace(/=/g, "");
      const token = `${headerB64}.${payloadB64}.${sig}`;

      const user = svc.verifyToken(token);
      expect(user).not.toBeNull();
      expect(user!.userId).toBe("user-1");
      expect(user!.role).toBe("USER");
    });
  });
});
