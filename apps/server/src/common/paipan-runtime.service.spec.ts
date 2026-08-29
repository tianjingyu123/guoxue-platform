import { PaipanRuntimeService } from "./paipan-runtime.service";

describe("PaipanRuntimeService", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("全新环境默认 native，显式模式与旧变量仍兼容", () => {
    delete process.env.PAIPAN_MODE;
    delete process.env.PAIPAN_LEGACY_MODE;
    expect(new PaipanRuntimeService().getMode()).toBe("native");
    process.env.PAIPAN_MODE = "legacy";
    expect(new PaipanRuntimeService().getMode()).toBe("legacy");
    delete process.env.PAIPAN_MODE;
    process.env.PAIPAN_LEGACY_MODE = "false";
    expect(new PaipanRuntimeService().getMode()).toBe("native");
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
});
