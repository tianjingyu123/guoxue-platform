import { Test } from "@nestjs/testing";
import { AccountService } from "./account.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import { BusinessException } from "../../common/business.exception";

jest.mock("bcryptjs");
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  auth: { findFirst: jest.fn() },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockSms = {
  sendVerifyCode: jest.fn(),
  verifyCode: jest.fn(),
};

describe("AccountService", () => {
  let svc: AccountService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SmsService, useValue: mockSms },
      ],
    }).compile();
    svc = mod.get(AccountService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("requestDelete", () => {
    it("成功提交注销申请（7天冷静期）", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "a1", credential: "hashed" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.requestDelete("u1", { password: "123456" });

      expect(result.message).toContain("已提交");
      expect(result.coolDownDays).toBe(7);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: expect.objectContaining({
          deleteRequestedAt: expect.any(Date),
          deleteScheduledAt: expect.any(Date),
        }),
      });
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        svc.requestDelete("u1", { password: "123456" }),
      ).rejects.toThrow(BusinessException);
    });

    it("已提交注销申请抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        deleteRequestedAt: new Date(),
      });
      await expect(
        svc.requestDelete("u1", { password: "123456" }),
      ).rejects.toThrow(BusinessException);
    });

    it("密码错误抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "a1", credential: "hashed" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        svc.requestDelete("u1", { password: "wrong" }),
      ).rejects.toThrow(BusinessException);
    });

    it("无密码验证方式抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.auth.findFirst.mockResolvedValue(null);
      await expect(
        svc.requestDelete("u1", { password: "123456" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("getDeleteStatus", () => {
    it("返回已提交注销的状态", async () => {
      const requestedAt = new Date();
      mockPrisma.user.findUnique.mockResolvedValue({
        deleteRequestedAt: requestedAt,
        deleteScheduledAt: new Date(requestedAt.getTime() + 7 * 24 * 3600 * 1000),
        status: "ACTIVE",
      });
      const result = await svc.getDeleteStatus("u1");
      expect(result.hasRequested).toBe(true);
      expect(result.deleteRequestedAt).toBe(requestedAt);
    });

    it("返回未提交注销的状态", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        deleteRequestedAt: null,
        deleteScheduledAt: null,
        status: "ACTIVE",
      });
      const result = await svc.getDeleteStatus("u1");
      expect(result.hasRequested).toBe(false);
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getDeleteStatus("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("cancelDelete", () => {
    it("成功撤销注销申请", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        deleteRequestedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.cancelDelete("u1");
      expect(result.message).toContain("已撤销");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { deleteRequestedAt: null, deleteScheduledAt: null },
      });
    });

    it("没有进行中的注销申请抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        deleteRequestedAt: null,
      });
      await expect(svc.cancelDelete("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("changePhone", () => {
    it("成功更换手机号", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: "u1", phone: "13800138000" })
        .mockResolvedValueOnce(null); // 新号查重
      mockSms.verifyCode
        .mockResolvedValueOnce(true)  // 旧号验证码
        .mockResolvedValueOnce(true); // 新号验证码
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.changePhone("u1", {
        oldCode: "111111",
        newPhone: "13900139000",
        newCode: "222222",
      });

      expect(result.message).toContain("更换成功");
      expect(mockSms.verifyCode).toHaveBeenCalledWith("13800138000", "111111", "change-phone-old");
      expect(mockSms.verifyCode).toHaveBeenCalledWith("13900139000", "222222", "change-phone-new");
    });

    it("当前未绑定手机号抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", phone: null });
      await expect(
        svc.changePhone("u1", {
          oldCode: "111", newPhone: "139", newCode: "222",
        }),
      ).rejects.toThrow(BusinessException);
    });

    it("旧手机验证码错误抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", phone: "13800138000" });
      mockSms.verifyCode.mockResolvedValueOnce(false);
      await expect(
        svc.changePhone("u1", {
          oldCode: "wrong", newPhone: "139", newCode: "222",
        }),
      ).rejects.toThrow(BusinessException);
    });

    it("新手机号已被注册抛出异常", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: "u1", phone: "13800138000" })
        .mockResolvedValueOnce({ id: "u2", phone: "13900139000" });
      mockSms.verifyCode.mockResolvedValue(true);
      await expect(
        svc.changePhone("u1", {
          oldCode: "111", newPhone: "13900139000", newCode: "222",
        }),
      ).rejects.toThrow(BusinessException);
    });
  });
});
