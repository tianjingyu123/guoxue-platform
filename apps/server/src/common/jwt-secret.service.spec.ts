import { Test } from "@nestjs/testing";
import { JwtSecretService } from "./jwt-secret.service";

describe("JwtSecretService", () => {
  let svc: JwtSecretService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [JwtSecretService],
    }).compile();
    svc = mod.get(JwtSecretService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  it("getSigningSecret返回当前签发密钥", () => {
    const secret = svc.getSigningSecret();
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThan(0);
  });

  it("getVerificationSecrets返回当前+历史密钥列表", () => {
    const secrets = svc.getVerificationSecrets();
    expect(Array.isArray(secrets)).toBe(true);
    expect(secrets.length).toBeGreaterThanOrEqual(1);
  });

  it("generateSecret生成指定长度的base64url密钥", () => {
    const secret = JwtSecretService.generateSecret(32);
    expect(secret).toHaveLength(43); // 32 bytes → ~43 base64url chars
    expect(typeof secret).toBe("string");
  });

  it("generateSecret每次生成不同的密钥", () => {
    const s1 = JwtSecretService.generateSecret();
    const s2 = JwtSecretService.generateSecret();
    expect(s1).not.toBe(s2);
  });
});
