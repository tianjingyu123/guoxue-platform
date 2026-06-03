import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockAccount = {
  requestDelete: jest.fn(),
  getDeleteStatus: jest.fn(),
  cancelDelete: jest.fn(),
  changePhone: jest.fn(),
};

const mockSystem = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("AccountController", () => {
  let ctrl: AccountController;
  const mockReq = {
    user: { id: "u1" },
    ip: "127.0.0.1",
  } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: AccountService, useValue: mockAccount },
        { provide: SystemService, useValue: mockSystem },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(StrictRedisThrottleGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(AccountController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("POST delete-account", () => {
    it("申请注销成功", async () => {
      mockAccount.requestDelete.mockResolvedValue({ message: "注销申请已提交", deleteScheduledAt: new Date(), coolDownDays: 7 });
      const dto = { password: "123456" };
      const result = await ctrl.requestDelete(mockReq, dto);
      expect(result.message).toContain("已提交");
      expect(mockAccount.requestDelete).toHaveBeenCalledWith("u1", dto);
    });
  });

  describe("GET delete-account/status", () => {
    it("查询注销状态", async () => {
      mockAccount.getDeleteStatus.mockResolvedValue({ hasRequested: false });
      const result = await ctrl.getDeleteStatus(mockReq);
      expect(result.hasRequested).toBe(false);
    });
  });

  describe("POST delete-account/cancel", () => {
    it("撤销注销申请", async () => {
      mockAccount.cancelDelete.mockResolvedValue({ message: "注销申请已撤销" });
      const result = await ctrl.cancelDelete(mockReq);
      expect(result.message).toContain("已撤销");
    });
  });

  describe("PUT phone", () => {
    it("更换手机号成功", async () => {
      mockAccount.changePhone.mockResolvedValue({ message: "手机号更换成功", phone: "13900139000" });
      const dto = { oldCode: "111", newPhone: "13900139000", newCode: "222" };
      const result = await ctrl.changePhone(mockReq, dto);
      expect(result.phone).toBe("13900139000");
      expect(mockAccount.changePhone).toHaveBeenCalledWith("u1", dto);
    });
  });
});
