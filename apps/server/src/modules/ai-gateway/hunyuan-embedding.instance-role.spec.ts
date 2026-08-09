import { HunyuanEmbeddingService } from "./hunyuan-embedding.service";

describe("HunyuanEmbeddingService 实例角色", () => {
  const originalEnv = {
    mode: process.env.TENCENT_CREDENTIAL_MODE,
    role: process.env.TENCENT_CVM_ROLE_NAME,
    enabled: process.env.HUNYUAN_EMBEDDING_ENABLED,
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries({
      TENCENT_CREDENTIAL_MODE: originalEnv.mode,
      TENCENT_CVM_ROLE_NAME: originalEnv.role,
      HUNYUAN_EMBEDDING_ENABLED: originalEnv.enabled,
      TENCENT_SECRET_ID: originalEnv.secretId,
      TENCENT_SECRET_KEY: originalEnv.secretKey,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalFetch === undefined) delete (globalThis as { fetch?: typeof fetch }).fetch;
    else globalThis.fetch = originalFetch;
  });

  it("无静态密钥时使用实例角色临时凭据调用 GetEmbedding", async () => {
    process.env.TENCENT_CREDENTIAL_MODE = "instance-role";
    process.env.TENCENT_CVM_ROLE_NAME = "RebugxHunyuanSpecRole";
    process.env.HUNYUAN_EMBEDDING_ENABLED = "true";
    delete process.env.TENCENT_SECRET_ID;
    delete process.env.TENCENT_SECRET_KEY;

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          Code: "Success",
          TmpSecretId: "role-id",
          TmpSecretKey: "role-key",
          Token: "role-token",
          ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ Response: { Data: [{ Index: 0, Embedding: [0.1, 0.2] }] } }),
      } as Response);
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock;

    const redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HunyuanEmbeddingService(redis as never);

    expect(service.isEnabled).toBe(true);
    await expect(service.embedOne("国学测试")).resolves.toEqual([0.1, 0.2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://hunyuan.tencentcloudapi.com");
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({
      "X-TC-Token": "role-token",
    });
  });
});
