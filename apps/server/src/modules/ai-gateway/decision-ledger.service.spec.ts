import { ErrorCode } from "../../common/error-codes";
import { DecisionLedgerService } from "./decision-ledger.service";

type LedgerConstructorArgs = ConstructorParameters<typeof DecisionLedgerService>;

describe("DecisionLedgerService", () => {
  const prisma = {
    aiDecision: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
    aiEvent: { findFirst: jest.fn() },
  };
  const redis = { runExclusive: jest.fn() };
  let service: DecisionLedgerService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.aiDecision.updateMany.mockResolvedValue({ count: 1 });
    prisma.aiDecision.findMany.mockResolvedValue([]);
    prisma.aiDecision.count.mockResolvedValue(0);
    prisma.aiEvent.findFirst.mockResolvedValue(null);
    service = new DecisionLedgerService(
      prisma as unknown as LedgerConstructorArgs[0],
      redis as unknown as LedgerConstructorArgs[1],
    );
  });

  it("审核不存在决策时返回业务 404，不泄漏 Prisma 500", async () => {
    prisma.aiDecision.findUnique.mockResolvedValue(null);

    await expect(service.reviewDecision("missing", "approved", "admin-1")).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
      status: 404,
    });
    expect(prisma.aiDecision.updateMany).not.toHaveBeenCalled();
  });

  it("决策一经审结不可覆盖原审核链", async () => {
    prisma.aiDecision.findUnique.mockResolvedValue({ humanAction: "approved", riskLevel: "low" });

    await expect(
      service.reviewDecision("d1", "rejected", "admin-2", "重新判断"),
    ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    expect(prisma.aiDecision.updateMany).not.toHaveBeenCalled();
  });

  it("高风险批准与驳回必须填写依据", async () => {
    prisma.aiDecision.findUnique
      .mockResolvedValueOnce({ humanAction: null, riskLevel: "high" })
      .mockResolvedValueOnce({ humanAction: null, riskLevel: "low" });

    await expect(service.reviewDecision("d1", "approved", "admin-1")).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
    await expect(service.reviewDecision("d2", "rejected", "admin-1", "  ")).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
  });

  it("以原子条件写入审核人与审核依据，防并发重复审核", async () => {
    prisma.aiDecision.findUnique.mockResolvedValue({ humanAction: null, riskLevel: "high" });

    await service.reviewDecision("d1", "approved", "admin-1", "  已核对真实指标  ");

    expect(prisma.aiDecision.updateMany).toHaveBeenCalledWith({
      where: { id: "d1", humanAction: null },
      data: expect.objectContaining({
        humanAction: "approved",
        humanReviewer: "admin-1",
        humanNote: "已核对真实指标",
        humanReviewedAt: expect.any(Date),
      }),
    });
  });

  it("并发审核竞争失败时给出可恢复的业务错误", async () => {
    prisma.aiDecision.findUnique.mockResolvedValue({ humanAction: null, riskLevel: "low" });
    prisma.aiDecision.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.reviewDecision("d1", "approved", "admin-1")).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
  });

  it("效果记录对不存在决策返回 404", async () => {
    prisma.aiDecision.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.recordOutcome("missing", "转化率", 0.2, 0.18, "admin-1"),
    ).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND, status: 404 });
  });

  it("待审核筛选映射为 humanAction=null 并严格应用分页", async () => {
    await service.query({ humanAction: "pending", limit: 20, offset: 40 });

    expect(prisma.aiDecision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { humanAction: null },
        take: 20,
        skip: 40,
      }),
    );
    expect(prisma.aiDecision.count).toHaveBeenCalledWith({ where: { humanAction: null } });
  });

  it("追溯不存在决策时返回 404", async () => {
    prisma.aiDecision.findUnique.mockResolvedValue(null);

    await expect(service.getTrace("missing")).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
      status: 404,
    });
    expect(prisma.aiDecision.findMany).not.toHaveBeenCalled();
  });
});
