import { Test, TestingModule } from "@nestjs/testing";
import { BigScreenAuthService } from "./bigscreen-auth.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  bigScreenToken: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
};

describe("BigScreenAuthService", () => {
  let svc: BigScreenAuthService;

  beforeEach(async () => {
    process.env.BIGSCREEN_SECRET = "test-secret-key-for-testing";
    const mod: TestingModule = await Test.createTestingModule({
      providers: [BigScreenAuthService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(BigScreenAuthService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("createToken", () => {
    it("创建大屏访问令牌", async () => {
      mockPrisma.bigScreenToken.create.mockResolvedValue({ id: "t1", type: "dashboard", status: "PENDING" });
      const result = await svc.createToken({ type: "dashboard", validHours: 24, createdBy: "admin" });
      expect(result.status).toBe("PENDING");
      expect(mockPrisma.bigScreenToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "dashboard" }) }),
      );
    });
  });

  describe("approveToken", () => {
    it("审批通过令牌（审批人≠创建人）", async () => {
      mockPrisma.bigScreenToken.findUnique.mockResolvedValue({ id: "t1", status: "PENDING", createdBy: "creator" });
      mockPrisma.bigScreenToken.update.mockResolvedValue({ id: "t1", status: "ACTIVE" });
      const result = await svc.approveToken("t1", "admin");
      expect(result.status).toBe("ACTIVE");
    });

    it("拒绝审批自己创建的令牌（四眼原则）", async () => {
      mockPrisma.bigScreenToken.findUnique.mockResolvedValue({ id: "t1", status: "PENDING", createdBy: "admin" });
      await expect(svc.approveToken("t1", "admin")).rejects.toThrow();
      expect(mockPrisma.bigScreenToken.update).not.toHaveBeenCalled();
    });

    it("令牌不存在则报错", async () => {
      mockPrisma.bigScreenToken.findUnique.mockResolvedValue(null);
      await expect(svc.approveToken("nope", "admin")).rejects.toThrow();
    });
  });

  describe("getAccessLogs", () => {
    it("表未建时返回 available:false 契约", async () => {
      const result = await svc.getAccessLogs({ pageSize: 50 });
      expect(result).toEqual({ items: [], total: 0, available: false });
    });
  });

  describe("revokeToken", () => {
    it("吊销令牌", async () => {
      mockPrisma.bigScreenToken.update.mockResolvedValue({ id: "t1", status: "REVOKED" });
      const result = await svc.revokeToken("t1", "admin");
      expect(result.status).toBe("REVOKED");
    });
  });

  describe("listTokens", () => {
    it("列出令牌（可选按状态过滤）", async () => {
      mockPrisma.bigScreenToken.findMany.mockResolvedValue([{ id: "t1" }]);
      const result = await svc.listTokens("APPROVED");
      expect(result).toHaveLength(1);
    });
  });

  describe("cleanExpired", () => {
    it("清理过期的已审批令牌", async () => {
      mockPrisma.bigScreenToken.updateMany.mockResolvedValue({ count: 3 });
      const result = await svc.cleanExpired();
      expect(result.expired).toBe(3);
    });
  });
});
