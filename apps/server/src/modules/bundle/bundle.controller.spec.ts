import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { BundleController } from "./bundle.controller";
import { BundleService } from "./bundle.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockGuard: CanActivate = { canActivate: () => true };

describe("BundleController", () => {
  let ctrl: BundleController;
  let svc: jest.Mocked<BundleService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BundleController],
      providers: [
        {
          provide: BundleService,
          useValue: {
            create: jest.fn(), list: jest.fn(), getById: jest.fn(),
            update: jest.fn(), delete: jest.fn(),
            claimByStation: jest.fn(), claimByOperator: jest.fn(),
            getMyStationBundles: jest.fn(), getMyOperatorBundles: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            station: { findFirst: jest.fn() },
            operator: { findFirst: jest.fn() },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(BundleController);
    svc = mod.get(BundleService) as jest.Mocked<BundleService>;
    prisma = mod.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  beforeEach(() => jest.clearAllMocks());

  describe("CRUD", () => {
    it("创建组合包", async () => {
      svc.create.mockResolvedValue({ id: "b1" } as any);
      const result: any = await ctrl.create({ name: "新手包" } as any);
      expect(result.id).toBe("b1");
    });

    it("组合包列表", async () => {
      svc.list.mockResolvedValue({ items: [], total: 0 } as any);
      const result: any = await ctrl.list({} as any);
      expect(result.items).toHaveLength(0);
    });

    it("组合包详情", async () => {
      svc.getById.mockResolvedValue({ id: "b1", name: "新手包" } as any);
      const result: any = await ctrl.getById("b1");
      expect(result.name).toBe("新手包");
    });

    it("更新组合包", async () => {
      svc.update.mockResolvedValue({ id: "b1" } as any);
      const result: any = await ctrl.update("b1", { name: "新名称" } as any);
      expect(result.id).toBe("b1");
    });

    it("删除组合包", async () => {
      svc.delete.mockResolvedValue({ id: "b1" } as any);
      await ctrl.delete("b1");
      expect(svc.delete).toHaveBeenCalledWith("b1");
    });
  });

  describe("claim", () => {
    it("分站站长领取组合包", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue({ id: "st1" });
      svc.claimByStation.mockResolvedValue({ id: "claim1" } as any);
      const result: any = await ctrl.claim({ user: { id: "u1" } } as any, "b1");
      expect(svc.claimByStation).toHaveBeenCalledWith("st1", "b1");
      expect(result.id).toBe("claim1");
    });

    it("运营商领取组合包（站长不存在时）", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.operator.findFirst as jest.Mock).mockResolvedValue({ id: "op1" });
      svc.claimByOperator.mockResolvedValue({ id: "claim2" } as any);
      const result: any = await ctrl.claim({ user: { id: "u2" } } as any, "b1");
      expect(svc.claimByOperator).toHaveBeenCalledWith("op1", "b1");
      expect(result.id).toBe("claim2");
    });

    it("非站长非运营商领取时抛错", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.operator.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(ctrl.claim({ user: { id: "u3" } } as any, "b1")).rejects.toThrow();
    });
  });

  describe("getMyClaimed", () => {
    it("站长查看已领取的组合包", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue({ id: "st1" });
      svc.getMyStationBundles.mockResolvedValue([{ id: "b1" }] as any);
      const result: any = await ctrl.getMyClaimed({ user: { id: "u1" } } as any);
      expect(result).toHaveLength(1);
    });

    it("运营商查看已领取的组合包", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.operator.findFirst as jest.Mock).mockResolvedValue({ id: "op1" });
      svc.getMyOperatorBundles.mockResolvedValue([{ id: "b2" }] as any);
      const result: any = await ctrl.getMyClaimed({ user: { id: "u2" } } as any);
      expect(result).toHaveLength(1);
    });

    it("非站长非运营商返回空数组", async () => {
      (prisma.station.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.operator.findFirst as jest.Mock).mockResolvedValue(null);
      const result: any = await ctrl.getMyClaimed({ user: { id: "u3" } } as any);
      expect(result).toEqual([]);
    });
  });
});
