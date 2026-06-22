import { Test, TestingModule } from "@nestjs/testing";
import { PaymentPasswordService } from "./payment-password.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
};

describe("PaymentPasswordService", () => {
  let svc: PaymentPasswordService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentPasswordService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
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
    it("成功重置密码（smsCode 已由 controller 预先校验）", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.resetPassword("u1", "654321", "123456");
      expect(result).toEqual({ ok: true });
    });

    it("空短信验证码应抛出异常", async () => {
      await expect(svc.resetPassword("u1", "654321", "")).rejects.toThrow("短信验证码未校验");
    });
  });
});
