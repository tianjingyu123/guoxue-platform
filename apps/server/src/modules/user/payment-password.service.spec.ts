import { Test, TestingModule } from "@nestjs/testing";
import { PaymentPasswordService } from "./payment-password.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
};

const mockSms = {
  verifyCode: jest.fn().mockResolvedValue(true),
};

describe("PaymentPasswordService", () => {
  let svc: PaymentPasswordService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentPasswordService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SmsService, useValue: mockSms },
      ],
    }).compile();
    svc = mod.get(PaymentPasswordService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("setPassword", () => {
    it("成功设置6位支付密码", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.setPassword("u1", "123456", "9999");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u1" }, data: { paymentPasswordHash: expect.any(String) } }),
      );
    });

    it("非6位数字应抛出异常", async () => {
      await expect(svc.setPassword("u1", "12345", "9999")).rejects.toThrow("支付密码需为6位数字");
    });

    it("已设置密码应抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ paymentPasswordHash: "hash" });
      await expect(svc.setPassword("u1", "123456", "9999")).rejects.toThrow("支付密码已设置");
    });
  });

  describe("verifyPassword", () => {
    it("密码匹配返回成功", async () => {
      const hash = await bcrypt.hash("123456", 10);
      mockPrisma.user.findUnique.mockResolvedValue({ paymentPasswordHash: hash });

      const result = await svc.verifyPassword("u1", "123456");
      expect(result).toEqual({ ok: true });
    });

    it("密码不匹配应抛出异常", async () => {
      const hash = await bcrypt.hash("654321", 10);
      mockPrisma.user.findUnique.mockResolvedValue({ paymentPasswordHash: hash });

      await expect(svc.verifyPassword("u1", "123456")).rejects.toThrow("支付密码错误");
    });

    it("未设置密码应抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.verifyPassword("u1", "123456")).rejects.toThrow("未设置支付密码");
    });
  });

  describe("updatePassword", () => {
    it("成功修改密码", async () => {
      const oldHash = await bcrypt.hash("123456", 10);
      mockPrisma.user.findUnique.mockResolvedValue({ paymentPasswordHash: oldHash });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.updatePassword("u1", "123456", "654321");
      expect(result).toEqual({ ok: true });
    });

    it("旧密码错误应抛出异常", async () => {
      const oldHash = await bcrypt.hash("111111", 10);
      mockPrisma.user.findUnique.mockResolvedValue({ paymentPasswordHash: oldHash });

      await expect(svc.updatePassword("u1", "123456", "654321")).rejects.toThrow("支付密码错误");
    });
  });

  describe("resetPassword", () => {
    it("短信验证码校验通过后成功重置", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ phone: "13800138000" });
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.resetPassword("u1", "654321", "123456");

      expect(result).toEqual({ ok: true });
      // 必须以 RESET_PAY_PWD 场景真校验短信码，而非仅判长度
      expect(mockSms.verifyCode).toHaveBeenCalledWith("13800138000", "123456", "RESET_PAY_PWD");
    });

    it("短信验证码错误时抛异常且不重置", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ phone: "13800138000" });
      mockSms.verifyCode.mockRejectedValue(new Error("验证码错误"));

      await expect(svc.resetPassword("u1", "654321", "000000")).rejects.toThrow("验证码错误");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("未绑定手机号无法短信重置", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ phone: null });
      await expect(svc.resetPassword("u1", "654321", "123456")).rejects.toThrow("未绑定手机号");
    });
  });
});
