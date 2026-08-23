import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";
import { SystemService } from "../system/system.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockAuthSvc = {
  phoneRegister: jest.fn().mockResolvedValue({ accessToken: "t1", refreshToken: "rt1", user: { id: "u1", nickname: "张三", phone: "138****1234" } }),
  phoneLogin: jest.fn().mockResolvedValue({ accessToken: "t1", refreshToken: "rt1", user: { id: "u1", nickname: "张三" } }),
  smsLogin: jest.fn().mockResolvedValue({ accessToken: "t1", refreshToken: "rt1", user: { id: "u1", nickname: "张三" } }),
  sendSmsCode: jest.fn().mockResolvedValue({ success: true, message: "验证码已发送" } as any),
  wechatLogin: jest.fn().mockResolvedValue({ accessToken: "t1", refreshToken: "rt1", user: { id: "u1" } }),
  miniPhoneLogin: jest.fn().mockResolvedValue({ accessToken: "t1", refreshToken: "rt1", user: { id: "u1" } }),
  getProfile: jest.fn().mockResolvedValue({ id: "u1", nickname: "张三", phone: "138****1234" }),
  refreshToken: jest.fn().mockResolvedValue({ accessToken: "t2", refreshToken: "rt2" }),
  updateProfile: jest.fn().mockResolvedValue({ id: "u1", nickname: "新昵称" }),
  changePassword: jest.fn().mockResolvedValue({ success: true }),
};

const mockWechatSvc = {
  buildOAuthUrl: jest.fn().mockReturnValue("https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx..."),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockReturnValue({ catch: jest.fn() }),
};

describe("AuthController", () => {
  let ctrl: AuthController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: WechatService, useValue: mockWechatSvc },
        { provide: SystemService, useValue: mockSystemSvc },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(AuthController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = (overrides?: Record<string, unknown>) =>
    ({ ip: "127.0.0.1", user: { id: "u1" }, ...overrides } as any);

  describe("注册", () => {
    it("POST /auth/register/phone — 手机号注册", async () => {
      const dto: any = { phone: "13800000001", code: "123456", password: "Abc@1234", nickname: "张三" };
      const result = await ctrl.phoneRegister(dto, mockReq());
      expect(result.user.nickname).toBe("张三");
      expect(mockAuthSvc.phoneRegister).toHaveBeenCalledWith(dto);
    });
  });

  describe("登录", () => {
    it("POST /auth/login/phone — 手机号登录成功", async () => {
      const dto: any = { phone: "13800000001", password: "Abc@1234" };
      const result = await ctrl.phoneLogin(dto, mockReq());
      expect(result.accessToken).toBe("t1");
    });

    it("POST /auth/login/phone — 登录失败时记录审计日志后重新抛出", async () => {
      const err = new BadRequestException("密码错误");
      mockAuthSvc.phoneLogin.mockRejectedValueOnce(err);
      await expect(ctrl.phoneLogin({ phone: "13800000001", password: "wrong" } as any, mockReq())).rejects.toThrow("密码错误");
      expect(mockSystemSvc.logAudit).toHaveBeenCalled();
    });

    it("POST /auth/login/sms — 短信验证码登录成功", async () => {
      const dto: any = { phone: "13800000001", code: "123456" };
      const result = await ctrl.smsLogin(dto, mockReq());
      expect(result.accessToken).toBe("t1");
    });

    it("POST /auth/login/sms — 登录失败时记录审计日志后重新抛出", async () => {
      const err = new BadRequestException("验证码错误");
      mockAuthSvc.smsLogin.mockRejectedValueOnce(err);
      await expect(ctrl.smsLogin({ phone: "13800000001", code: "wrong" } as any, mockReq())).rejects.toThrow("验证码错误");
      expect(mockSystemSvc.logAudit).toHaveBeenCalled();
    });
  });

  describe("短信验证码", () => {
    it("POST /auth/sms/send — 发送验证码", async () => {
      const result: any = await ctrl.sendCode({ phone: "13800000001", scene: "LOGIN" } as any);
      expect(result.success).toBe(true);
    });
  });

  describe("微信", () => {
    it("GET /auth/wechat/oauth-url — 获取微信OAuth授权URL", async () => {
      const result = await ctrl.getWechatOAuthUrl("https://example.com/callback", "snsapi_userinfo", undefined, "state-1234567890");
      expect(result.url).toContain("open.weixin.qq.com");
      expect(mockWechatSvc.buildOAuthUrl).toHaveBeenCalledWith(
        "https://example.com/callback",
        "snsapi_userinfo",
        undefined,
        "state-1234567890",
      );
    });

    it("GET /auth/wechat/oauth-url — 缺少 redirectUri 抛异常", () => {
      expect(() => ctrl.getWechatOAuthUrl("" as any)).toThrow("redirectUri 参数必填");
    });

    it("POST /auth/login/wechat — 微信登录", async () => {
      const dto: any = { code: "wx_code_123" };
      const result = await ctrl.wechatLogin(dto);
      expect(result.accessToken).toBe("t1");
    });

    it("POST /auth/login/mini-phone — 小程序手机号快速登录", async () => {
      const dto: any = { code: "wx_code", encryptedData: "...", iv: "..." };
      const result = await ctrl.miniPhoneLogin(dto);
      expect(result.accessToken).toBe("t1");
    });
  });

  describe("用户信息", () => {
    it("GET /auth/me — 获取当前用户信息", async () => {
      const result: any = await ctrl.getProfile(mockReq());
      expect(result.nickname).toBe("张三");
      expect(mockAuthSvc.getProfile).toHaveBeenCalledWith("u1");
    });

    it("PUT /auth/profile — 更新用户信息", async () => {
      const result = await ctrl.updateProfile(mockReq(), { nickname: "新昵称" } as any);
      expect(result.nickname).toBe("新昵称");
    });

    it("PUT /auth/password — 修改密码", async () => {
      const result = await ctrl.changePassword(mockReq(), { oldPassword: "old", newPassword: "new" } as any);
      expect(result.success).toBe(true);
    });
  });

  describe("Token", () => {
    it("POST /auth/refresh — 刷新Token成功", async () => {
      const result = await ctrl.refresh("rt_old");
      expect(result.accessToken).toBe("t2");
    });

    it("POST /auth/refresh — 缺少 refreshToken 抛异常", async () => {
      await expect(ctrl.refresh("")).rejects.toThrow("refreshToken 参数必填");
    });
  });
});
