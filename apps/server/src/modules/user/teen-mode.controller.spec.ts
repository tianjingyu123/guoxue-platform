import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { TeenModeController } from "./teen-mode.controller";
import { TeenModeService } from "./teen-mode.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("TeenModeController", () => {
  let ctrl: TeenModeController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TeenModeController],
      providers: [{ provide: TeenModeService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(TeenModeController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("获取青少年模式设置", async () => {
    mockService.getSettings.mockResolvedValue({ enabled: true, bedtimeStart: "22:00", dailyLimitMinutes: 60 });
    const result: any = await ctrl.getSettings({ user: { id: "u1" } } as any);
    expect(result.enabled).toBe(true);
    expect(result.dailyLimitMinutes).toBe(60);
  });

  it("获取青少年模式设置——未开启", async () => {
    mockService.getSettings.mockResolvedValue({ enabled: false });
    const result: any = await ctrl.getSettings({ user: { id: "u2" } } as any);
    expect(result.enabled).toBe(false);
  });

  it("更新青少年模式设置", async () => {
    mockService.updateSettings.mockResolvedValue({ enabled: true, bedtimeStart: "21:00", dailyLimitMinutes: 45 });
    const result: any = await ctrl.updateSettings(
      { user: { id: "u1" } } as any,
      { enabled: true, bedtimeStart: "21:00", dailyLimitMinutes: 45 } as any,
    );
    expect(result.bedtimeStart).toBe("21:00");
    expect(mockService.updateSettings).toHaveBeenCalledWith("u1", expect.objectContaining({ bedtimeStart: "21:00" }));
  });
});
