import { CanActivate } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { TeenModeController } from "./teen-mode.controller";
import { TeenModeService } from "./teen-mode.service";

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

  it("获取未成年人模式可用状态", async () => {
    mockService.getSettings.mockResolvedValue({ available: false, enabled: false, settings: null });

    const result: any = await ctrl.getSettings({ user: { id: "u1" } } as any);

    expect(result.available).toBe(false);
    expect(result.enabled).toBe(false);
    expect(mockService.getSettings).toHaveBeenCalledWith("u1");
  });

  it("关闭旧状态时原样委托服务层", async () => {
    mockService.updateSettings.mockResolvedValue({ available: false, enabled: false, settings: null });

    const result: any = await ctrl.updateSettings(
      { user: { id: "u1" } } as any,
      { enabled: false },
    );

    expect(result.enabled).toBe(false);
    expect(mockService.updateSettings).toHaveBeenCalledWith("u1", { enabled: false });
  });
});
