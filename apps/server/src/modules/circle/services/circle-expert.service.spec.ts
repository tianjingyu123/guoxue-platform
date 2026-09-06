import { HEADERS_METADATA } from "@nestjs/common/constants";
import { CircleController } from "../circle.controller";
import { CircleExpertService } from "./circle-expert.service";
import { CircleSharedService } from "./circle-shared.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { circleExpertWhere } from "../../../common/circle-expert-availability";

describe("CircleExpertService 基础准入与撤角色", () => {
  const now = new Date("2026-09-05T00:00:00Z");
  const member = { id: "m1", circleId: "c1", userId: "expert", role: "GUEST", callPricePerMinuteCoin: 5, callAvailableHours: [{ start: "09:00", end: "11:00", interval: 60 }] };
  let prisma: ReturnType<typeof createMock>;
  let service: CircleExpertService;
  const createMock = () => {
    const mock = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: "buyer" }, { id: "m1" }]),
      $transaction: jest.fn(),
      circleMember: { findFirst: jest.fn().mockResolvedValue(member), findMany: jest.fn().mockResolvedValue([member]) },
      circleExpertBooking: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "b1" }) },
    };
    mock.$transaction.mockImplementation(fn => fn(mock));
    return mock;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prisma = createMock();
    service = new CircleExpertService(prisma as unknown as PrismaService, {} as RedisService,
      { ensureMember: jest.fn().mockResolvedValue(undefined) } as unknown as CircleSharedService,
      { project: jest.fn(async rows => rows), projectInTransaction: jest.fn(async (_tx, rows) => rows.map(row => ({ ...row, audioCallEnabled: true, videoCallEnabled: false }))) } as never,
      {} as never, { assertAuthorizationInTransaction: jest.fn().mockResolvedValue({}) } as never);
  });
  afterEach(() => jest.useRealTimers());

  it.each([undefined, "", " c1", "c1 "])("缺失或歧义圈子参数在查库前拒绝：%s", async circleId => {
    await expect(service.getExpertSlots("expert", "2026-09-06", circleId)).rejects.toThrow("请选择本次预约所属圈子");
    await expect(service.createExpertBooking("expert", "buyer", { circleId, slotDate: "2026-09-06", slotStart: "09:00", slotEnd: "10:00" } as any)).rejects.toThrow("请选择本次预约所属圈子");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("圈内、全平台与个人咨询列表统一排除无效服务者", async () => {
    await service.listCircleExperts("c1");
    await service.listAllExperts(10);
    await service.listUserConsultServices("expert");
    const calls = prisma.circleMember.findMany.mock.calls;
    const candidate = circleExpertWhere("ANY", now); delete candidate.role;
    expect(calls[0][0].where).toEqual({ ...candidate, circleId: "c1" });
    expect(calls[1][0].where).toEqual(candidate);
    expect(calls[2][0].where).toEqual({ ...candidate, userId: "expert" });
    expect(calls[1][0].take).toBe(10);
  });

  it("公开单个咨询配置也不能绕过基础准入", async () => {
    await service.getExpertConfig("c1", "expert");
    const candidate = circleExpertWhere("CONFIG", now); delete candidate.role;
    expect(prisma.circleMember.findFirst.mock.calls[0][0].where).toEqual({ ...candidate, circleId: "c1", userId: "expert" });
    prisma.circleMember.findFirst.mockResolvedValueOnce(null);
    await expect(service.getExpertConfig("c1", "expert")).rejects.toThrow("成员不存在");
  });

  it("时段仅从有效且有连麦价格的服务者取得", async () => {
    await service.getExpertSlots("expert", "2026-09-05", "c1");
    const candidate = circleExpertWhere("CALL", now); delete candidate.role;
    expect(prisma.circleMember.findMany.mock.calls[0][0].where).toEqual({ ...candidate, userId: "expert", circleId: "c1" });
    prisma.circleMember.findMany.mockResolvedValueOnce([]);
    await expect(service.getExpertSlots("expert", undefined, "c1")).rejects.toThrow("未开通咨询");
  });

  it("分钟级时段格式正确，交叠预约不能仍显示可选", async () => {
    prisma.circleMember.findMany.mockResolvedValueOnce([{ ...member, callAvailableHours: [{ start: "09:30", end: "11:00", interval: 30 }] }]);
    prisma.circleExpertBooking.findMany.mockResolvedValueOnce([{ slotStart: "09:45", slotEnd: "10:15" }]);
    const result = await service.getExpertSlots("expert", "2026-09-05", "c1");
    expect(result.slots).toEqual([
      { start: "09:30", end: "10:00", available: false },
      { start: "10:00", end: "10:30", available: false },
      { start: "10:30", end: "11:00", available: true },
    ]);
  });

  it("非法/负间隔配置不会无限循环或凭空生成可预约时段", async () => {
    prisma.circleMember.findMany.mockResolvedValueOnce([{ ...member, callAvailableHours: [null, {}, { start: "09:00", end: "10:00", interval: -1 }, { start: "09:00", end: "10:00", interval: 0 }, { start: "09:00", end: "10:00", days: "bad" }] }]);
    expect((await service.getExpertSlots("expert", "2026-09-05", "c1")).slots).toEqual([]);
  });

  it("预约创建前事务重读，角色/到期/停用变化后不创建", async () => {
    prisma.circleMember.findFirst.mockResolvedValueOnce(member).mockResolvedValueOnce(null);
    await expect(service.createExpertBooking("expert", "buyer", { circleId: "c1", slotDate: "2026-09-06", slotStart: "09:00", slotEnd: "10:00" }))
      .rejects.toThrow("咨询服务已停用");
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);
    expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled();
  });

  it("有效服务者仍可预约，业务记录属于重新校验的同一圈子", async () => {
    await service.createExpertBooking("expert", "buyer", { circleId: "c1", slotDate: "2026-09-06", slotStart: "09:00", slotEnd: "10:00" });
    const candidate = circleExpertWhere("CALL", now); delete candidate.role;
    expect(prisma.circleMember.findFirst.mock.calls[1][0].where).toEqual({ ...candidate, id: "m1", circleId: "c1", userId: "expert" });
    expect(prisma.circleExpertBooking.create).toHaveBeenCalledWith({ data: expect.objectContaining({ circleId: "c1", expertUserId: "expert", bookerUserId: "buyer" }) });
    expect(prisma.$executeRaw.mock.calls[0][0].join("?")).toBe("SELECT pg_advisory_xact_lock(hashtext(?))");
    expect(prisma.$executeRaw.mock.calls[0][1]).toBe("circle-expert-booking:expert:2026-09-06");
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.circleExpertBooking.findFirst.mock.invocationCallOrder[0]);
    expect(prisma.circleExpertBooking.findFirst.mock.invocationCallOrder[0]).toBeLessThan(prisma.circleExpertBooking.create.mock.invocationCallOrder[0]);
  });

  it("交叠时段即使起点不同也拒绝，相邻边界使用严格不等号", async () => {
    prisma.circleExpertBooking.findFirst.mockResolvedValueOnce({ id: "existing" });
    await expect(service.createExpertBooking("expert", "buyer", { circleId: "c1", slotDate: "2026-09-06", slotStart: "09:00", slotEnd: "10:00" }))
      .rejects.toThrow("该时段已被预约");
    expect(prisma.circleExpertBooking.findFirst.mock.calls[0][0].where).toEqual({
      expertUserId: "expert", slotDate: "2026-09-06", slotStart: { lt: "10:00" }, slotEnd: { gt: "09:00" }, status: { in: ["PENDING", "CONFIRMED"] },
    });
    expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled();
  });

  it("绕过前端提交未配置的时段，服务端拒绝创建", async () => {
    await expect(service.createExpertBooking("expert", "buyer", { circleId: "c1", slotDate: "2026-09-06", slotStart: "20:00", slotEnd: "21:00" }))
      .rejects.toThrow("该时段未开放预约");
    expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-02-30", "09:00", "10:00"], ["2026-09-06", "24:00", "25:00"],
    ["2026-09-06", "10:00", "09:00"], ["2026-09-06", "09:00", "09:00"],
  ])("非法预约日期时段在查询前拒绝：%s %s %s", async (slotDate, slotStart, slotEnd) => {
    await expect(service.createExpertBooking("expert", "buyer", { circleId: "c1", slotDate, slotStart, slotEnd })).rejects.toThrow("预约日期或时段无效");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["getExpertConfig", "listAllExperts", "listExperts", "listUserConsultServices", "getExpertSlots"] as const)("%s 响应不能由共享缓存保留旧服务状态", method => {
    expect(Reflect.getMetadata(HEADERS_METADATA, CircleController.prototype[method]))
      .toContainEqual({ name: "Cache-Control", value: "private, no-store" });
  });
});
