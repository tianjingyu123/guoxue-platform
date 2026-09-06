import { PaipanRuntimeService } from "./paipan-runtime.service";

describe("PaipanRuntimeService", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("全新环境默认 legacy，只有显式 PAIPAN_MODE 才开放 native", () => {
    delete process.env.PAIPAN_MODE;
    delete process.env.PAIPAN_LEGACY_MODE;
    expect(new PaipanRuntimeService().getMode()).toBe("legacy");
    process.env.PAIPAN_MODE = "native";
    expect(new PaipanRuntimeService().getMode()).toBe("native");
    process.env.PAIPAN_MODE = "legacy";
    expect(new PaipanRuntimeService().getMode()).toBe("legacy");
  });

  it("QA 仅允许预发布双重域名校验与明确白名单角色", () => {
    process.env.PAIPAN_NATIVE_QA_ENABLED = "true";
    process.env.PAIPAN_NATIVE_QA_HOST = "pre-api.rebugx.cn";
    process.env.PUBLIC_API_URL = "https://pre-api.rebugx.cn";
    process.env.PAIPAN_NATIVE_QA_ALLOWLIST = "role:SUPER_ADMIN";
    const runtime = new PaipanRuntimeService();
    expect(
      runtime.isQaRequestAllowed("pre-api.rebugx.cn", { id: "qa", roles: ["SUPER_ADMIN"] }),
    ).toBe(true);
    expect(runtime.isQaRequestAllowed("api.rebugx.cn", { id: "qa", roles: ["SUPER_ADMIN"] })).toBe(
      false,
    );
    expect(runtime.isQaRequestAllowed("pre-api.rebugx.cn", { id: "user", roles: [] })).toBe(false);
  });

  it("关闭 QA 开关后白名单立即失效", () => {
    process.env.PAIPAN_NATIVE_QA_ENABLED = "false";
    expect(
      new PaipanRuntimeService().isQaRequestAllowed("pre-api.rebugx.cn", {
        id: "qa",
        roles: ["SUPER_ADMIN"],
      }),
    ).toBe(false);
  });

  it("运行入口主库值优先，查询失败不沿用旧 native 环境配置", async () => {
    process.env.PAIPAN_MODE = "native";
    const findUnique = jest.fn().mockResolvedValue({ configValue: "legacy" });
    const prisma = { configSystem: { findUnique } } as any;
    const runtime = new PaipanRuntimeService();
    expect(await runtime.getCurrentMode(prisma)).toBe("legacy");
    findUnique.mockRejectedValue(new Error("unavailable"));
    await expect(runtime.getCurrentMode(prisma)).rejects.toMatchObject({ status: 503 });
  });

  it.each([[], ["OPERATION_ADMIN"], ["CONTENT_AUDITOR"], ["USER"]].map(roles => ({ roles })))("旧白名单不得授予非超级管理员预览：%j", ({ roles }) => {
    process.env.PAIPAN_NATIVE_QA_ENABLED = "true";
    process.env.PAIPAN_NATIVE_QA_HOST = "pre-api.rebugx.cn";
    process.env.PUBLIC_API_URL = "https://pre-api.rebugx.cn";
    process.env.PAIPAN_NATIVE_QA_ALLOWLIST = "user:qa,role:OPERATION_ADMIN,role:CONTENT_AUDITOR";
    expect(new PaipanRuntimeService().isQaRequestAllowed("pre-api.rebugx.cn", { id: "qa", roles })).toBe(false);
  });
});
