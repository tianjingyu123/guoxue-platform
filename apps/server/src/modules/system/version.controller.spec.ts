import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { VersionController } from "./version.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockPrisma: any = {
  appVersion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
  });

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("公开接口", () => {
    it("检查更新——无版本记录", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue(null);
      const result: any = await ctrl.check({ platform: "ios", version: "1.0.0" });
      expect(result.hasUpdate).toBe(false);
      expect(result.latest).toBeNull();
    });

    it("检查更新——有更新", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        version: "1.2.0", buildNumber: 10, changelog: "bug修复",
        forceUpdate: false, status: "ACTIVE", downloadUrl: "https://example.com/app",
      });
      const result: any = await ctrl.check({ platform: "android", version: "1.0.0" });
      expect(result.hasUpdate).toBe(true);
      expect(result.latest.version).toBe("1.2.0");
    });

    it("检查更新——已是最新", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({ version: "1.0.0" });
      const result: any = await ctrl.check({ platform: "ios", version: "1.0.0" });
      expect(result.hasUpdate).toBe(false);
      expect(result.latest).toBeNull();
    });

    it("检查更新——客户端版本更高时不推送降级", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({ version: "1.9.9", buildNumber: "199" });
      const result: any = await ctrl.check({
        platform: "android",
        version: "2.0.0",
        buildNumber: "200",
      });
      expect(result.hasUpdate).toBe(false);
    });

    it("检查更新——同展示版本按构建号识别热修", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        version: "2.0.0",
        buildNumber: "201",
        minSupportedVersion: "2.0.0",
        minSupportedBuildNumber: "201",
        downloadUrl: "https://example.com/app",
      });
      const result: any = await ctrl.check({
        platform: "android",
        version: "2.0.0",
        buildNumber: "200",
      });
      expect(result.hasUpdate).toBe(true);
      expect(result.latest.buildNumber).toBe("201");
    });

    it("检查更新——后续可选版本不会解除既有强制更新最低线", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        version: "2.1.0", buildNumber: "210", changelog: "体验优化",
        forceUpdate: false, downloadUrl: "https://example.com/app-210",
        minSupportedVersion: "2.0.0", minSupportedBuildNumber: "200",
      });

      const result: any = await ctrl.check({
        platform: "android",
        version: "1.9.0",
        buildNumber: "190",
      });

      expect(result.latest).toMatchObject({
        version: "2.1.0",
        forceUpdate: true,
        policy: "required",
      });
    });

    it("检查更新——达到强制线后继续收到最新可选版本", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        version: "2.1.0", buildNumber: "210", changelog: "体验优化",
        forceUpdate: false, downloadUrl: "https://example.com/app-210",
        minSupportedVersion: "2.0.0", minSupportedBuildNumber: "200",
      });

      const result: any = await ctrl.check({
        platform: "android",
        version: "2.0.0",
        buildNumber: "200",
      });

      expect(result.latest).toMatchObject({
        version: "2.1.0",
        forceUpdate: false,
        policy: "recommended",
      });
    });
  });

  describe("管理接口", () => {
    const req = { user: { id: "admin-1" } } as any;

    it("创建新版本只生成草稿", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue(null);
      mockPrisma.appVersion.create.mockResolvedValue({
        id: "v1", platform: "ios", version: "1.1.0", buildNumber: "5", status: "DRAFT",
      });
      const result: any = await ctrl.adminCreate({ platform: "ios", version: "1.1.0", buildNumber: "5" } as any);
      expect(result.status).toBe("DRAFT");
      expect(mockPrisma.appVersion.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", publishedAt: null }),
      }));
    });

    it("鸿蒙应用市场地址可以保存为草稿", async () => {
      mockPrisma.appVersion.findFirst.mockResolvedValue(null);
      mockPrisma.appVersion.create.mockResolvedValue({
        id: "v-harmony", platform: "harmony", version: "1.1.0", buildNumber: "5",
        forceUpdate: true, downloadUrl: "appmarket://details?id=com.rebu.iosapprebu",
      });
      const result: any = await ctrl.adminCreate({
        platform: "harmony", version: "1.1.0", buildNumber: "5",
        forceUpdate: true, downloadUrl: "appmarket://details?id=com.rebu.iosapprebu",
      } as any);
      expect(result.platform).toBe("harmony");
    });

    it("发布草稿时原子退役旧版本并继承最低支持线", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({
        id: "draft-1", status: "DRAFT", platform: "android", version: "2.1.0",
        buildNumber: "210", changelog: "体验优化", downloadUrl: "https://download.example.com/app.apk",
        forceUpdate: false,
      });
      mockPrisma.appVersion.findFirst
        .mockResolvedValueOnce({
          id: "active-1", status: "ACTIVE", platform: "android", version: "2.0.0",
          buildNumber: "200", minSupportedVersion: "1.9.0", minSupportedBuildNumber: "190",
        })
        .mockResolvedValueOnce(null);
      mockPrisma.appVersion.update.mockResolvedValue({ id: "draft-1", status: "ACTIVE" });

      await ctrl.publish("draft-1", req);

      expect(mockPrisma.appVersion.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "active-1" },
        data: expect.objectContaining({
          status: "RETIRED", activePlatformKey: null, retiredBy: "admin-1",
        }),
      }));
      expect(mockPrisma.appVersion.update).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: "draft-1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          activePlatformKey: "android",
          minSupportedVersion: "1.9.0",
          minSupportedBuildNumber: "190",
        }),
      }));
    });

    it("发布版本——拒绝覆盖为更低构建", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({
        id: "draft-low", status: "DRAFT", platform: "ios", version: "1.0.9",
        buildNumber: "109", changelog: "旧包", downloadUrl: "https://apps.apple.com/app/id1",
        forceUpdate: false,
      });
      mockPrisma.appVersion.findFirst.mockResolvedValue({
        id: "active-1", status: "ACTIVE", version: "1.1.0", buildNumber: "110",
      });
      await expect(
        ctrl.publish("draft-low", req),
      ).rejects.toThrow("新版本必须高于当前已发布版本");
      expect(mockPrisma.appVersion.update).not.toHaveBeenCalled();
    });

    it("发布版本——最终下载地址缺失时拒绝", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({
        id: "draft-no-url", status: "DRAFT", platform: "android", version: "1.1.0",
        buildNumber: "110", changelog: "安全修复", forceUpdate: true, downloadUrl: null,
      });
      await expect(
        ctrl.publish("draft-no-url", req),
      ).rejects.toThrow("发布地址必须是安全 HTTPS 链接");
      expect(mockPrisma.appVersion.update).not.toHaveBeenCalled();
    });

    it("只允许更新草稿", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({
        id: "v1",
        platform: "ios",
        version: "1.0.0",
        forceUpdate: false,
        status: "DRAFT",
      });
      mockPrisma.appVersion.update.mockResolvedValue({ id: "v1", forceUpdate: true });
      const result: any = await ctrl.adminUpdate("v1", {
        forceUpdate: true,
        downloadUrl: "https://example.com/app",
      } as any);
      expect(result.forceUpdate).toBe(true);
    });

    it("删除草稿", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({ id: "v1", status: "DRAFT", platform: "ios", version: "1.0.0" });
      mockPrisma.appVersion.delete.mockResolvedValue({ id: "v1" });
      await ctrl.adminDelete("v1");
      expect(mockPrisma.appVersion.delete).toHaveBeenCalledWith({ where: { id: "v1" } });
    });

    it("已发布记录作为审计证据不可删除", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({ id: "v1", status: "ACTIVE" });
      await expect(ctrl.adminDelete("v1")).rejects.toThrow("已发布记录属于审计证据");
      expect(mockPrisma.appVersion.delete).not.toHaveBeenCalled();
    });

    it("回退只重新激活已退役记录", async () => {
      mockPrisma.appVersion.findUnique.mockResolvedValue({
        id: "old-1", status: "RETIRED", platform: "harmony", version: "1.5.0",
        buildNumber: "150", changelog: "稳定版本", downloadUrl: "appmarket://details?id=com.rebu.app",
        forceUpdate: false, minSupportedVersion: "1.0.0", minSupportedBuildNumber: "100",
      });
      mockPrisma.appVersion.findFirst
        .mockResolvedValueOnce({ id: "active-1", status: "ACTIVE", platform: "harmony", version: "1.6.0", buildNumber: "160" })
        .mockResolvedValueOnce(null);
      mockPrisma.appVersion.update.mockResolvedValue({ id: "old-1", status: "ACTIVE" });

      await ctrl.rollback("old-1", req);

      expect(mockPrisma.appVersion.update).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: "old-1" },
        data: expect.objectContaining({ status: "ACTIVE", minSupportedVersion: "1.0.0" }),
      }));
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
