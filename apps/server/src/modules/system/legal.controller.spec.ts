import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { LegalController } from "./legal.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockPrisma = {
  legalDocument: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("LegalController", () => {
  let ctrl: LegalController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(LegalController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("公开接口", () => {
    it("获取最新版本协议", async () => {
      mockPrisma.legalDocument.findFirst.mockResolvedValue({
        id: "l1", type: "privacy", title: "隐私政策", version: "2.0",
      });
      const result: any = await ctrl.getLatest("privacy");
      expect(result.title).toBe("隐私政策");
      expect(result.version).toBe("2.0");
    });

    it("无协议时返回null", async () => {
      mockPrisma.legalDocument.findFirst.mockResolvedValue(null);
      const result: any = await ctrl.getLatest("terms");
      expect(result).toBeNull();
    });

    it("历史版本列表", async () => {
      mockPrisma.legalDocument.findMany.mockResolvedValue([
        { id: "l1", version: "2.0", title: "隐私政策", publishedAt: new Date(), status: "PUBLISHED" },
        { id: "l2", version: "1.0", title: "隐私政策", publishedAt: new Date(), status: "ARCHIVED" },
      ]);
      const result: any = await ctrl.getVersions("privacy");
      expect(result).toHaveLength(2);
    });
  });

  describe("管理接口", () => {
    it("创建法律文件", async () => {
      mockPrisma.legalDocument.create.mockResolvedValue({ id: "l1", type: "terms", title: "用户协议" });
      const result: any = await ctrl.adminCreate({ type: "terms", title: "用户协议", content: "..." } as any);
      expect(result.id).toBe("l1");
      expect(mockPrisma.legalDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "terms" }) }),
      );
    });

    it("更新法律文件", async () => {
      mockPrisma.legalDocument.update.mockResolvedValue({ id: "l1", status: "PUBLISHED" });
      const result: any = await ctrl.adminUpdate("l1", { status: "PUBLISHED" } as any);
      expect(result.status).toBe("PUBLISHED");
    });

    it("删除法律文件", async () => {
      mockPrisma.legalDocument.delete.mockResolvedValue({ id: "l1" });
      await ctrl.adminDelete("l1");
      expect(mockPrisma.legalDocument.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
    });
  });
});
