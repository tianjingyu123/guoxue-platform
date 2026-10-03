import { serverConfig } from "./server-config";

const MANAGED_KEYS = [
  "NODE_ENV",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "BIGSCREEN_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "PUBLIC_DOMAIN",
  "PUBLIC_API_URL",
  "PUBLIC_H5_URL",
  "PUBLIC_ASSET_ORIGIN",
  "CORS_ORIGIN",
  "WS_CORS_ORIGIN",
] as const;

describe("ServerConfig 生产启动门禁", () => {
  const originalValues = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of MANAGED_KEYS) originalValues.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of MANAGED_KEYS) delete process.env[key];
    process.env.JWT_SECRET = "j".repeat(64);
    process.env.ENCRYPTION_KEY = "e".repeat(32);
    process.env.BIGSCREEN_SECRET = "b".repeat(32);
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/guoxue";
  });

  afterAll(() => {
    for (const key of MANAGED_KEYS) {
      const value = originalValues.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("开发环境只要求基础密钥和数据库", () => {
    process.env.NODE_ENV = "development";
    expect(serverConfig.validateRequiredEnv()).toEqual([]);
  });

  it("生产环境缺少公网入口、缓存和跨域配置时拒绝启动", () => {
    process.env.NODE_ENV = "production";

    expect(() => serverConfig.validateRequiredEnv()).toThrow(
      /REDIS_URL[\s\S]*PUBLIC_DOMAIN[\s\S]*PUBLIC_API_URL[\s\S]*PUBLIC_H5_URL[\s\S]*PUBLIC_ASSET_ORIGIN[\s\S]*CORS_ORIGIN[\s\S]*WS_CORS_ORIGIN/,
    );
  });

  it("生产环境完整配置时通过", () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_URL = "redis://redis:6379";
    process.env.PUBLIC_DOMAIN = "api.example.com";
    process.env.PUBLIC_API_URL = "https://api.example.com";
    process.env.PUBLIC_H5_URL = "https://api.example.com/h5/";
    process.env.PUBLIC_ASSET_ORIGIN = "https://cdn.example.com";
    process.env.CORS_ORIGIN = "https://api.example.com";
    process.env.WS_CORS_ORIGIN = "https://api.example.com";

    expect(serverConfig.validateRequiredEnv()).toEqual([]);
  });

  it("统一规范化 H5 地址与 WebSocket 来源列表", () => {
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_H5_URL = " https://new.example.com/h5/// ";
    process.env.WS_CORS_ORIGIN =
      "https://new.example.com/, https://admin.example.com/ , https://new.example.com";

    expect(serverConfig.publicH5Url).toBe("https://new.example.com/h5/");
    expect(serverConfig.publicH5BaseUrl).toBe("https://new.example.com/h5");
    expect(serverConfig.wsCorsOrigin).toEqual([
      "https://new.example.com",
      "https://admin.example.com",
    ]);
  });

  it("生产环境公网域名、HTTPS 或跨域来源冲突时拒绝启动", () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_URL = "redis://redis:6379";
    process.env.PUBLIC_DOMAIN = "api.example.com";
    process.env.PUBLIC_API_URL = "http://wrong.example.com";
    process.env.PUBLIC_H5_URL = "https://api.example.com/h5/";
    process.env.PUBLIC_ASSET_ORIGIN = "http://cdn.example.com";
    process.env.CORS_ORIGIN = "*";
    process.env.WS_CORS_ORIGIN = "https://other.example.com";

    expect(() => serverConfig.validateRequiredEnv()).toThrow(
      /PUBLIC_API_URL 生产环境必须使用 HTTPS[\s\S]*PUBLIC_ASSET_ORIGIN 生产环境必须使用 HTTPS[\s\S]*PUBLIC_DOMAIN 必须与 PUBLIC_API_URL 的主机名一致[\s\S]*不允许使用 \*[\s\S]*CORS_ORIGIN 必须包含[\s\S]*WS_CORS_ORIGIN 必须包含/,
    );
  });
});
