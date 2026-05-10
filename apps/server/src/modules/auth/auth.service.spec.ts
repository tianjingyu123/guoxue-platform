import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";
import { ImService } from "../im/im.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "../../redis/redis.service";
import { WebhookService } from "../webhook/webhook.service";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";

jest.mock("bcryptjs");
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  auth: { findFirst: jest.fn(), update: jest.fn() },
  userRole: { findMany: jest.fn() },
  station: { findUnique: jest.fn() },
  referralRelation: { create: jest.fn() },
};

const mockJwt = { sign: jest.fn() };

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockWechat = {
  buildOAuthUrl: jest.fn(),
  exchangeOAuthCode: jest.fn(),
  exchangeMiniCode: jest.fn(),
  getUserInfo: jest.fn(),
};

const mockIm = {
  genUserSig: jest.fn(),
  importAccount: jest.fn().mockResolvedValue(undefined),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };

describe("AuthService", () => {
  let svc: AuthService;

  beforeAll(async () => {
    // 屏蔽 constructor 中的 importToIm 调用（会抛错因为 LOGGER 未初始化）
    jest.spyOn(AuthService.prototype as any, "importToIm").mockImplementation(() => {});

    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: RedisService, useValue: mockRedis },
        { provide: WechatService, useValue: mockWechat },
        { provide: ImService, useValue: mockIm },
        { provide: WebhookService, useValue: mockWebhook },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("phoneRegister", () => {
    it("注册成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      mockPrisma.user.create.mockResolvedValue({ id: "user-1", nickname: "张三", phone: "13800138000" });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.phoneRegister({ nickname: "张三", phone: "13800138000", password: "123456" });
      expect(result.accessToken).toBe("token");
      expect(result.user).toBeTruthy();
    });
    it("手机号已注册抛出 ConflictException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await expect(svc.phoneRegister({ nickname: "张三", phone: "13800138000", password: "123456" })).rejects.toThrow(ConflictException);
    });
    it("带推荐码注册成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      mockPrisma.user.create.mockResolvedValue({ id: "user-2", nickname: "李四", phone: "13900000000" });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "referrer-1", code: "ABC123" });
      mockPrisma.referralRelation.create.mockResolvedValue({});
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.phoneRegister({ nickname: "李四", phone: "13900000000", password: "123456", referrerCode: "ABC123" });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.referralRelation.create).toHaveBeenCalled();
    });
  });

  describe("phoneLogin", () => {
    it("登录成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1", nickname: "张三",
        auths: [{ provider: "PASSWORD", credential: "hashed" }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.phoneLogin({ phone: "13800138000", password: "123456" });
      expect(result.accessToken).toBe("token");
    });
    it("手机号不存在抛出 UnauthorizedException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.phoneLogin({ phone: "13800138000", password: "123456" })).rejects.toThrow(UnauthorizedException);
    });
    it("密码错误抛出 UnauthorizedException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1", auths: [{ provider: "PASSWORD", credential: "hashed" }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(svc.phoneLogin({ phone: "13800138000", password: "wrong" })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("smsLogin", () => {
    it("已存在用户短信登录成功", async () => {
      mockRedis.get.mockResolvedValue("123456");
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", nickname: "张三", phone: "13800138000" });
      mockRedis.del.mockResolvedValue(undefined);
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800138000", code: "123456" });
      expect(result.accessToken).toBe("token");
    });
    it("新用户自动注册并登录", async () => {
      mockRedis.get.mockResolvedValue("123456");
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: "user-2", nickname: "用户8000", phone: "13800008000" });
      mockRedis.del.mockResolvedValue(undefined);
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800008000", code: "123456" });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
    it("验证码错误抛出 BadRequestException", async () => {
      mockRedis.get.mockResolvedValue("654321");
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(BadRequestException);
    });
    it("验证码过期抛出 BadRequestException", async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("sendSmsCode", () => {
    it("发送验证码成功", async () => {
      mockRedis.set.mockResolvedValue(undefined);
      const result = await svc.sendSmsCode({ phone: "13800138000" });
      expect(result.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith("sms_code:13800138000", "123456", 300);
    });
  });

  describe("wechatLogin", () => {
    it("微信登录暂未开放", async () => {
      await expect(svc.wechatLogin({ code: "code" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("getProfile", () => {
    it("获取用户信息成功", async () => {
      const profile = {
        id: "user-1", nickname: "张三", avatar: null, phone: "13800138000",
        email: null, gender: null, birthday: null, memberLevel: "NORMAL",
        memberExpire: null, createdAt: new Date(), roles: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(profile);
      const result = await svc.getProfile("user-1");
      expect(result).toEqual(profile);
    });
  });

  describe("updateProfile", () => {
    it("更新资料成功", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: "user-1", nickname: "新昵称", avatar: null, gender: null, birthday: null });
      const result = await svc.updateProfile("user-1", { nickname: "新昵称" });
      expect(result.nickname).toBe("新昵称");
    });
    it("带生日参数转换日期", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: "user-1", nickname: "张三", avatar: null, gender: null, birthday: new Date("1990-01-01") });
      const result = await svc.updateProfile("user-1", { nickname: "张三", birthday: "1990-01-01" });
      expect(result).toBeTruthy();
    });
  });

  describe("changePassword", () => {
    it("修改密码成功", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "auth-1", credential: "old-hash" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hash");
      mockPrisma.auth.update.mockResolvedValue({ id: "auth-1", credential: "new-hash" });
      const result = await svc.changePassword("user-1", { oldPassword: "123456", newPassword: "654321" });
      expect(result.success).toBe(true);
    });
    it("未设置密码抛出 BadRequestException", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue(null);
      await expect(svc.changePassword("user-1", { oldPassword: "123456", newPassword: "654321" })).rejects.toThrow(BadRequestException);
    });
    it("原密码错误抛出 BadRequestException", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "auth-1", credential: "hash" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(svc.changePassword("user-1", { oldPassword: "wrong", newPassword: "654321" })).rejects.toThrow(BadRequestException);
    });
  });
});
