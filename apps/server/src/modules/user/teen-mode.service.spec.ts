import { Test, TestingModule } from "@nestjs/testing";
import { TeenModeService } from "./teen-mode.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
};

describe("TeenModeService", () => {
  let svc: TeenModeService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [TeenModeService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(TeenModeService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getSettings", () => {
    it("获取开启状态+设置", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        teenModeEnabled: true,
        teenModeSettings: { dailyLimitMinutes: 30, blockStartHour: 23 },
      });
      const result = await svc.getSettings("u1");
      expect(result.enabled).toBe(true);
      expect(result.settings.dailyLimitMinutes).toBe(30);
      expect(result.settings.contentFilter).toBe("strict");
    });

    it("未设置时返回默认值", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ teenModeEnabled: false, teenModeSettings: null });
      const result = await svc.getSettings("u1");
      expect(result.enabled).toBe(false);
      expect(result.settings.dailyLimitMinutes).toBe(40);
      expect(result.settings.blockStartHour).toBe(22);
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getSettings("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("updateSettings", () => {
    it("更新所有设置", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.updateSettings("u1", {
        enabled: true,
        dailyLimitMinutes: 60,
        blockStartHour: 21,
        blockEndHour: 7,
        contentFilter: "moderate",
      });
      expect(result.enabled).toBe(true);
      expect(result.settings.dailyLimitMinutes).toBe(60);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: expect.objectContaining({ teenModeEnabled: true }),
      });
    });

    it("部分更新使用默认值填充", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.updateSettings("u1", { enabled: false });
      expect(result.settings.dailyLimitMinutes).toBe(40);
      expect(result.settings.contentFilter).toBe("strict");
    });
  });
});
