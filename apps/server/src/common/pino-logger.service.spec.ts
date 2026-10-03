import { PinoLoggerService } from "./pino-logger.service";

interface ExtractableLogger {
  extract(message: unknown, params: unknown[]): { msg: string; ctx?: string };
}

describe("PinoLoggerService", () => {
  let previousNodeEnv: string | undefined;

  beforeAll(() => {
    previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it("在对象序列化前递归脱敏支付凭据和回执", () => {
    const logger = new PinoLoggerService() as unknown as ExtractableLogger;
    const result = logger.extract(
      {
        password: "plain-password",
        payment: {
          apiV3Key: "wechat-secret",
          signedPayload: "apple-receipt",
          publicValue: "visible",
        },
      },
      ["PaymentService"],
    );

    expect(result.ctx).toBe("PaymentService");
    expect(result.msg).toContain('"password":"[REDACTED]"');
    expect(result.msg).toContain('"apiV3Key":"[REDACTED]"');
    expect(result.msg).toContain('"signedPayload":"[REDACTED]"');
    expect(result.msg).toContain('"publicValue":"visible"');
    expect(result.msg).not.toContain("plain-password");
    expect(result.msg).not.toContain("wechat-secret");
    expect(result.msg).not.toContain("apple-receipt");
  });
});
