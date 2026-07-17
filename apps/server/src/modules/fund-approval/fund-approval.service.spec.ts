import { Test } from "@nestjs/testing";
import { FundApprovalService } from "./fund-approval.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

/**
 * 资金审批 CRUD/状态流转层单测（T4 审查补齐）。
 * 关键语义：claim 的 CAS（仅 PENDING 可流转·并发只有一个成功）与
 * revertToPending 的回滚条件（仅 APPROVED 可回退，防"已通过未执行"资金空档）。
 * （自审自批拦截在 executor 层，已由 fund-approval.executor.spec 覆盖。）
 */

const mockModel = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  updateMany: jest.fn(),
};
const mockPrisma = { fundApproval: mockModel };

describe("FundApprovalService", () => {
  let svc: FundApprovalService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        FundApprovalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(FundApprovalService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create（发起审批）", () => {
    it("创建 PENDING 审批单并返回提交结果", async () => {
      mockModel.create.mockResolvedValue({ id: "fa-1", status: "PENDING" });
      const result = await svc.create({
        type: "RECHARGE",
        payload: { userId: "u1", amountCoin: 100 },
        amount: 100,
        summary: "灵石充值 100 币到账（用户 u1）",
        requestedBy: "admin-1",
      });
      expect(result).toEqual({
        submitted: true,
        approvalId: "fa-1",
        status: "PENDING",
        message: "已提交审批，待财务审批后生效",
      });
      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "RECHARGE", status: "PENDING", requestedBy: "admin-1" }),
      });
    });

    it("amount 缺省时落 null（非 0，与金额语义区分）", async () => {
      mockModel.create.mockResolvedValue({ id: "fa-2", status: "PENDING" });
      await svc.create({ type: "COMMISSION_CONFIG", payload: {}, summary: "s", requestedBy: "a" });
      expect(mockModel.create.mock.calls[0][0].data.amount).toBeNull();
    });
  });

  describe("list（分页查询）", () => {
    it("默认查 PENDING 第一页", async () => {
      mockModel.findMany.mockResolvedValue([{ id: "fa-1", type: "REFUND" }]);
      mockModel.count.mockResolvedValue(1);
      const result = await svc.list();
      expect(result).toEqual({ items: [{ id: "fa-1", type: "REFUND", amountUnit: "CNY" }], total: 1, page: 1, pageSize: 20 });
      expect(mockModel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: "PENDING" }, skip: 0, take: 20,
      }));
    });

    it("status 传空串时查全部状态", async () => {
      mockModel.findMany.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);
      await svc.list(2, 10, "");
      expect(mockModel.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 10, take: 10 }));
    });

    it("status=ALL（不分大小写）查全部状态", async () => {
      mockModel.findMany.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);
      await svc.list(1, 20, "all");
      expect(mockModel.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    // 🔴 amountUnit：RECHARGE/COIN_REFUND 的 amount 是币数，其余是人民币元 —— 前端显示以此为准
    it("RECHARGE/COIN_REFUND 标 COIN，其余标 CNY", async () => {
      mockModel.findMany.mockResolvedValue([
        { id: "1", type: "RECHARGE", amount: 1000 },
        { id: "2", type: "COIN_REFUND", amount: 50 },
        { id: "3", type: "REFUND", amount: 9.9 },
        { id: "4", type: "HUIFU_SPLIT", amount: 100 },
      ]);
      mockModel.count.mockResolvedValue(4);
      const result = await svc.list(1, 20, "ALL");
      expect(result.items.map((i: any) => i.amountUnit)).toEqual(["COIN", "COIN", "CNY", "CNY"]);
    });
  });

  describe("findById", () => {
    it("存在则返回", async () => {
      mockModel.findUnique.mockResolvedValue({ id: "fa-1" });
      expect(await svc.findById("fa-1")).toEqual({ id: "fa-1" });
    });

    it("不存在抛业务异常", async () => {
      mockModel.findUnique.mockResolvedValue(null);
      await expect(svc.findById("nope")).rejects.toThrow(BusinessException);
    });
  });

  describe("claim（CAS 原子认领·并发防重复执行的核心）", () => {
    it("PENDING 单认领成功：条件必须带 status=PENDING（CAS 语义钉子）", async () => {
      mockModel.updateMany.mockResolvedValue({ count: 1 });
      const ok = await svc.claim("fa-1", "APPROVED", "reviewer-1", "同意");
      expect(ok).toBe(true);
      expect(mockModel.updateMany).toHaveBeenCalledWith({
        where: { id: "fa-1", status: "PENDING" },
        data: expect.objectContaining({ status: "APPROVED", reviewedBy: "reviewer-1", reviewNote: "同意" }),
      });
    });

    it("并发第二个认领者失败（count=0 → false），不抛错由调用方处理", async () => {
      mockModel.updateMany.mockResolvedValue({ count: 0 });
      expect(await svc.claim("fa-1", "APPROVED", "reviewer-2")).toBe(false);
    });

    it("驳回同样走 CAS 流转", async () => {
      mockModel.updateMany.mockResolvedValue({ count: 1 });
      expect(await svc.claim("fa-1", "REJECTED", "reviewer-1", "材料不足")).toBe(true);
      expect(mockModel.updateMany.mock.calls[0][0].data.status).toBe("REJECTED");
    });
  });

  describe("revertToPending（执行失败回滚·防资金空档）", () => {
    it("仅 APPROVED 状态可回退为 PENDING 并清空审批人字段", async () => {
      mockModel.updateMany.mockResolvedValue({ count: 1 });
      await svc.revertToPending("fa-1");
      expect(mockModel.updateMany).toHaveBeenCalledWith({
        where: { id: "fa-1", status: "APPROVED" },
        data: { status: "PENDING", reviewedBy: null, reviewNote: null, processedAt: null },
      });
    });
  });

  describe("分页入参加固（P2-4 NaN 防护）", () => {
    it("list 传 page='abc' 时 skip 不为 NaN", async () => {
      mockModel.findMany.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);
      await svc.list("abc" as any);
      expect(Number.isNaN(mockModel.findMany.mock.calls[0][0].skip)).toBe(false);
    });
  });
});
