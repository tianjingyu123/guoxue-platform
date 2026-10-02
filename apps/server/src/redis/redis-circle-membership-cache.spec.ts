import { RedisService } from "./redis.service";

describe("成员缓存清理必须使用共享Redis", () => {
  const targets = [{ circleId: "synthetic-circle", userId: "synthetic-user" }];
  const create = (conn: unknown) => {
    // 不调用构造器，不读取本机Redis配置，也不连接共享服务。
    const service = Object.create(RedisService.prototype) as RedisService;
    Object.assign(service, { getConn: jest.fn().mockResolvedValue(conn) });
    return service;
  };
  it("没有共享连接时拒绝，不能以内存清理成功确认待办", async () => {
    await expect(create(null).clearCircleMembershipShared(targets)).rejects.toThrow(
      "共享 Redis 不可用",
    );
  });
  it("DEL失败不继续确认", async () => {
    const conn = {
      ping: jest.fn().mockResolvedValue("PONG"),
      del: jest.fn().mockRejectedValue(new Error("synthetic DEL failure")),
      scanStream: jest.fn(),
    };
    await expect(create(conn).clearCircleMembershipShared(targets)).rejects.toThrow(
      "synthetic DEL failure",
    );
    expect(conn.scanStream).not.toHaveBeenCalled();
  });
  it("列表SCAN中断也拒绝完成", async () => {
    const conn = {
      ping: jest.fn().mockResolvedValue("PONG"),
      del: jest.fn().mockResolvedValue(1),
      scanStream: async function* () {
        yield ["circles:list:synthetic"];
        throw new Error("synthetic SCAN failure");
      },
    };
    await expect(create(conn).clearCircleMembershipShared(targets)).rejects.toThrow(
      "synthetic SCAN failure",
    );
  });
  it("同一共享连接清理成员、详情及所有列表页，每批只扫描一次", async () => {
    const conn = {
      ping: jest.fn().mockResolvedValue("PONG"),
      del: jest.fn().mockResolvedValue(1),
      scanStream: jest.fn(async function* () {
        yield [];
        yield ["circles:list:a", "circles:list:b"];
        yield ["circles:list:c"];
      }),
    };
    await create(conn).clearCircleMembershipShared([...targets, ...targets]);
    expect(conn.del.mock.calls).toEqual([
      ["circles:member:synthetic-circle:synthetic-user", "circles:detail:synthetic-circle"],
      ["circles:list:a", "circles:list:b"],
      ["circles:list:c"],
    ]);
    expect(conn.scanStream).toHaveBeenCalledTimes(1);
  });
  it("空批次不建立连接", async () => {
    const service = create(null);
    await expect(service.clearCircleMembershipShared([])).resolves.toBeUndefined();
  });
});
