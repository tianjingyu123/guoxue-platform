import { Test } from "@nestjs/testing";
import { SmsController } from "./sms.controller";
import { SmsService } from "./sms.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSmsSvc = {
  sendVerifyCode: jest.fn().mockResolvedValue({ success: true }),
  verifyCode: jest.fn().mockResolvedValue({ valid: true }),
  getSendStatus: jest.fn().mockResolvedValue({ canSend: false, remaining: 45 }),
};

describe("SmsController", () => {
  let ctrl: SmsController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SmsController],
      providers: [{ provide: SmsService, useValue: mockSmsSvc }],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(SmsController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /sms/send — 发送验证码", async () => {
    const body = { phone: "13800138000", scene: "LOGIN" };
    const result: any = await ctrl.sendCode(body);
    expect(result.success).toBe(true);
    expect(mockSmsSvc.sendVerifyCode).toHaveBeenCalledWith("13800138000", "LOGIN");
  });

  it("POST /sms/send — 默认场景为 LOGIN", async () => {
    const body: any = { phone: "13800138000" };
    await ctrl.sendCode(body);
    expect(mockSmsSvc.sendVerifyCode).toHaveBeenCalledWith("13800138000", "LOGIN");
  });

  it("POST /sms/verify — 验证验证码", async () => {
    const body = { phone: "13800138000", code: "123456", scene: "LOGIN" };
    const result: any = await ctrl.verifyCode(body);
    expect(result.valid).toBe(true);
    expect(mockSmsSvc.verifyCode).toHaveBeenCalledWith("13800138000", "123456", "LOGIN");
  });

  it("GET /sms/status — 查询发送状态", async () => {
    const result: any = await ctrl.getStatus("13800138000");
    expect(result.remaining).toBe(45);
    expect(mockSmsSvc.getSendStatus).toHaveBeenCalledWith("13800138000");
  });
});
