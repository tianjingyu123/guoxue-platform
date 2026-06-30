process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 字节，供 crypto 测试

import { ThirdPartyConfigLoader } from "./third-party-config.loader";
import { encrypt, decrypt } from "../../common/crypto.util";

const mockPrisma: any = {
  configSystem: { findMany: jest.fn(), findUnique: jest.fn() },
};

describe("ThirdPartyConfigLoader", () => {
  let loader: ThirdPartyConfigLoader;
  beforeEach(() => {
    jest.clearAllMocks();
    loader = new ThirdPartyConfigLoader(mockPrisma);
  });

  it("syncToEnv：解密 DB 配置写回 process.env", async () => {
    const stored = encrypt(JSON.stringify({ apiKey: "sk-test-ABCD1234" }));
    mockPrisma.configSystem.findMany.mockResolvedValue([{ configKey: "third_party.deepseek", configValue: stored }]);
    delete process.env.DEEPSEEK_API_KEY;
    const n = await loader.syncToEnv();
    expect(n).toBe(1);
    expect(process.env.DEEPSEEK_API_KEY).toBe("sk-test-ABCD1234");
  });

  it("多套 env 命名：小程序 appId 写入全部变量名（兼容代码不统一命名）", async () => {
    const stored = encrypt(JSON.stringify({ appId: "wx-mini-123" }));
    mockPrisma.configSystem.findMany.mockResolvedValue([{ configKey: "third_party.wechat_mini", configValue: stored }]);
    await loader.syncToEnv();
    expect(process.env.WECHAT_MINI_APP_ID).toBe("wx-mini-123");
    expect(process.env.MINIPROGRAM_APP_ID).toBe("wx-mini-123");
    expect(process.env.WECHAT_MP_APP_ID).toBe("wx-mini-123");
  });

  it("buildDisplayValue：敏感字段掩码、非敏感原样（明文不出后端）", () => {
    const stored = encrypt(JSON.stringify({ apiKey: "sk-secret-9876", baseUrl: "https://api.x" }));
    const display = JSON.parse(loader.buildDisplayValue("third_party.deepseek", stored));
    expect(display.apiKey).toBe("****9876");
    expect(display.baseUrl).toBe("https://api.x");
  });

  it("buildStoredValue：掩码值不覆盖真值、新值更新、加密存储", async () => {
    const existing = encrypt(JSON.stringify({ apiKey: "sk-real-key", baseUrl: "https://old" }));
    mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: existing });
    const stored = await loader.buildStoredValue(
      "third_party.deepseek",
      JSON.stringify({ apiKey: "****key", baseUrl: "https://new" }),
    );
    expect(stored).not.toContain("sk-real"); // 密文
    const merged = JSON.parse(decrypt(stored));
    expect(merged.apiKey).toBe("sk-real-key"); // 掩码值不覆盖
    expect(merged.baseUrl).toBe("https://new"); // 新值更新
  });

  it("env 兜底：DB 无配置时不写 env（保留 .env 原值）", async () => {
    mockPrisma.configSystem.findMany.mockResolvedValue([]);
    process.env.DEEPSEEK_API_KEY = "from-dotenv";
    const n = await loader.syncToEnv();
    expect(n).toBe(0);
    expect(process.env.DEEPSEEK_API_KEY).toBe("from-dotenv"); // 兜底不变
  });
});
