import { tc3Sign } from "./tc3.util";

describe("tc3Sign", () => {
  it("临时凭据应携带安全令牌", () => {
    const signed = tc3Sign({
      secretId: "temporary-id",
      secretKey: "temporary-key",
      securityToken: "temporary-token",
      service: "sms",
      action: "SendSms",
      version: "2021-01-11",
      payload: {},
      region: "ap-guangzhou",
    });

    expect(signed.headers["X-TC-Token"]).toBe("temporary-token");
  });

  it("长期凭据不得发送空安全令牌", () => {
    const signed = tc3Sign({
      secretId: "static-id",
      secretKey: "static-key",
      service: "sms",
      action: "SendSms",
      version: "2021-01-11",
      payload: {},
    });

    expect(signed.headers).not.toHaveProperty("X-TC-Token");
  });
});
