import { Test } from "@nestjs/testing";
import { TlsSigService } from "./tlssig.service";

describe("TlsSigService", () => {
  let svc: TlsSigService;

  beforeAll(async () => {
    process.env.IM_APP_ID = "1400000000";
    process.env.IM_ADMIN_KEY = "test-admin-key-test-admin-key-test-admin-key";

    const mod = await Test.createTestingModule({
      providers: [TlsSigService],
    }).compile();
    svc = mod.get(TlsSigService);
  });

  it("生成用户 UserSig", () => {
    const sig = svc.genUserSig("user-123");
    expect(sig).toBeTruthy();
    expect(typeof sig).toBe("string");
    expect(sig.length).toBeGreaterThan(0);
  });

  it("生成管理员 UserSig", () => {
    process.env.IM_ADMIN_ID = "admin-001";
    const sig = svc.genAdminSig();
    expect(sig).toBeTruthy();
    expect(typeof sig).toBe("string");
  });

  it("返回 AppId", () => {
    expect(svc.getAppId()).toBe(1400000000);
  });

  it("未配置时抛出异常", async () => {
    delete process.env.IM_APP_ID;
    delete process.env.IM_ADMIN_KEY;

    const mod = await Test.createTestingModule({
      providers: [TlsSigService],
    }).compile();
    const badSvc = mod.get(TlsSigService);

    expect(() => badSvc.genUserSig("user-1")).toThrow("IM 未配置");
  });
});
