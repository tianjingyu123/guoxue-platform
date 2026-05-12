import { Test } from "@nestjs/testing";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockEmailSvc = {
  send: jest.fn().mockResolvedValue({ messageId: "msg1" }),
  sendVerifyCode: jest.fn().mockResolvedValue({ success: true }),
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
};

describe("EmailController", () => {
  let ctrl: EmailController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [{ provide: EmailService, useValue: mockEmailSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(EmailController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /email/send — 发送邮件", async () => {
    const dto: any = { to: "user@test.com", subject: "测试", html: "<p>Hello</p>" };
    const result: any = await ctrl.send(dto);
    expect(result.messageId).toBe("msg1");
    expect(mockEmailSvc.send).toHaveBeenCalledWith(dto);
  });

  it("POST /email/send-code — 发送验证码", async () => {
    const dto = { email: "user@test.com" };
    const result: any = await ctrl.sendVerifyCode(dto);
    expect(result.success).toBe(true);
    expect(mockEmailSvc.sendVerifyCode).toHaveBeenCalled();
  });

  it("POST /email/test — 测试邮件配置", async () => {
    const dto = { to: "admin@test.com" };
    const result: any = await ctrl.testEmail(dto);
    expect(result.success).toBe(true);
    expect(mockEmailSvc.sendNotification).toHaveBeenCalledWith(
      "admin@test.com",
      "邮件服务测试",
      "如果您收到此邮件，说明邮件服务配置正确。",
    );
  });
});
