import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { VersionController } from "./version.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockPrisma = {
  appVersion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("VersionController", () => {
  let ctrl: VersionController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [VersionController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(VersionController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("公开接口", () => {
    it("检查更新——无版本记录", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue(null);
      const result: any = await ctrl.check("ios", "1.0.0");
      expect(result.hasUpdate).toBe(false);
    });

    it("检查更新——有更新", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        version: "1.2.0", buildNumber: 10, changelog: "bug修复",
        forceUpdate: false, downloadUrl: "https://example.com/app",
      });
      const result: any = await ctrl.check("android", "1.0.0");
      expect(result.hasUpdate).toBe(true);
      expect(result.latest.version).toBe("1.2.0");
    });

    it("检查更新——已是最新", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({ version: "1.0.0" });
      const result: any = await ctrl.check("ios", "1.0.0");
      expect(result.hasUpdate).toBe(false);
      expect(result.latest).toBeNull();
    });
  });

  describe("管理接口", () => {
    it("发布新版本", async () => {
      mockPrisma.appVersion.create.mockResolvedValue({
        id: "v1", platform: "ios", version: "1.1.0", buildNumber: 5,
      });
      const result: any = await ctrl.adminCreate({ platform: "ios", version: "1.1.0", buildNumber: 5 } as any);
      expect(result.version).toBe("1.1.0");
    });

    it("更新版本信息", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({ id: "v1", platform: "ios", version: "1.0.0" });
      mockPrisma.appVersion.update.mockResolvedValue({ id: "v1", forceUpdate: true });
      const result: any = await ctrl.adminUpdate("v1", { forceUpdate: true } as any);
      expect(result.forceUpdate).toBe(true);
    });

    it("删除版本", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({ id: "v1", platform: "ios", version: "1.0.0" });
      mockPrisma.appVersion.delete.mockResolvedValue({ id: "v1" });
      await ctrl.adminDelete("v1");
      expect(mockPrisma.appVersion.delete).toHaveBeenCalledWith({ where: { id: "v1" } });
    });

    it("版本列表", async () => {
      mockPrisma.appVersion.findMany.mockResolvedValue([{ id: "v1", version: "1.0.0" }]);
      const result: any = await ctrl.adminList();
      expect(result).toHaveLength(1);
    });

    it("版本列表——按平台过滤", async () => {
      mockPrisma.appVersion.findMany.mockResolvedValue([]);
      await ctrl.adminList("android");
      expect(mockPrisma.appVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { platform: "android" } }),
      );
    });
  });
});
