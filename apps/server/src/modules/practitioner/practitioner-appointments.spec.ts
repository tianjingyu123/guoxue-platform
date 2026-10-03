import { PractitionerService } from "./practitioner.service";

function setup() {
  const prisma: any = {
    practitionerAppointment: {
      create: jest.fn(async ({ data }: any) => data),
      findMany: jest.fn(async () => []),
    },
    clientReminder: { findMany: jest.fn(async () => []) },
    clientBook: { count: jest.fn(async () => 0) },
    userEarning: { aggregate: jest.fn(async () => ({ _sum: { amountRmb: 0 } })) },
    practitionerLedger: { aggregate: jest.fn(async () => ({ _sum: { amount: 0 } })) },
    paidQuestion: { count: jest.fn(async () => 0) },
    practitionerReport: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    practitionerProfile: { findUnique: jest.fn(async () => null) },
    commissionConfig: { findUnique: jest.fn(async () => null) },
  };
  return { service: new PractitionerService(prisma, {} as any), prisma };
}

describe("工作台预约时间", () => {
  it("保存绝对时间并拒绝无效时间", async () => {
    const { service, prisma } = setup();
    await service.createAppointment("teacher-1", {
      clientName: "客户", startAt: "2026-09-24T01:00:00.000Z", service: "咨询",
    });
    expect(prisma.practitionerAppointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ownerId: "teacher-1", startAt: new Date("2026-09-24T01:00:00.000Z") }),
    });
    await expect(service.createAppointment("teacher-1", { startAt: "invalid" }))
      .rejects.toThrow("预约时间无效");
  });

  it("首页按客户端日历日与本月边界查询，兼容夏令时日长", async () => {
    const { service, prisma } = setup();
    const period = {
      dayStart: "2026-11-01T07:00:00.000Z",
      dayEnd: "2026-11-02T08:00:00.000Z",
      monthStart: "2026-11-01T07:00:00.000Z",
    };
    await service.getHome("teacher-1", period);
    expect(prisma.practitionerAppointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: "teacher-1", startAt: { gte: new Date(period.dayStart), lt: new Date(period.dayEnd) } },
    }));
    expect(prisma.clientReminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: "teacher-1", status: "PENDING", dueAt: { lt: new Date(period.dayEnd) } },
    }));
    expect(prisma.userEarning.aggregate).toHaveBeenCalledWith({
      where: { userId: "teacher-1", createdAt: { gte: new Date(period.monthStart) } },
      _sum: { amountRmb: true },
    });
  });

  it("不完整或超长的日期范围不能查询首页", async () => {
    const { service, prisma } = setup();
    await expect(service.getHome("teacher-1", { dayStart: "2026-11-01T07:00:00.000Z" }))
      .rejects.toThrow("日期范围不完整");
    await expect(service.getHome("teacher-1", {
      dayStart: "2026-11-01T07:00:00.000Z",
      dayEnd: "2026-11-03T07:00:00.000Z",
      monthStart: "2026-11-01T07:00:00.000Z",
    })).rejects.toThrow("日期范围无效");
    expect(prisma.practitionerAppointment.findMany).not.toHaveBeenCalled();
  });
});
