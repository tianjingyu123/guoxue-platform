import { RedisService } from "./redis.service";

describe("持久待办使用的共享Redis扫描删除", () => {
  function service(conn: unknown): RedisService {
    const redis = Object.create(RedisService.prototype) as RedisService;
    Object.defineProperty(redis, "getConn", { value: jest.fn(async () => conn) });
    return redis;
  }

  it("共享连接缺失时拒绝，不使用进程内缓存冒充完成", async () => {
    await expect(service(null).delByPatternShared("courses:list:*")).rejects.toThrow("共享 Redis 不可用");
  });

  it("遍历全部非空批次并等待删除完成", async () => {
    const del = jest.fn(async () => 1);
    const scanStream = jest.fn(async function* () { yield ["courses:list:a"]; yield []; yield ["courses:list:b", "courses:list:c"]; });
    await service({ del, scanStream }).delByPatternShared("courses:list:*");
    expect(scanStream).toHaveBeenCalledWith({ match: "courses:list:*", count: 100 });
    expect(del.mock.calls).toEqual([["courses:list:a"], ["courses:list:b", "courses:list:c"]]);
  });

  it("扫描中途失败继续向调用者抛出，允许保留数据库待办", async () => {
    const del = jest.fn(async () => 1);
    const scanStream = async function* () { yield ["courses:list:a"]; throw new Error("合成扫描失败"); };
    await expect(service({ del, scanStream }).delByPatternShared("courses:list:*")).rejects.toThrow("合成扫描失败");
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("删除失败继续向调用者抛出", async () => {
    const del = jest.fn(async () => { throw new Error("合成删除失败"); });
    const scanStream = async function* () { yield ["courses:list:a"]; };
    await expect(service({ del, scanStream }).delByPatternShared("courses:list:*")).rejects.toThrow("合成删除失败");
  });
});
