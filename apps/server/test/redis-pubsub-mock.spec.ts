import { createRedisPubSubMock } from "./redis-pubsub-mock";

describe("E2E Redis 发布订阅契约", () => {
  it("仅向同一频道订阅者传递消息，返回订阅数", async () => {
    const redis = createRedisPubSubMock();
    const receive = jest.fn();
    const other = jest.fn();
    await redis.subscribe("config:reload", receive);
    await redis.subscribe("other", other);
    expect(await redis.publish("config:reload", "changed")).toBe(1);
    expect(receive).toHaveBeenCalledWith("changed");
    expect(other).not.toHaveBeenCalled();
  });

  it("退订可重复执行，模块销毁后不再接收消息", async () => {
    const redis = createRedisPubSubMock();
    const receive = jest.fn();
    const unsubscribe = await redis.subscribe("config:reload", receive);
    await unsubscribe();
    await unsubscribe();
    expect(await redis.publish("config:reload", "changed")).toBe(0);
    expect(receive).not.toHaveBeenCalled();
  });

  it("不同应用的测试替身不会串扰", async () => {
    const first = createRedisPubSubMock();
    const second = createRedisPubSubMock();
    const receive = jest.fn();
    await first.subscribe("config:reload", receive);
    expect(await second.publish("config:reload", "changed")).toBe(0);
    expect(receive).not.toHaveBeenCalled();
  });
});
