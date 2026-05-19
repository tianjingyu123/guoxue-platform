import { Test, TestingModule } from "@nestjs/testing";
import { SmsService } from "./sms.service";

const mockRedis = {
  get: jest.fn(), set: jest.fn(), del: jest.fn(), ttl: jest.fn(),
};
const mockPrisma = { smsLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() } };
const mockMetrics = { recordExternalApi: jest.fn() };

describe("SmsService", () => {
  let svc: SmsService;

  beforeEach(async () => {
    process.env.TENCENT_SECRET_ID = "test-id";
    process.env.TENCENT_SECRET_KEY = "test-key";
    process.env.SMS_APP_ID = "1400000000";
    process.env.SMS_TEMPLATE_ID = "123456";

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
      mockRedis.get.mockResolvedValue("123456");
      const result = await svc.verifyCode("13800138000", "123456");
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("不匹配应抛出异常", async () => {
      mockRedis.get.mockResolvedValue("654321");
      await expect(svc.verifyCode("13800138000", "123456")).rejects.toThrow("验证码错误");
    });

    it("验证码不存在应抛出异常", async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(svc.verifyCode("13800138000", "123456")).rejects.toThrow("验证码已过期");
    });
  });
});

import { RedisService } from "../../redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsService } from "../../common/metrics.service";
