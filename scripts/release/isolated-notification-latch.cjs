// 仅挂载到隔离验证容器；不进入业务源码包或正式镜像。
const assert = require("node:assert/strict");
assert.equal(process.env.REBU_ISOLATED_NOTIFICATION_LATCH, "1");
assert.ok(process.env.RELEASE_ID.startsWith("isolated-"));
const { RedisService } = require("/app/apps/server/dist/redis/redis.service");
const original = RedisService.prototype.getJson;
RedisService.prototype.getJson = async function (key, ...args) {
  if (key === "notification:prefs:linux-user-latency" && await this.get("isolated:notification-latch:hold") === "1") {
    await this.set("isolated:notification-latch:entered", "1", 60);
    const deadline = Date.now() + 30000;
    while (await this.get("isolated:notification-latch:hold") === "1") {
      if (Date.now() > deadline) throw new Error("隔离通知等待未释放");
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await this.set("isolated:notification-latch:done", "1", 60);
  }
  return original.call(this, key, ...args);
};
