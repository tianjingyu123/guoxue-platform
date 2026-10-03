import { Prisma } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../common/business.exception";
import { PrismaService } from "../../prisma/prisma.service";
import { TeenModeService } from "./teen-mode.service";

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
    it("历史空壳状态不再对外宣称已开启，也不读取或返回明文监护密码", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });

      const result = await svc.getSettings("u1");

      expect(result).toEqual(expect.objectContaining({ available: false, enabled: false, settings: null }));
      expect(JSON.stringify(result)).not.toContain("guardianPassword");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { id: true },
      });
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getSettings("u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("updateSettings", () => {
    it("完整保护闭环上线前拒绝开启且不写用户状态", async () => {
      await expect(svc.updateSettings("u1", { enabled: true })).rejects.toThrow("当前暂不可开启");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("允许关闭旧状态并清除可能含明文密码的遗留 JSON", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await svc.updateSettings("u1", { enabled: false });

      expect(result).toEqual(expect.objectContaining({ available: false, enabled: false, settings: null }));
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: {
          teenModeEnabled: false,
          teenModeSettings: Prisma.DbNull,
        },
      });
    });
  });
});
