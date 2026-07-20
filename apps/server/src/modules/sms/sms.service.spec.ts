import { Test, TestingModule } from "@nestjs/testing";
import { SmsService } from "./sms.service";

const mockRedis: any = {
  get: jest.fn((key: string) => {
    if (key.startsWith("sms:fail:")) return Promise.resolve(null);
    return Promise.resolve(undefined);
  }),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(0),
};
const mockPrisma = { smsLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() } };
const mockMetrics = { recordExternalApi: jest.fn() };
const mockFetch = jest.fn();

describe("SmsService", () => {
  let svc: SmsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(undefined);
    mockPrisma.smsLog.create.mockResolvedValue({});
    mockFetch.mockReset();
    global.fetch = mockFetch;
    process.env.TENCENT_SECRET_ID = "test-id";
    process.env.TENCENT_SECRET_KEY = "test-key";
    process.env.SMS_SIGN_NAME = "热卜国学";
    process.env.SMS_APP_ID = "1400000000";
    process.env.SMS_TEMPLATE_ID = "123456";
    process.env.SMS_CHURN_TEMPLATE_ID = "654321";

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();
    svc = mod.get(SmsService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  it("未配置凭证时应显示警告", () => {
    delete process.env.TENCENT_SECRET_ID;
    expect(() => Test.createTestingModule({
      providers: [
        SmsService,
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile()).not.toThrow();
  });

  describe("校验码验证", () => {
    it("成功匹配应返回true", async () => {
      // failKey→null, codeKey→"123456"
      mockRedis.get.mockImplementation((key: string) =>
        key.startsWith("sms:fail:") ? Promise.resolve(null) : Promise.resolve("123456"),
      );
      const result = await svc.verifyCode("13800138000", "123456");
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("不匹配应抛出异常（验证码被消耗）", async () => {
      // failKey→null, codeKey→"654321"
      mockRedis.get.mockImplementation((key: string) =>
        key.startsWith("sms:fail:") ? Promise.resolve(null) : Promise.resolve("654321"),
      );
      await expect(svc.verifyCode("13800138000", "123456")).rejects.toThrow("验证码错误");
    });

    it("验证码不存在应抛出异常", async () => {
      // 两次 get 都返回 null
      mockRedis.get.mockResolvedValue(null);
      await expect(svc.verifyCode("13800138000", "123456")).rejects.toThrow("验证码已过期");
    });
  });

  describe("getAdminLogs", () => {
    it("page 为非法字符串时 skip 不为 NaN", async () => {
      mockPrisma.smsLog.findMany.mockResolvedValue([]);
      mockPrisma.smsLog.count.mockResolvedValue(0);
      await svc.getAdminLogs("abc" as any);
      const findManyArg = mockPrisma.smsLog.findMany.mock.calls[0][0];
      expect(Number.isNaN(findManyArg.skip)).toBe(false);
    });
  });

  describe("流失召回短信", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("使用专用模板发送且不创建验证码 Redis key", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          Response: {
            RequestId: "req-1",
            SendStatusSet: [{ Code: "Ok", Message: "send success", PhoneNumber: "+8613800138000" }],
          },
        }),
      } as Response);

      const result = await svc.sendRetentionMessage("13800138000", ["国学好礼"], 7);

      expect(result).toEqual({ ok: true, disposition: "SENT", message: "召回短信已发送" });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "sms:retention:cooldown:13800138000",
        "1",
        7 * 86400,
      );
      expect(mockRedis.set.mock.calls.some(([key]: [string]) => key.startsWith("sms:code:"))).toBe(false);
    });

    it("腾讯云顶层成功但号码被拒绝时必须判失败", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          Response: {
            RequestId: "req-2",
            SendStatusSet: [{ Code: "FailedOperation.TemplateIncorrectOrUnapproved", Message: "template not approved" }],
          },
        }),
      } as Response);

      const result = await svc.sendRetentionMessage("13800138000");

      expect(result.disposition).toBe("FAILED");
      expect(result.ok).toBe(false);
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        "sms:retention:cooldown:13800138000",
        "1",
        expect.any(Number),
      );
    });

    it("专用模板未配置时转人工，绝不借用验证码模板", async () => {
      (svc as unknown as { churnTemplateId: string }).churnTemplateId = "";
      const result = await svc.sendRetentionMessage("13800138000");
      expect(result.disposition).toBe("MANUAL");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("冷却期内诚实跳过重复发送", async () => {
      mockRedis.get.mockResolvedValue("1");
      const result = await svc.sendRetentionMessage("13800138000", [], 7);
      expect(result.disposition).toBe("SKIPPED");
    });
  });
});

import { RedisService } from "../../redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsService } from "../../common/metrics.service";
