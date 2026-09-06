import { ConsultCallService } from "./consult-call.service";
import { buildTrtcConfig } from "./trtc-sig.util";

jest.mock("./trtc-sig.util", () => ({ buildTrtcConfig: jest.fn() }));

describe("付费通话基础准入与接听 CAS（金额/RTC 使用测试替身）", () => {
  type TxMock = { $queryRaw: jest.Mock; circleMember: { findFirst: jest.Mock }; $executeRawUnsafe: jest.Mock };
  let prisma: { circleMember: { findFirst: jest.Mock }; $transaction: jest.Mock; $queryRawUnsafe: jest.Mock; $executeRawUnsafe: jest.Mock };
  let tx: TxMock, coin: { spend: jest.Mock; refund: jest.Mock }, svc: ConsultCallService;
  const capabilities = { assertAuthorizationInTransaction: jest.fn() };
  const revenue = { assertConsultReadyInTransaction: jest.fn() };
  const dto = { circleId: "circle", expertId: "expert", type: "VOICE" as const };
  beforeEach(() => {
    tx = { $queryRaw: jest.fn().mockResolvedValueOnce([{ id: "circle" }]).mockResolvedValueOnce([{ id: "expert" }]).mockResolvedValueOnce([{ id: "member" }]),
      circleMember: { findFirst: jest.fn().mockResolvedValue({ callPricePerMinuteCoin: 8 }) }, $executeRawUnsafe: jest.fn().mockResolvedValue(1) };
    prisma = { circleMember: { findFirst: jest.fn().mockResolvedValue({ id: "member", callPricePerMinuteCoin: 8 }) },
      $transaction: jest.fn((fn: (value: TxMock) => Promise<unknown>) => fn(tx)), $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: "call", circleId: "circle", expertId: "expert", type: "VOICE", status: "WAITING", rtcRoomId: "room" }]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1) };
    coin = { spend: jest.fn(), refund: jest.fn() };
    (buildTrtcConfig as jest.Mock).mockReset().mockReturnValue({ configured: true, userSig: "SYNTHETIC_ONLY", privateMapKey: "SYNTHETIC_ROOM_ONLY", sdkAppId: 1 });
    type Dependencies = ConstructorParameters<typeof ConsultCallService>;
    capabilities.assertAuthorizationInTransaction.mockReset().mockResolvedValue({});
    revenue.assertConsultReadyInTransaction.mockReset().mockResolvedValue(undefined);
    svc = new ConsultCallService(prisma as unknown as Dependencies[0], {} as Dependencies[1], coin as unknown as Dependencies[2], revenue as unknown as Dependencies[3], capabilities as unknown as Dependencies[4], { issueInTransaction: jest.fn().mockResolvedValue(undefined) } as unknown as Dependencies[5]);
  });
  it("价格查询保持圈子/账号、有效期和正价，头衔由主库独立授权判定", async () => {
    await svc.initiate("caller", dto); const first = prisma.circleMember.findFirst.mock.calls[0][0].where;
    expect(buildTrtcConfig).toHaveBeenCalledWith('caller', expect.any(String), 'VOICE', 1260);
    expect(first.role).toBeUndefined();
    expect(capabilities.assertAuthorizationInTransaction).toHaveBeenCalledWith(tx, "circle", "AUDIO_QUESTION", { userId: "caller", executor: "HUMAN" }, "expert");
    expect(capabilities.assertAuthorizationInTransaction.mock.invocationCallOrder[0]).toBeLessThan(coin.spend.mock.invocationCallOrder[0]);
    expect(first).toMatchObject({ circleId: "circle", userId: "expert",
      circle: { status: "ACTIVE", deletedAt: null }, user: { status: "ACTIVE", deletedAt: null }, callPricePerMinuteCoin: { gt: 0 } });
    expect(first.AND).toEqual([{ OR: [{ expireAt: null }, { expireAt: { gt: expect.any(Date) } }] }]);
    expect(tx.circleMember.findFirst.mock.calls[0][0].where).toMatchObject({ id: "member", ...first, AND: expect.any(Array) });
    expect(tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(tx.circleMember.findFirst.mock.invocationCallOrder[0]);
    expect(tx.circleMember.findFirst.mock.invocationCallOrder[0]).toBeLessThan(coin.spend.mock.invocationCallOrder[0]);
    expect(coin.spend).toHaveBeenCalledWith("caller", expect.objectContaining({ amountCoin: 80 }), tx);
  });
  it("未开放资格不进入扣币事务", async () => {
    prisma.circleMember.findFirst.mockResolvedValue(null);
    await expect(svc.initiate("caller", dto)).rejects.toThrow("未开放有效"); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each(["initiate", "accept"])("%s结算前置失败不建单、不预扣或进入通话中", async action => {
    revenue.assertConsultReadyInTransaction.mockRejectedValue(new Error("SYNTHETIC_RULE_NOT_READY"));
    await expect(action === "initiate" ? svc.initiate("caller", dto) : svc.accept("expert", "call")).rejects.toThrow("SYNTHETIC_RULE_NOT_READY");
    expect(coin.spend).not.toHaveBeenCalled(); expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(revenue.assertConsultReadyInTransaction).toHaveBeenCalledWith(tx);
  });
  it.each([0, -1, 1.5, NaN, 214748365])("非法或溢出的预扣价格不扣币：%s", async price => {
    prisma.circleMember.findFirst.mockResolvedValue({ id: "member", callPricePerMinuteCoin: price });
    await expect(svc.initiate("caller", dto)).rejects.toThrow("价格配置无效"); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("RTC 不可用时在扣币/建单前停止", async () => {
    (buildTrtcConfig as jest.Mock).mockReturnValue({ configured: false, userSig: null });
    await expect(svc.initiate("caller", dto)).rejects.toThrow("未扣除金币"); expect(prisma.$transaction).not.toHaveBeenCalled(); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("只有通用 UserSig 而没有房间权限票据时不得预扣或接听", async () => {
    (buildTrtcConfig as jest.Mock).mockReturnValue({ configured: true, userSig: "SYNTHETIC_ONLY", privateMapKey: null });
    await expect(svc.initiate("caller", dto)).rejects.toThrow("未扣除金币");
    await expect(svc.accept("expert", "call")).rejects.toThrow("通话服务暂不可用");
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("取锁后资格消失则不扣币、不插入", async () => {
    tx.circleMember.findFirst.mockResolvedValue(null);
    await expect(svc.initiate("caller", dto)).rejects.toMatchObject({ status: 403 }); expect(coin.spend).not.toHaveBeenCalled(); expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });
  it("取锁后调价返回409，不能按旧价继续预扣", async () => {
    tx.circleMember.findFirst.mockResolvedValue({ callPricePerMinuteCoin: 9 });
    await expect(svc.initiate("caller", dto)).rejects.toMatchObject({ status: 409 }); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("原成员已被替换，不能使用未锁定的新关系", async () => {
    tx.$queryRaw.mockReset().mockResolvedValueOnce([{ id: "circle" }]).mockResolvedValueOnce([{ id: "expert" }]).mockResolvedValueOnce([{ id: "new-member" }]);
    await expect(svc.initiate("caller", dto)).rejects.toMatchObject({ status: 403 }); expect(tx.circleMember.findFirst).not.toHaveBeenCalled(); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("扣币失败不建通话记录，插入非一行必须抛错交事务回滚", async () => {
    coin.spend.mockRejectedValue(new Error("余额不足")); await expect(svc.initiate("caller", dto)).rejects.toThrow("余额不足"); expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    coin.spend.mockReset(); tx.$queryRaw.mockReset().mockResolvedValue([{ id: "circle" }, { id: "expert" }, { id: "member" }]); tx.$executeRawUnsafe.mockResolvedValue(0);
    await expect(svc.initiate("caller", dto)).rejects.toThrow("CONSULT_CALL_INSERT_FAILED");
  });
  it("内部错误通话类型也不能绕过 DTO 后扣币", async () => {
    await expect(svc.initiate("caller", { ...dto, type: "TEXT" as typeof dto.type })).rejects.toThrow("类型无效"); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("授权失败在扣费和建单前停止", async () => {
    capabilities.assertAuthorizationInTransaction.mockRejectedValue(new Error("GRANT_REVOKED"));
    await expect(svc.initiate("caller", dto)).rejects.toThrow("GRANT_REVOKED");
    expect(coin.spend).not.toHaveBeenCalled(); expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });
  it("音频与视频能力精确分流，接听重新验证", async () => {
    await svc.initiate("caller", { ...dto, type: "VIDEO" });
    expect(capabilities.assertAuthorizationInTransaction).toHaveBeenCalledWith(tx, "circle", "VIDEO_QUESTION", { userId: "caller", executor: "HUMAN" }, "expert");
    tx.$queryRaw.mockResolvedValue([{ id: "circle" }, { id: "expert" }, { id: "member" }]);
    await svc.accept("expert", "call");
    expect(capabilities.assertAuthorizationInTransaction).toHaveBeenCalledWith(tx, "circle", "AUDIO_QUESTION", { userId: "expert", executor: "HUMAN" }, "expert");
  });
  it("自动化不能通过直接服务调用发起或接听", async () => {
    await expect(svc.initiate("caller", dto, "AUTOMATION")).rejects.toMatchObject({ status: 403 });
    await expect(svc.accept("expert", "call", "AUTOMATION")).rejects.toMatchObject({ status: 403 });
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(coin.spend).not.toHaveBeenCalled();
  });
  it("接听必须精确认领 WAITING，零行冲突时不返回连接凭据", async () => {
    tx.$executeRawUnsafe.mockResolvedValue(0);
    await expect(svc.accept("expert", "call")).rejects.toMatchObject({ status: 409 });
    expect(tx.$executeRawUnsafe.mock.calls[0][0]).toContain(`AND "status"='WAITING'`);
  });
  it("接听成功一次，使用 UTC 时间参数", async () => {
    expect(await svc.accept("expert", "call")).toMatchObject({ status: "ONGOING" });
    expect(buildTrtcConfig).toHaveBeenCalledWith("expert", "room", "VOICE", 660);
    const [sql, , acceptedAt, waitingCutoff] = tx.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"createdAt">$3::timestamp(3)');
    expect(sql).toContain('"createdAt"<=$2::timestamp(3)');
    expect(Date.parse(acceptedAt) - Date.parse(waitingCutoff)).toBe(600000);
    expect(tx.$executeRawUnsafe.mock.calls[0][2]).toMatch(/Z$/);
    expect(tx.$executeRawUnsafe.mock.calls[0][0]).toContain("$2::timestamp(3)");
    expect(tx.circleMember.findFirst.mock.invocationCallOrder[0]).toBeLessThan(tx.$executeRawUnsafe.mock.invocationCallOrder[0]);
  });
  it("等待期间资格撤销，接听拒绝且不改变订单或退款", async () => {
    tx.circleMember.findFirst.mockResolvedValue(null);
    await expect(svc.accept("expert", "call")).rejects.toMatchObject({ status: 403 });
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(coin.spend).not.toHaveBeenCalled(); expect(coin.refund).not.toHaveBeenCalled();
  });
  it("圈子已删除或账户不存在，接听不认领", async () => {
    tx.$queryRaw.mockReset().mockResolvedValue([]);
    await expect(svc.accept("expert", "call")).rejects.toMatchObject({ status: 403 });
    expect(tx.circleMember.findFirst).not.toHaveBeenCalled(); expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });
  it("RTC 不可用时接听不改变 WAITING，允许继续取消", async () => {
    (buildTrtcConfig as jest.Mock).mockReturnValue({ configured: false, userSig: null });
    await expect(svc.accept("expert", "call")).rejects.toThrow("通话服务暂不可用"); expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
