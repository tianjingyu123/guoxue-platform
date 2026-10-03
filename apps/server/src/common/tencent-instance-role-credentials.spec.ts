import {
  getTencentCredentialMode,
  hasTencentCloudCredentialConfiguration,
  resolveTencentCloudCredentials,
  TencentInstanceRoleCredentialProvider,
} from "./tencent-instance-role-credentials";

describe("TencentInstanceRoleCredentialProvider", () => {
  const originalMode = process.env.TENCENT_CREDENTIAL_MODE;
  const originalRoleName = process.env.TENCENT_CVM_ROLE_NAME;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalMode === undefined) delete process.env.TENCENT_CREDENTIAL_MODE;
    else process.env.TENCENT_CREDENTIAL_MODE = originalMode;
    if (originalRoleName === undefined) delete process.env.TENCENT_CVM_ROLE_NAME;
    else process.env.TENCENT_CVM_ROLE_NAME = originalRoleName;
    if (originalFetch === undefined) delete (globalThis as { fetch?: typeof fetch }).fetch;
    else globalThis.fetch = originalFetch;
  });

  it("默认保持静态凭据兼容模式", () => {
    delete process.env.TENCENT_CREDENTIAL_MODE;
    expect(getTencentCredentialMode()).toBe("static");
  });

  it("拒绝未知凭据模式", () => {
    process.env.TENCENT_CREDENTIAL_MODE = "unknown";
    expect(() => getTencentCredentialMode()).toThrow(
      "TENCENT_CREDENTIAL_MODE 仅支持 static 或 instance-role",
    );
  });

  it("读取 CVM 元数据并缓存未临近过期的临时凭据", async () => {
    const expiredTime = Math.floor(Date.now() / 1000) + 3600;
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Code: "Success",
        TmpSecretId: "temporary-id",
        TmpSecretKey: "temporary-key",
        Token: "temporary-token",
        ExpiredTime: expiredTime,
      }),
    } as Response);
    const provider = new TencentInstanceRoleCredentialProvider(
      "RebugxProductionCvmRole",
      fetchImpl,
    );

    const first = await provider.getCredentials();
    const second = await provider.getCredentials();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      TmpSecretId: "temporary-id",
      TmpSecretKey: "temporary-key",
      SecurityToken: "temporary-token",
      ExpiredTime: expiredTime,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/RebugxProductionCvmRole",
    );
  });

  it("拒绝缺失安全令牌的元数据响应", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Code: "Success",
        TmpSecretId: "temporary-id",
        TmpSecretKey: "temporary-key",
        ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
      }),
    } as Response);
    const provider = new TencentInstanceRoleCredentialProvider(
      "RebugxProductionCvmRole",
      fetchImpl,
    );

    await expect(provider.getCredentials()).rejects.toThrow(
      "CVM 实例角色凭据字段不完整",
    );
  });

  it("统一解析器在静态模式返回调用方传入的密钥", async () => {
    process.env.TENCENT_CREDENTIAL_MODE = "static";

    expect(hasTencentCloudCredentialConfiguration("static-id", "static-key")).toBe(true);
    await expect(resolveTencentCloudCredentials("static-id", "static-key")).resolves.toEqual({
      secretId: "static-id",
      secretKey: "static-key",
    });
  });

  it("统一解析器在实例角色模式返回临时密钥和安全令牌", async () => {
    process.env.TENCENT_CREDENTIAL_MODE = "instance-role";
    process.env.TENCENT_CVM_ROLE_NAME = "RebugxResolverSpecRole";
    const expiredTime = Math.floor(Date.now() / 1000) + 3600;
    (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Code: "Success",
        TmpSecretId: "role-id",
        TmpSecretKey: "role-key",
        Token: "role-token",
        ExpiredTime: expiredTime,
      }),
    } as Response);

    expect(hasTencentCloudCredentialConfiguration()).toBe(true);
    await expect(resolveTencentCloudCredentials()).resolves.toEqual({
      secretId: "role-id",
      secretKey: "role-key",
      securityToken: "role-token",
    });
  });
});
