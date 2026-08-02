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
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";

jest.mock("bcryptjs");
import * as bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  auth: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  userRole: { findMany: jest.fn() },
  station: { findUnique: jest.fn() },
  referralRelation: { create: jest.fn() },
  merchant: { findUnique: jest.fn() },
  merchantMember: { findFirst: jest.fn() },
  $transaction: jest.fn(),
};

const mockJwt = { sign: jest.fn() };

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  getDel: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn(),
};

const mockWechat = {
  resolveLoginClient: jest.fn(),
  buildOAuthUrl: jest.fn(),
  exchangeOAuthCode: jest.fn(),
  exchangeMiniCode: jest.fn(),
  decryptPhoneNumber: jest.fn(),
  exchangePhoneNumber: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    delete process.env.WECHAT_APP_ID;
    delete process.env.WECHAT_APP_SECRET;
    delete process.env.WECHAT_OFFICIAL_APPID;
    delete process.env.WECHAT_OFFICIAL_APP_SECRET;
    delete process.env.WECHAT_MINI_APP_ID;
    delete process.env.MINIPROGRAM_APP_ID;
    delete process.env.WECHAT_MP_APP_ID;
    delete process.env.MINIPROGRAM_APP_SECRET;
    mockWechat.resolveLoginClient.mockImplementation((loginType: string, clientKey?: string) => {
      const isMini = loginType === "miniprogram";
      const appId = isMini
        ? process.env.WECHAT_MINI_APP_ID ||
          process.env.MINIPROGRAM_APP_ID ||
          process.env.WECHAT_MP_APP_ID ||
          process.env.WECHAT_APP_ID
        : process.env.WECHAT_OFFICIAL_APPID || process.env.WECHAT_APP_ID;
      const appSecret = isMini
        ? process.env.MINIPROGRAM_APP_SECRET || process.env.WECHAT_APP_SECRET
        : process.env.WECHAT_OFFICIAL_APP_SECRET || process.env.WECHAT_APP_SECRET;
      if (!appId || !appSecret)
        throw new BusinessException(ErrorCode.BAD_REQUEST, "微信登录未配置");
      return {
        clientKey: clientKey || (isMini ? "legacy-mini" : "legacy-h5"),
        type: loginType,
        appId,
        appSecret,
        identityNamespace: `wechat:${loginType}:${appId}`,
        unionNamespace: "wechat-open:default",
        isDefault: true,
      };
    });
  });

  describe("phoneRegister", () => {
    it("注册成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      mockPrisma.user.create.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
        phone: "13800138000",
      });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.phoneRegister({
        nickname: "张三",
        phone: "13800138000",
        password: "123456",
      });
      expect(result.accessToken).toBe("token");
      expect(result.user).toBeTruthy();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            auths: {
              create: expect.arrayContaining([
                expect.objectContaining({ provider: "PASSWORD", namespace: "password" }),
                expect.objectContaining({ provider: "PHONE", namespace: "phone" }),
              ]),
            },
          }),
        }),
      );
      const created = mockPrisma.user.create.mock.calls[0][0].data;
      expect(created.auths.create).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: "PASSWORD", subject: created.id }),
        ]),
      );
    });
    it("手机号已注册抛出 ConflictException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        svc.phoneRegister({ nickname: "张三", phone: "13800138000", password: "123456" }),
      ).rejects.toThrow(BusinessException);
    });
    it("带推荐码注册成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      mockPrisma.user.create.mockResolvedValue({
        id: "user-2",
        nickname: "李四",
        phone: "13900000000",
      });
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "station-1",
        userId: "referrer-1",
        code: "ABC123",
        status: "ACTIVE",
      });
      mockPrisma.referralRelation.create.mockResolvedValue({});
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.phoneRegister({
        nickname: "李四",
        phone: "13900000000",
        password: "123456",
        referrerCode: "ABC123",
      });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.referralRelation.create).toHaveBeenCalled();
    });
  });

  describe("phoneLogin", () => {
    it("登录成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
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
      await expect(svc.phoneLogin({ phone: "13800138000", password: "123456" })).rejects.toThrow(
        BusinessException,
      );
    });
    it("密码错误抛出 UnauthorizedException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        auths: [{ provider: "PASSWORD", credential: "hashed" }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(svc.phoneLogin({ phone: "13800138000", password: "wrong" })).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe("smsLogin", () => {
    it("已存在用户短信登录成功", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
        phone: "13800138000",
      });
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "user-1" });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800138000", code: "123456" });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.auth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            provider_namespace_subject: expect.objectContaining({
              provider: "PHONE",
              namespace: "phone",
            }),
          },
          update: { lastUsedAt: expect.any(Date) },
          select: { userId: true },
        }),
      );
    });
    it("新用户自动注册并登录", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user-2",
        nickname: "用户8000",
        phone: "13800008000",
      });
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "user-2" });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");
      const result = await svc.smsLogin({ phone: "13800008000", code: "123456" });
      expect(result.accessToken).toBe("token");
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
    it("手机号身份历史归属不一致时拒绝静默改绑", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
        phone: "13800138000",
      });
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "other-user" });

      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_IDENTITY_CONFLICT,
      });
    });
    it("验证码错误抛出 BadRequestException", async () => {
      mockSms.verifyCode.mockRejectedValue(
        new BusinessException("AUTH_SMS_CODE_INVALID" as any, "验证码错误"),
      );
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(
        BusinessException,
      );
    });
    it("验证码过期抛出 BadRequestException", async () => {
      mockSms.verifyCode.mockRejectedValue(
        new BusinessException("AUTH_SMS_CODE_EXPIRED" as any, "验证码已过期"),
      );
      await expect(svc.smsLogin({ phone: "13800138000", code: "123456" })).rejects.toThrow(
        BusinessException,
      );
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
    it("未配置任何微信应用时拒绝登录", async () => {
      await expect(svc.wechatLogin({ code: "code" })).rejects.toThrow(BusinessException);
      expect(mockWechat.exchangeOAuthCode).not.toHaveBeenCalled();
    });

    it("只配置公众号卡片时允许进入 H5 code 换取流程", async () => {
      process.env.WECHAT_OFFICIAL_APPID = "wx-official";
      process.env.WECHAT_OFFICIAL_APP_SECRET = "official-secret";
      mockWechat.exchangeOAuthCode.mockRejectedValueOnce(new Error("测试到此为止"));
      await expect(svc.wechatLogin({ code: "code", loginType: "h5" })).rejects.toThrow(
        BusinessException,
      );
      expect(mockWechat.exchangeOAuthCode).toHaveBeenCalledWith("code", "legacy-h5", "h5");
    });

    it("只配置小程序卡片时允许进入 code2session 流程", async () => {
      process.env.WECHAT_MINI_APP_ID = "wx-mini";
      process.env.MINIPROGRAM_APP_SECRET = "mini-secret";
      mockWechat.exchangeMiniCode.mockRejectedValueOnce(new Error("测试到此为止"));
      await expect(svc.wechatLogin({ code: "code", loginType: "miniprogram" })).rejects.toThrow(
        BusinessException,
      );
      expect(mockWechat.exchangeMiniCode).toHaveBeenCalledWith("code", "legacy-mini");
    });

    it("openId 与 unionId 分属不同账号时拒绝静默登录", async () => {
      process.env.WECHAT_OFFICIAL_APPID = "wx-official";
      process.env.WECHAT_OFFICIAL_APP_SECRET = "official-secret";
      mockWechat.exchangeOAuthCode.mockResolvedValue({ openId: "wx-open", unionId: "wx-union" });
      mockPrisma.auth.findUnique
        .mockResolvedValueOnce({ id: "auth-open", userId: "user-open" })
        .mockResolvedValueOnce({ id: "auth-union", userId: "user-union" });
      mockPrisma.auth.findFirst.mockResolvedValue(null);

      await expect(svc.wechatLogin({ code: "code", loginType: "h5" })).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_IDENTITY_CONFLICT,
      });
      expect(mockPrisma.auth.update).not.toHaveBeenCalled();
    });

    it("新小程序通过同一 UnionID 锚点登录原用户，不重复注册", async () => {
      process.env.WECHAT_MINI_APP_ID = "wx-mini-b";
      process.env.MINIPROGRAM_APP_SECRET = "mini-secret";
      mockWechat.exchangeMiniCode.mockResolvedValue({
        openId: "open-b",
        sessionKey: "s",
        unionId: "union-1",
      });
      mockPrisma.auth.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "union-anchor", userId: "user-1" });
      mockPrisma.auth.findFirst.mockResolvedValue(null);
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "user-1" });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "原用户",
        memberLevel: "YEARLY",
        memberExpire: null,
      });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");

      const result = await svc.wechatLogin({
        code: "code",
        loginType: "miniprogram",
        clientKey: "mini-b",
      });

      expect(result.user.id).toBe("user-1");
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.auth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            provider_namespace_subject: {
              provider: "WECHAT",
              namespace: "wechat:miniprogram:wx-mini-b",
              subject: "open-b",
            },
          },
        }),
      );
    });
  });

  describe("bindPhone", () => {
    it("在同一事务内更新手机号身份与用户资料，并撤销旧会话", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.auth.findUnique.mockResolvedValue(null);
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "phone-auth" });
      mockPrisma.auth.update.mockResolvedValue({ id: "phone-auth" });
      mockPrisma.user.update.mockResolvedValue({ id: "user-1" });
      mockRedis.smembers.mockResolvedValue([]);

      await expect(svc.bindPhone("user-1", "13800138000", "123456")).resolves.toEqual({
        success: true,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "phone-auth" },
          data: expect.objectContaining({
            openId: expect.any(String),
            credential: expect.any(String),
          }),
        }),
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user-1" } }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        "revoked:user:user-1",
        expect.any(String),
        2 * 3600 + 60,
      );
    });

    it("并发换绑触发数据库唯一约束时返回手机号已占用", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.auth.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      await expect(svc.bindPhone("user-1", "13800138000", "123456")).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_PHONE_EXISTS,
      });
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        "revoked:user:user-1",
        expect.any(String),
        expect.any(Number),
      );
    });
  });

  describe("微信身份绑定冲突", () => {
    it("手机号用户绑定已归属其他账号的 openId 时拒绝登录", async () => {
      process.env.WECHAT_MINI_APP_ID = "wx-mini-conflict";
      process.env.MINIPROGRAM_APP_SECRET = "mini-secret";
      mockWechat.exchangeMiniCode.mockResolvedValue({
        openId: "wx-used",
        sessionKey: "session",
        unionId: "union-used",
      });
      mockWechat.exchangePhoneNumber.mockResolvedValue({ purePhoneNumber: "13800138000" });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "phone-user",
        nickname: "手机号用户",
        phone: "13800138000",
      });
      mockPrisma.auth.findUnique
        .mockResolvedValueOnce({ userId: "wechat-user" })
        .mockResolvedValueOnce(null);
      mockPrisma.auth.findFirst.mockResolvedValue(null);

      await expect(
        svc.miniPhoneLogin({ wxCode: "wx-code", phoneCode: "phone-code" }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_IDENTITY_CONFLICT,
      });
      expect(mockPrisma.auth.create).not.toHaveBeenCalled();
    });

    it("个人中心绑定已归属其他账号的微信身份时拒绝换绑", async () => {
      process.env.WECHAT_OFFICIAL_APPID = "wx-official-conflict";
      process.env.WECHAT_OFFICIAL_APP_SECRET = "official-secret";
      mockWechat.exchangeOAuthCode.mockResolvedValue({ openId: "wx-used", unionId: "union-used" });
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "other-user" });

      await expect(svc.bindWechat("current-user", "code")).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_IDENTITY_CONFLICT,
      });
      expect(mockPrisma.auth.update).not.toHaveBeenCalled();
      expect(mockPrisma.auth.create).not.toHaveBeenCalled();
    });
  });

  describe("getProfile", () => {
    it("获取用户信息成功", async () => {
      const profile = {
        id: "user-1",
        nickname: "张三",
        avatar: null,
        phone: "13800138000",
        email: null,
        gender: null,
        birthday: null,
        memberLevel: "NORMAL",
        memberExpire: null,
        createdAt: new Date(),
        roles: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(profile);
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      const result = await svc.getProfile("user-1");
      expect(result).toEqual({
        ...profile,
        paymentPasswordSet: false,
        permissions: [],
        merchant: null,
      });
    });
  });

  describe("跨端无感登录握手码", () => {
    it("签发握手码：写入 Redis(60s) 并返回 code", async () => {
      const r = await svc.issueHandoffCode("user-1");
      expect(typeof r.code).toBe("string");
      expect(r.code.length).toBeGreaterThan(0);
      expect(mockRedis.set).toHaveBeenCalledWith(`handoff:${r.code}`, "user-1", 60);
    });

    it("换取会话：有效码返回新 token 且单次消费(del)", async () => {
      mockRedis.getDel.mockResolvedValueOnce("user-1");
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
      mockJwt.sign.mockReturnValue("access-token");
      const r = await svc.exchangeHandoffCode("good-code");
      expect(mockRedis.getDel).toHaveBeenCalledWith("handoff:good-code");
      expect(r.accessToken).toBe("access-token");
      expect(r.refreshToken).toBeDefined();
    });

    it("换取会话：无效/过期码抛错，不签发", async () => {
      mockRedis.getDel.mockResolvedValueOnce(null);
      await expect(svc.exchangeHandoffCode("bad-code")).rejects.toThrow();
    });

    it("换取会话：空码抛错", async () => {
      await expect(svc.exchangeHandoffCode("")).rejects.toThrow();
    });
  });

  describe("updateProfile", () => {
    it("更新资料成功", async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        nickname: "新昵称",
        avatar: null,
        gender: null,
        birthday: null,
      });
      const result = await svc.updateProfile("user-1", { nickname: "新昵称" });
      expect(result.nickname).toBe("新昵称");
    });
    it("带生日参数转换日期", async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
        avatar: null,
        gender: null,
        birthday: new Date("1990-01-01"),
      });
      const result = await svc.updateProfile("user-1", {
        nickname: "张三",
        birthday: "1990-01-01",
      });
      expect(result).toBeTruthy();
    });
  });

  describe("changePassword", () => {
    it("修改密码成功", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ id: "auth-1", credential: "old-hash" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hash");
      mockPrisma.auth.update.mockResolvedValue({ id: "auth-1", credential: "new-hash" });
      const result = await svc.changePassword("user-1", {
        oldPassword: "123456",
        newPassword: "654321",
      });
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
      await expect(
        svc.changePassword("user-1", { oldPassword: "wrong", newPassword: "654321" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("refreshToken", () => {
    it("有效 refreshToken 返回新 token 对", async () => {
      mockRedis.getDel.mockResolvedValue("user-1");
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "张三",
        avatar: null,
        phone: "13800138000",
        memberLevel: "NORMAL",
        memberExpire: null,
      });
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("new-access-token");

      const result = await svc.refreshToken("valid-refresh");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBeTruthy();
      expect(mockRedis.getDel).toHaveBeenCalledWith("refresh:valid-refresh");
      expect(mockRedis.srem).toHaveBeenCalledWith("refresh:user:user-1", "valid-refresh");
      expect(mockRedis.expire).not.toHaveBeenCalledWith("refresh:valid-refresh", 60);
    });

    it("无效 refreshToken 抛出异常", async () => {
      mockRedis.getDel.mockResolvedValue(null);
      await expect(svc.refreshToken("invalid")).rejects.toThrow(BusinessException);
    });

    it("同一 refreshToken 只能成功消费一次", async () => {
      mockRedis.getDel.mockResolvedValueOnce("user-1").mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "ACTIVE" });
      mockJwt.sign.mockReturnValue("new-access-token");

      await expect(svc.refreshToken("one-time-refresh")).resolves.toMatchObject({
        accessToken: "new-access-token",
      });
      await expect(svc.refreshToken("one-time-refresh")).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_TOKEN_INVALID,
      });
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
      expect(mockRedis.set).toHaveBeenCalledWith(
        "revoked:user:user-1",
        expect.any(String),
        2 * 3600 + 60,
      );
    });
  });

  describe("smsLogin with referral", () => {
    it("新用户短信登录自动注册并绑定推荐关系", async () => {
      mockSms.verifyCode.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null); // 用户不存在
      mockPrisma.user.create.mockResolvedValue({
        id: "user-3",
        nickname: "用户8000",
        phone: "13800008000",
      });
      mockPrisma.auth.upsert.mockResolvedValue({ userId: "user-3" });
      mockPrisma.station.findUnique.mockResolvedValue({
        id: "s1",
        userId: "ref-1",
        code: "INVITE",
        status: "ACTIVE",
      });
      mockPrisma.referralRelation.create.mockResolvedValue({});
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockJwt.sign.mockReturnValue("token");

      const result = await svc.smsLogin({
        phone: "13800008000",
        code: "123456",
        referrerCode: "INVITE",
      });

      expect(result.accessToken).toBe("token");
      expect(mockPrisma.referralRelation.create).toHaveBeenCalledWith({
        data: {
          userId: "user-3",
          referrerId: "ref-1",
          referrerType: "STATION_MASTER",
          sourceChannel: "INVITE_CODE",
        },
      });
    });
  });
});
