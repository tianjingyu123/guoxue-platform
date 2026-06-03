import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { PaymentPasswordController } from "./payment-password.controller";
import { PaymentPasswordService } from "./payment-password.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSvc = {
  setPassword: jest.fn(),
  updatePassword: jest.fn(),
  verifyPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("PaymentPasswordController", () => {
  let ctrl: PaymentPasswordController;
  const mockReq = { user: { id: "u1" }, ip: "127.0.0.1" } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PaymentPasswordController],
      providers: [{ provide: PaymentPasswordService, useValue: mockSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(StrictRedisThrottleGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(PaymentPasswordController);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("POST payment-password", () => {
    it("设置支付密码成功", async () => {
      mockSvc.setPassword.mockResolvedValue({ ok: true });
      const dto = { password: "123456", smsCode: "8888" };
      const result = await ctrl.setPassword(mockReq, dto);
      expect(result).toEqual({ ok: true });
      expect(mockSvc.setPassword).toHaveBeenCalledWith("u1", "123456", "8888");
    });
  });

  describe("POST payment-password/update", () => {
    it("修改支付密码成功", async () => {
      mockSvc.updatePassword.mockResolvedValue({ ok: true });
      const dto = { oldPassword: "123456", newPassword: "654321" };
      const result = await ctrl.updatePassword(mockReq, dto);
      expect(result).toEqual({ ok: true });
      expect(mockSvc.updatePassword).toHaveBeenCalledWith("u1", "123456", "654321");
    });
  });

  describe("POST payment-password/verify", () => {
    it("验证支付密码成功", async () => {
      mockSvc.verifyPassword.mockResolvedValue({ ok: true });
      const dto = { password: "123456" };
      const result = await ctrl.verifyPassword(mockReq, dto);
      expect(result).toEqual({ ok: true });
      expect(mockSvc.verifyPassword).toHaveBeenCalledWith("u1", "123456");
    });
  });

  describe("POST payment-password/reset", () => {
    it("重置支付密码成功", async () => {
      mockSvc.resetPassword.mockResolvedValue({ ok: true });
      const dto = { newPassword: "654321", smsCode: "8888" };
      const result = await ctrl.resetPassword(mockReq, dto);
      expect(result).toEqual({ ok: true });
      expect(mockSvc.resetPassword).toHaveBeenCalledWith("u1", "654321", "8888");
    });
  });
});
