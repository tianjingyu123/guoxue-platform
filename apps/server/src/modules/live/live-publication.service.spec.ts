import { LivePublicationService } from "./live-publication.service";

describe("直播事务内管理员权限与账号复核", () => {
  const scopes = { lockScope: jest.fn() };
  const capabilities = { assertAuthorizationInTransaction: jest.fn() };
  const service = new LivePublicationService(capabilities as never, scopes as never, {} as never);
  const room = { id: "room", circleId: "circle", hostUserId: "host", status: "WAITING", auditStatus: "APPROVED", orientation: "portrait" };
  const tx = { $queryRaw: jest.fn(), $executeRaw: jest.fn(), liveRoom: {
    findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(),
  } };
  const sign = jest.fn();
  const input = { roomId: "room", operatorId: "operator", isAdmin: true, executor: "HUMAN" as const };
  const operations = {
    sign: () => service.signInTransaction(tx as never, input, sign),
    start: () => service.startInTransaction(tx as never, { ...input, obsPreflight: false, pushUrl: "", pullUrl: "", trtcRoomId: "" }),
    end: () => service.endInTransaction(tx as never, input),
  };
  beforeEach(() => {
    jest.resetAllMocks();
    tx.liveRoom.findUnique.mockResolvedValue(room);
    tx.liveRoom.updateMany.mockResolvedValue({ count: 1 });
    tx.liveRoom.findUniqueOrThrow.mockResolvedValue(room);
    tx.$queryRaw.mockResolvedValueOnce([{ id: "operator", status: "ACTIVE", deletedAt: null }])
      .mockResolvedValueOnce([{ roleType: "OPERATION_ADMIN", bindId: null }])
      .mockResolvedValueOnce([{ id: "host", status: "ACTIVE", deletedAt: null }]);
    sign.mockReturnValue({ signed: true });
  });
  for (const [name, run] of Object.entries(operations)) {
    it(`${name}：旧管理员快照在撤权后不能签发或变更状态`, async () => {
      tx.$queryRaw.mockReset().mockResolvedValueOnce([{ id: "operator", status: "ACTIVE", deletedAt: null }]).mockResolvedValueOnce([]);
      await expect(run()).rejects.toThrow("平台管理权限已变化");
      expect(sign).not.toHaveBeenCalled();
      expect(tx.liveRoom.updateMany).not.toHaveBeenCalled();
    });
    it(`${name}：圈子绑定管理员角色不视为平台管理员`, async () => {
      tx.$queryRaw.mockReset().mockResolvedValueOnce([{ id: "operator", status: "ACTIVE", deletedAt: null }])
        .mockResolvedValueOnce([{ roleType: "SUPER_ADMIN", bindId: "circle" }]);
      await expect(run()).rejects.toThrow("平台管理权限已变化");
      expect(sign).not.toHaveBeenCalled();
      expect(tx.liveRoom.updateMany).not.toHaveBeenCalled();
    });
    it(`${name}：有效平台管理员保留原有操作`, async () => {
      await expect(run()).resolves.toBeDefined();
      expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.$queryRaw.mock.invocationCallOrder[0]);
      expect(capabilities.assertAuthorizationInTransaction).not.toHaveBeenCalled();
    });
    for (const account of [{ status: "DISABLED", deletedAt: null }, { status: "ACTIVE", deletedAt: new Date() }]) {
      it(`${name}：停用或软删除账号不可继续使用管理员豁免 ${account.status}/${!!account.deletedAt}`, async () => {
        tx.$queryRaw.mockReset().mockResolvedValue([{ id: "operator", ...account }]);
        await expect(run()).rejects.toThrow("发布操作账号不可用");
        expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
        expect(sign).not.toHaveBeenCalled();
        expect(tx.liveRoom.updateMany).not.toHaveBeenCalled();
      });
    }
  }
  it("主播失去发布资格后仍能下播，不重新要求发布额度", async () => {
    tx.$queryRaw.mockReset().mockResolvedValue([{ id: "host", status: "ACTIVE", deletedAt: null }]);
    await expect(service.endInTransaction(tx as never, { ...input, operatorId: "host", isAdmin: false })).resolves.toMatchObject({ changed: true });
    expect(capabilities.assertAuthorizationInTransaction).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it("RTC 主播或嘉宾软删除后不能继续领取发流票据", async () => {
    tx.liveRoom.findUnique.mockResolvedValue({ ...room, status: "LIVING", trtcRoomId: "room" });
    tx.$queryRaw.mockReset().mockResolvedValue([
      { id: "host", status: "ACTIVE", deletedAt: null },
      { id: "guest", status: "ACTIVE", deletedAt: new Date() },
    ]);
    await expect(service.rtcInTransaction(tx as never, { roomId: "room", userId: "guest", executor: "HUMAN" }, sign))
      .rejects.toThrow("直播参与账号不可用");
    expect(sign).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
  for (const operation of ["sign", "start"] as const) {
    it(`${operation}：管理员不能代已停用主播取得新的媒体能力`, async () => {
      tx.$queryRaw.mockReset().mockResolvedValueOnce([{ id: "operator", status: "ACTIVE", deletedAt: null }])
        .mockResolvedValueOnce([{ roleType: "OPERATION_ADMIN", bindId: null }])
        .mockResolvedValueOnce([{ id: "host", status: "DISABLED", deletedAt: null }]);
      await expect(operations[operation]()).rejects.toThrow("发布操作账号不可用");
      expect(sign).not.toHaveBeenCalled();
      expect(tx.liveRoom.updateMany).not.toHaveBeenCalled();
    });
  }
});

describe("直播预告发布事务接线", () => {
  const capabilities = { assertAuthorizationInTransaction: jest.fn() };
  const scopes = { lockScope: jest.fn() };
  const tx = { circle: { findUnique: jest.fn() } };
  const write = jest.fn();
  const service = new LivePublicationService(capabilities as never, scopes as never, {} as never);
  const input = { circleId: "circle", userId: "host", hostUserId: "host", executor: "HUMAN" as const };
  beforeEach(() => {
    jest.resetAllMocks();
    tx.circle.findUnique.mockResolvedValue({ ownerId: "host" });
    write.mockResolvedValue({ id: "live" });
  });
  it("圈主在同一事务核对圈级 LIVE 资格后才创建", async () => {
    await expect(service.createInTransaction(tx as never, input, write)).resolves.toEqual({ id: "live" });
    expect(scopes.lockScope).toHaveBeenCalledWith(tx, "circle");
    expect(capabilities.assertAuthorizationInTransaction).toHaveBeenCalledWith(tx, "circle", "LIVE", { userId: "host", executor: "HUMAN" }, null);
    expect(scopes.lockScope.mock.invocationCallOrder[0]).toBeLessThan(tx.circle.findUnique.mock.invocationCallOrder[0]);
    expect(capabilities.assertAuthorizationInTransaction.mock.invocationCallOrder[0]).toBeLessThan(write.mock.invocationCallOrder[0]);
  });
  it("非圈主按个人直授主体核对，而不是静态成员角色", async () => {
    tx.circle.findUnique.mockResolvedValue({ ownerId: "another-owner" });
    await service.createInTransaction(tx as never, input, write);
    expect(capabilities.assertAuthorizationInTransaction).toHaveBeenCalledWith(tx, "circle", "LIVE", { userId: "host", executor: "HUMAN" }, "host");
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("授权失效不得创建或降级到旧审批", async () => {
    capabilities.assertAuthorizationInTransaction.mockRejectedValue(new Error("REVOKED"));
    await expect(service.createInTransaction(tx as never, input, write)).rejects.toThrow("REVOKED");
    expect(write).not.toHaveBeenCalled();
  });
  it("不允许把本人资格转给其他主播", async () => {
    await expect(service.createInTransaction(tx as never, { ...input, hostUserId: "other" }, write)).rejects.toThrow("其他主播");
    expect(scopes.lockScope).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("无圈子不产生游离授权业务", async () => {
    await expect(service.createInTransaction(tx as never, { ...input, circleId: undefined }, write)).rejects.toThrow("选择已获授权");
    expect(write).not.toHaveBeenCalled();
  });
  it("圈子已删除不创建", async () => {
    tx.circle.findUnique.mockResolvedValue(null);
    await expect(service.createInTransaction(tx as never, input, write)).rejects.toThrow("圈子不存在");
    expect(write).not.toHaveBeenCalled();
  });
  it("自动化不能经内部入口外发", async () => {
    await expect(service.createInTransaction(tx as never, { ...input, executor: "AUTOMATION" }, write)).rejects.toThrow();
    expect(scopes.lockScope).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("业务或审核失败向外传播以便主事务回滚，不吞错重试", async () => {
    write.mockRejectedValue(new Error("AUDIT_WRITE_FAILED"));
    await expect(service.createInTransaction(tx as never, input, write)).rejects.toThrow("AUDIT_WRITE_FAILED");
    expect(write).toHaveBeenCalledTimes(1);
  });
});
