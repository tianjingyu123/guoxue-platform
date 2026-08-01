import { CosStorageProvider } from "./cos-storage.provider";
import { LocalStorageProvider } from "./local-storage.provider";
import { createStorageProvider } from "./upload.module";

const STORAGE_ENV_KEYS = [
  "STORAGE_PROVIDER",
  "COS_SECRET_ID",
  "COS_SECRET_KEY",
  "COS_BUCKET",
  "COS_REGION",
  "COS_CDN_BASE",
  "TENCENT_CREDENTIAL_MODE",
  "TENCENT_CVM_ROLE_NAME",
] as const;

describe("createStorageProvider", () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of STORAGE_ENV_KEYS) originalEnv.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of STORAGE_ENV_KEYS) delete process.env[key];
  });

  afterAll(() => {
    for (const key of STORAGE_ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("auto 且未配置 COS 时使用本地存储", () => {
    expect(createStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  it("显式 local 时忽略 COS 配置", () => {
    process.env.STORAGE_PROVIDER = "local";
    process.env.COS_SECRET_ID = "partial";
    expect(createStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  it("显式 cos 且配置不完整时拒绝启动", () => {
    process.env.STORAGE_PROVIDER = "cos";
    process.env.COS_BUCKET = "test-bucket";
    expect(() => createStorageProvider()).toThrow("COS_SECRET_ID, COS_SECRET_KEY");
  });

  it("auto 下发现部分 COS 配置时拒绝静默回退", () => {
    process.env.COS_SECRET_ID = "test-id";
    expect(() => createStorageProvider()).toThrow("COS_SECRET_KEY, COS_BUCKET");
  });

  it("COS 配置完整时使用对象存储", () => {
    process.env.STORAGE_PROVIDER = "cos";
    process.env.COS_SECRET_ID = "test-id";
    process.env.COS_SECRET_KEY = "test-key";
    process.env.COS_BUCKET = "test-bucket";
    expect(createStorageProvider()).toBeInstanceOf(CosStorageProvider);
  });

  it("实例角色模式无需静态密钥即可使用对象存储", () => {
    process.env.STORAGE_PROVIDER = "cos";
    process.env.TENCENT_CREDENTIAL_MODE = "instance-role";
    process.env.TENCENT_CVM_ROLE_NAME = "RebugxProductionCvmRole";
    process.env.COS_BUCKET = "test-bucket";
    process.env.COS_REGION = "ap-beijing";
    expect(createStorageProvider()).toBeInstanceOf(CosStorageProvider);
  });

  it("非法存储模式时拒绝启动", () => {
    process.env.STORAGE_PROVIDER = "unknown";
    expect(() => createStorageProvider()).toThrow("仅支持 auto、local 或 cos");
  });
});
