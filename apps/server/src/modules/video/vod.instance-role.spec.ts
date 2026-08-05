import { VodService } from "./vod.service";
import {
  getTencentCredentialMode,
  getTencentInstanceRoleCredentialProvider,
} from "../../common/tencent-instance-role-credentials";

jest.mock("../../common/tencent-instance-role-credentials", () => ({
  getTencentCredentialMode: jest.fn(),
  getTencentInstanceRoleCredentialProvider: jest.fn(),
}));

describe("VodService 实例角色", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TENCENT_CREDENTIAL_MODE: "instance-role",
      TENCENT_CVM_ROLE_NAME: "RebugxProductionCvmRole",
      VOD_SUB_APP_ID: "1325351100",
    };
    delete process.env.COS_SECRET_ID;
    delete process.env.COS_SECRET_KEY;
    delete process.env.TENCENT_SECRET_ID;
    delete process.env.TENCENT_SECRET_KEY;

    (getTencentCredentialMode as jest.Mock).mockReturnValue("instance-role");
    (getTencentInstanceRoleCredentialProvider as jest.Mock).mockReturnValue({
      getCredentials: jest.fn().mockResolvedValue({
        TmpSecretId: "temporary-id",
        TmpSecretKey: "temporary-key",
        SecurityToken: "temporary-token",
        StartTime: Math.floor(Date.now() / 1000) - 60,
        ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
      }),
    });
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ Response: { RequestId: "request-id" } }),
    } as unknown as Response);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("服务端 VOD API 使用实例角色临时凭据并携带安全令牌", async () => {
    const service = new VodService();
    await service.getMediaInfo("file-test");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-TC-Token"]).toBe("temporary-token");
    expect(headers.Authorization).toContain("Credential=temporary-id/");
  });

  it("实例角色模式拒绝生成不支持安全令牌的旧式客户端上传签名", () => {
    const service = new VodService();
    expect(() => service.genUploadSignature()).toThrow("VOD 客户端上传签名需要受限静态密钥");
  });
});
