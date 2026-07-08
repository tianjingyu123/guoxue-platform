import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";
import { ImService } from "../im/im.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "../../redis/redis.service";
import { WebhookService } from "../webhook/webhook.service";
import { SmsService } from "../sms/sms.service";
import { PermissionService } from "../system/permission.service";
import { BusinessException } from "../../common/business.exception";

jest.mock("bcryptjs");
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  auth: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  userRole: { findMany: jest.fn() },
  station: { findUnique: jest.fn() },
  referralRelation: { create: jest.fn() },
  merchant: { findUnique: jest.fn() },
};

const mockJwt = { sign: jest.fn() };

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn(),
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
const mockSms = { sendVerifyCode: jest.fn(), verifyCode: jest.fn() };
const mockPermSvc = { getUserPermissions: jest.fn().mockResolvedValue([]) };

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
        { provide: SmsService, useValue: mockSms },
        { provide: PermissionService, useValue: mockPermSvc },
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
      await expect(svc.phoneRegister({ nickname: "张三", phone: "13800138000", password: "123456" })).rejects.toThrow(BusinessException);
    });
    it("带推荐码注册成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      mockPrisma.user.create.mockResolvedValue({ id: "user-2", nickname: "李四", phone: "13900000000" });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "referrer-1", code: "ABC123", status: "ACTIVE" });
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
      await expect(svc.phoneLogin({ phone: "13800138000", password: "123456" })).rejects.toThrow(BusinessException);
    });
    it("密码错误抛出 UnauthorizedException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1", auths: [{ provider: "PASSWORD", credential: "hashed" }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(svc.phoneLogin({ phone: "13800138000", password: "wrong" })).rejects.toThrow(BusinessException);
    });
  });

  describe("smsLogin", () => {
    it("已存在用户短信登录成功", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", nickname: "张三", phone: "13800138000" });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800138000", code: "123456" });
      expect(result.accessToken).toBe("token");
    });
    it("新用户自动注册并登录", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: "user-2", nickname: "用户8000", phone: "13800008000" });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800008000", code: "123456" });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
    it("验证码错误抛出 BadRequestException", async () => {
      mockSms.verifyCode.mockRejectedValue(new BusinessException("AUTH_SMS_CODE_INVALID" as any, "验证码错误"));
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(BusinessException);
    });
    it("验证码过期抛出 BadRequestException", async () => {
      mockSms.verifyCode.mockRejectedValue(new BusinessException("AUTH_SMS_CODE_EXPIRED" as any, "验证码已过期"));
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(BusinessException);
    });
  });

  describe("sendSmsCode", () => {
    it("发送验证码成功", async () => {
      mockSms.sendVerifyCode.mockResolvedValue({ ok: true, message: "验证码已发送" });
      const result = await svc.sendSmsCode({ phone: "13800138000" });
      expect(result.ok).toBe(true);
      expect(mockSms.sendVerifyCode).toHaveBeenCalledWith("13800138000", "LOGIN");
    });
  });

  describe("wechatLogin", () => {
    it("微信登录暂未开放", async () => {
      await expect(svc.wechatLogin({ code: "code" })).rejects.toThrow(BusinessException);
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
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      const result = await svc.getProfile("user-1");
      expect(result).toEqual({ ...profile, paymentPasswordSet: false, permissions: [], merchant: null });
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
    it("未设置密码时首次创建凭证（验证码/微信登录用户首次设密码，无需旧密码）", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hash");
      mockPrisma.auth.create.mockResolvedValue({ id: "auth-new", credential: "new-hash" });
      const result = await svc.changePassword("user-1", { newPassword: "Abc12345" });
      expect(result.success).toBe(true);
      expect(mockPrisma.auth.create).toHaveBeenCalled();
    });
    it("原密码错误抛出 BadRequestException", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "auth-1", credential: "hash" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(svc.changePassword("user-1", { oldPassword: "wrong", newPassword: "654321" })).rejects.toThrow(BusinessException);
    });
  });

  describe("refreshToken", () => {
    it("有效 refreshToken 返回新 token 对", async () => {
      mockRedis.get.mockResolvedValue("user-1");
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", nickname: "张三", avatar: null, phone: "13800138000", memberLevel: "NORMAL", memberExpire: null });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("new-access-token");

      const result = await svc.refreshToken("valid-refresh");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBeTruthy();
      // 旧 token 进入 60 秒轮换宽限（吸收并发续期防误登出），而非立即删除
      expect(mockRedis.expire).toHaveBeenCalledWith("refresh:valid-refresh", 60);
    });

    it("无效 refreshToken 抛出异常", async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(svc.refreshToken("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("revokeAllRefreshTokens", () => {
    it("删除用户全部 refreshToken 并记录撤销时刻", async () => {
      mockRedis.smembers.mockResolvedValueOnce(["rt-1", "rt-2"]);
      await svc.revokeAllRefreshTokens("user-1");
      expect(mockRedis.smembers).toHaveBeenCalledWith("refresh:user:user-1");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh:rt-1");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh:rt-2");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh:user:user-1");
      // 撤销时刻写入（JwtStrategy 用 iat 比对拒绝旧 accessToken），TTL 覆盖 accessToken 生命期
      expect(mockRedis.set).toHaveBeenCalledWith("revoked:user:user-1", expect.any(String), 2 * 3600 + 60);
    });
  });

  describe("smsLogin with referral", () => {
    it("新用户短信登录自动注册并绑定推荐关系", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null); // 用户不存在
      mockPrisma.user.create.mockResolvedValue({ id: "user-3", nickname: "用户8000", phone: "13800008000" });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "s1", userId: "ref-1", code: "INVITE", status: "ACTIVE" });
      mockPrisma.referralRelation.create.mockResolvedValue({});
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");

      const result = await svc.smsLogin({ phone: "13800008000", code: "123456", referrerCode: "INVITE" });

      expect(result.accessToken).toBe("token");
      expect(mockPrisma.referralRelation.create).toHaveBeenCalledWith({
        data: { userId: "user-3", referrerId: "ref-1", referrerType: "STATION_MASTER", sourceChannel: "INVITE_CODE" },
      });
    });
  });
});
