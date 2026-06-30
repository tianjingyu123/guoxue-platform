import { Test } from "@nestjs/testing";
import { TeacherService } from "./teacher.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  user: { findUnique: jest.fn() },
  teacherCertification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe("TeacherService", () => {
  let svc: TeacherService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(TeacherService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("getMyCertification", () => {
    it("有记录则返回", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1", status: "APPROVED" });
      const res = await svc.getMyCertification("u1");
      expect(res).toEqual({ id: "t1", status: "APPROVED" });
    });

    it("无记录返回 null", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      expect(await svc.getMyCertification("u1")).toBeNull();
    });
  });

  describe("applyCertification", () => {
    const dto = { realName: "张讲师", title: "国学讲师" };

    it("未实名认证抛 403", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: false });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
      expect(mockPrisma.teacherCertification.create).not.toHaveBeenCalled();
    });

    it("已实名且无记录 → 创建 PENDING", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      mockPrisma.teacherCertification.create.mockResolvedValue({ id: "t1", status: "PENDING" });
      const res = await svc.applyCertification("u1", dto);
      expect(res.status).toBe("PENDING");
      expect(mockPrisma.teacherCertification.create).toHaveBeenCalled();
    });

    it("已 APPROVED → 抛冲突，不重复创建", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED" });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
      expect(mockPrisma.teacherCertification.create).not.toHaveBeenCalled();
    });

    it("审核中(PENDING) → 抛冲突", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "PENDING" });
      await expect(svc.applyCertification("u1", dto)).rejects.toBeInstanceOf(BusinessException);
    });

    it("已驳回(REJECTED) → 允许重新提交（update 回 PENDING）", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ identityVerified: true });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "REJECTED" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "PENDING" });
      const res = await svc.applyCertification("u1", dto);
      expect(res.status).toBe("PENDING");
      expect(mockPrisma.teacherCertification.update).toHaveBeenCalled();
    });
  });

  describe("listCertifications（管理端）", () => {
    it("按状态过滤返回分页", async () => {
      mockPrisma.teacherCertification.findMany.mockResolvedValue([{ id: "t1", status: "PENDING" }]);
      mockPrisma.teacherCertification.count.mockResolvedValue(1);
      const res = await svc.listCertifications("PENDING", 1, 20);
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(mockPrisma.teacherCertification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PENDING" } }),
      );
    });
  });

  describe("reviewCertification（管理端审核）", () => {
    it("不存在 → 抛错", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      await expect(svc.reviewCertification("x", "APPROVE")).rejects.toBeInstanceOf(BusinessException);
    });

    it("APPROVE → 置 APPROVED 并写 verifiedTitle", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1", title: "讲师" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "APPROVED" });
      const res = await svc.reviewCertification("t1", "APPROVE", { verifiedTitle: "认证讲师" });
      expect(res.status).toBe("APPROVED");
      expect(mockPrisma.teacherCertification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED", verifiedTitle: "认证讲师" }) }),
      );
    });

    it("REJECT 无原因 → 抛错", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1" });
      await expect(svc.reviewCertification("t1", "REJECT", {})).rejects.toBeInstanceOf(BusinessException);
    });

    it("REJECT 有原因 → 置 REJECTED", async () => {
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ id: "t1" });
      mockPrisma.teacherCertification.update.mockResolvedValue({ id: "t1", status: "REJECTED" });
      const res = await svc.reviewCertification("t1", "REJECT", { rejectReason: "资质不足" });
      expect(res.status).toBe("REJECTED");
    });
  });
});
