import { ErrorCode } from "../../common/error-codes";
import { AdminReferralService } from "./admin-referral.service";

describe("AdminReferralService", () => {
  const prisma = {
    station: { findUnique: jest.fn() },
    operator: { findUnique: jest.fn() },
    temporaryReferralConfig: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const fundApproval = { create: jest.fn() };
  const svc = new AdminReferralService(prisma as any, fundApproval as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.station.findUnique.mockResolvedValue({ id: "station-1" });
    prisma.operator.findUnique.mockResolvedValue({ id: "operator-1" });
    fundApproval.create.mockResolvedValue({ submitted: true, approvalId: "a1", status: "PENDING" });
  });

  const validCreate = {
    stationId: "station-1",
    commissionRate: 10,
    validFrom: "2026-07-20T00:00:00.000Z",
    validTo: "2026-07-27T00:00:00.000Z",
  };

  it("新增配置只提交资金审批，不直接写库", async () => {
    const result = await svc.requestCreate({ ...validCreate, stationId: " station-1 " }, "admin-1");
    expect(result).toMatchObject({ submitted: true, status: "PENDING" });
    expect(fundApproval.create).toHaveBeenCalledWith(expect.objectContaining({
      type: "COMMISSION_CONFIG",
      requestedBy: "admin-1",
      payload: {
        method: "createTemporaryReferralConfig",
        dto: expect.objectContaining({ stationId: "station-1", operatorId: null, commissionRate: 10 }),
      },
    }));
    expect(prisma.temporaryReferralConfig.create).not.toHaveBeenCalled();
  });

  it("不存在的分站 ID 在提交审批前即拒绝", async () => {
    prisma.station.findUnique.mockResolvedValue(null);
    await expect(svc.requestCreate(validCreate, "admin-1")).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
    expect(fundApproval.create).not.toHaveBeenCalled();
  });
  it("修改配置合并当前值校验后提交审批，不直接写库", async () => {
    prisma.temporaryReferralConfig.findUnique.mockResolvedValue({
      id: "r1",
      stationId: "station-1",
      operatorId: null,
      commissionRate: 10,
      validFrom: new Date(validCreate.validFrom),
      validTo: new Date(validCreate.validTo),
    });
    await svc.requestUpdate("r1", { stationId: null, operatorId: " operator-1 ", commissionRate: 20 }, "admin-1");
    expect(fundApproval.create).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        method: "updateTemporaryReferralConfig",
        id: "r1",
        dto: { stationId: null, operatorId: "operator-1", commissionRate: 20 },
      },
    }));
    expect(prisma.temporaryReferralConfig.update).not.toHaveBeenCalled();
  });

  it("删除配置提交审批，不直接删除", async () => {
    prisma.temporaryReferralConfig.findUnique.mockResolvedValue({
      id: "r1", stationId: null, operatorId: null, commissionRate: 10,
    });
    await svc.requestDelete("r1", "admin-1");
    expect(fundApproval.create).toHaveBeenCalledWith(expect.objectContaining({
      payload: { method: "deleteTemporaryReferralConfig", id: "r1" },
      requestedBy: "admin-1",
    }));
    expect(prisma.temporaryReferralConfig.delete).not.toHaveBeenCalled();
  });

  it("审批执行创建时把范围和日期标准化后写库", async () => {
    prisma.temporaryReferralConfig.create.mockResolvedValue({ id: "r1" });
    await svc.create(validCreate, "admin");
    expect(prisma.temporaryReferralConfig.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stationId: "station-1",
        operatorId: null,
        commissionRate: 10,
        validFrom: new Date(validCreate.validFrom),
        validTo: new Date(validCreate.validTo),
        createdBy: "admin",
      }),
    });
  });

  it("服务层拒绝超过 100% 的佣金比例", async () => {
    await expect(svc.create({ ...validCreate, commissionRate: 100.1 })).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
    expect(prisma.temporaryReferralConfig.create).not.toHaveBeenCalled();
  });

  it("拒绝同时设置分站和运营商范围", async () => {
    await expect(svc.create({ ...validCreate, operatorId: "operator-1" })).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
  });

  it("拒绝结束时间不晚于开始时间", async () => {
    await expect(svc.create({ ...validCreate, validTo: validCreate.validFrom })).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
  });

  it("审批执行更新时合并旧值校验，并可把分站范围切换为全局", async () => {
    prisma.temporaryReferralConfig.findUnique.mockResolvedValue({
      id: "r1",
      stationId: "station-1",
      operatorId: null,
      commissionRate: 10,
      validFrom: new Date(validCreate.validFrom),
      validTo: new Date(validCreate.validTo),
    });
    prisma.temporaryReferralConfig.update.mockResolvedValue({ id: "r1" });

    await svc.update("r1", { stationId: null, operatorId: null, commissionRate: 20 });

    expect(prisma.temporaryReferralConfig.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { stationId: null, operatorId: null, commissionRate: 20 },
    });
  });

  it("更新后的有效时间倒置时拒绝写库", async () => {
    prisma.temporaryReferralConfig.findUnique.mockResolvedValue({
      id: "r1",
      stationId: null,
      operatorId: null,
      commissionRate: 10,
      validFrom: new Date(validCreate.validFrom),
      validTo: new Date(validCreate.validTo),
    });
    await expect(svc.update("r1", { validFrom: "2026-08-01T00:00:00.000Z" })).rejects.toMatchObject({
      errorCode: ErrorCode.BAD_REQUEST,
    });
    expect(prisma.temporaryReferralConfig.update).not.toHaveBeenCalled();
  });

  it("当前生效配置按创建时间倒序返回全部作用域", async () => {
    prisma.temporaryReferralConfig.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    const rows = await svc.getActive();
    expect(rows).toHaveLength(2);
    expect(prisma.temporaryReferralConfig.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: "desc" },
    }));
  });
});