import { Test } from "@nestjs/testing";
import { ExportService } from "./export.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  user: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  course: { findMany: jest.fn() },
  article: { findMany: jest.fn() },
  withdrawal: { findMany: jest.fn() },
};

describe("ExportService", () => {
  let svc: ExportService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(ExportService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("exportUsers", () => {
    it("返回 CSV 字符串包含表头", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "张三", phone: "13800001111", email: null, memberLevel: "NONE", status: "ACTIVE", roles: [], identityVerified: false, createdAt: new Date("2026-01-01") },
      ]);
      const csv = await svc.exportUsers({});
      expect(csv).toContain("ID,昵称,手机号,邮箱,会员等级,状态,角色,实名认证,注册时间");
      expect(csv).toContain("张三");
      expect(csv).toContain("13800001111");
      expect(csv).toContain("否");
    });

    it("keyword 过滤传入 OR 条件", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await svc.exportUsers({ keyword: "测试" });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it("日期范围过滤", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await svc.exportUsers({ startDate: "2026-01-01", endDate: "2026-12-31" });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: { gte: expect.any(Date), lte: expect.any(Date) } }),
        }),
      );
    });
  });

  describe("exportOrders", () => {
    it("返回订单 CSV", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", user: { nickname: "李四", phone: "139" }, type: "COURSE", amount: "99.00", payAmount: "89.00", status: "PAID", payMethod: "WECHAT", paidAt: new Date(), createdAt: new Date() },
      ]);
      const csv = await svc.exportOrders({});
      expect(csv).toContain("订单ID,用户,手机号,类型,金额,实付,状态,支付方式,支付时间,创建时间");
      expect(csv).toContain("李四");
      expect(csv).toContain("99.00");
    });

    it("状态和类型过滤", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await svc.exportOrders({ status: "PAID", type: "COURSE" });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PAID", type: "COURSE" } }),
      );
    });
  });

  describe("exportCourses", () => {
    it("返回课程 CSV", async () => {
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "入门课", user: { nickname: "王老师" }, type: "VIDEO", price: "0", studentCount: 10, auditStatus: "APPROVED", categoryLevel1: "国学", categoryLevel2: null, createdAt: new Date() },
      ]);
      const csv = await svc.exportCourses({});
      expect(csv).toContain("标题");
      expect(csv).toContain("入门课");
      expect(csv).toContain("王老师");
    });
  });

  describe("exportArticles", () => {
    it("返回文章 CSV", async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学论", user: { nickname: "作者" }, viewCount: 100, likeCount: 5, commentCount: 2, auditStatus: "APPROVED", isPushHome: true, categoryLevel1: "经典", createdAt: new Date() },
      ]);
      const csv = await svc.exportArticles({});
      expect(csv).toContain("国学论");
      expect(csv).toContain("是");
    });
  });

  describe("exportWithdrawals", () => {
    it("返回提现 CSV", async () => {
      mockPrisma.withdrawal.findMany.mockResolvedValue([
        { id: "w1", user: { nickname: "站长", phone: "138" }, amount: "500.00", bankName: "工商银行", bankAccount: "6222***", bankHolder: "张三", status: "PENDING", remark: null, createdAt: new Date(), processedAt: null },
      ]);
      const csv = await svc.exportWithdrawals({});
      expect(csv).toContain("站长");
      expect(csv).toContain("500.00");
      expect(csv).toContain("工商银行");
    });

    it("状态过滤", async () => {
      mockPrisma.withdrawal.findMany.mockResolvedValue([]);
      await svc.exportWithdrawals({ status: "APPROVED" });
      expect(mockPrisma.withdrawal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "APPROVED" } }),
      );
    });
  });
});
