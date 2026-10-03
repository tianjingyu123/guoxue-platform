import { __resetAlertThrottle, setAlertHandler } from "../../../common/alert";
import { RedisService } from "../../../redis/redis.service";
import { ALERT_RULES, XiaozhiAlertTask, evaluateXiaozhiAlerts, xiaozhiReadiness } from "./xiaozhi-ops";

describe("小智协议终端 · 上线配置体检", () => {
  const good = {
    REDIS_URL: "redis://secret-host:6379",
    XIAOBU_DEVICE_PEPPER: "p".repeat(40),
    XIAOBU_MEDIA_URL_SECRET: "m".repeat(40),
    XIAOZHI_WS_PUBLIC_URL: "wss://api.example.com/api/v1/xiaozhi/ws",
    XIAOZHI_PUBLIC_BASE_URL: "https://api.example.com",
    WEWORK_WEBHOOK_ALERT_URL: "https://example.com/alert",
  };

  it("配置齐全、真实供应商：无缺项", () => {
    expect(xiaozhiReadiness(good, false)).toEqual([]);
  });

  it("逐项缺失各报一条，级别正确；输出不含任何配置值", () => {
    const cases: [Record<string, string | undefined>, boolean, RegExp, "error" | "warn"][] = [
      [{ ...good, REDIS_URL: undefined }, false, /Redis/, "error"],
      [{ ...good, XIAOBU_DEVICE_PEPPER: "short" }, false, /XIAOBU_DEVICE_PEPPER/, "error"],
      [{ ...good, XIAOBU_MEDIA_URL_SECRET: undefined }, false, /XIAOBU_MEDIA_URL_SECRET/, "error"],
      [{ ...good, XIAOZHI_WS_PUBLIC_URL: undefined }, false, /XIAOZHI_WS_PUBLIC_URL/, "warn"],
      [{ ...good, XIAOZHI_WS_PUBLIC_URL: "ws://api.example.com/x" }, false, /不是 wss/, "warn"],
      [{ ...good, XIAOZHI_PUBLIC_BASE_URL: "http://api.example.com" }, false, /不是 https/, "warn"],
      [good, true, /模拟/, "error"],
      [{ ...good, WEWORK_WEBHOOK_ALERT_URL: undefined }, false, /告警 Webhook/, "warn"],
    ];
    for (const [env, mock, re, level] of cases) {
      const r = xiaozhiReadiness(env as NodeJS.ProcessEnv, mock);
      expect(r).toHaveLength(1);
      expect(r[0].item).toMatch(re);
      expect(r[0].level).toBe(level);
      expect(JSON.stringify(r)).not.toMatch(/secret-host|pppp|mmmm|short/);
    }
  });

  it("Redis Sentinel 连接也满足共享缓存配置", () => {
    expect(xiaozhiReadiness({ ...good, REDIS_URL: undefined, REDIS_SENTINEL_HOSTS: "redis.example.com:26379" }, false)).toEqual([]);
  });
});

describe("小智协议终端 · 告警阈值", () => {
  it("每条规则在阈值处触发、阈值减一不触发", () => {
    const single: [string, number, string][] = [
      ["auth_fail", ALERT_RULES.authFail, "xz:auth_fail"],
      ["identity_mismatch", ALERT_RULES.identityMismatch, "xz:identity"],
      ["ota_throttled", ALERT_RULES.otaThrottled, "xz:throttled"],
      ["end:session_rejected", ALERT_RULES.sessionRejected, "xz:rejected"],
    ];
    for (const [k, t, key] of single) {
      expect(evaluateXiaozhiAlerts({ [k]: t - 1 }, 0)).toEqual([]);
      expect(evaluateXiaozhiAlerts({ [k]: t }, 0).map((a) => a.key)).toEqual([key]);
    }
    expect(evaluateXiaozhiAlerts({}, ALERT_RULES.firmwareFailedPerHour - 1)).toEqual([]);
    expect(evaluateXiaozhiAlerts({}, ALERT_RULES.firmwareFailedPerHour).map((a) => a.key)).toEqual(["xz:firmware"]);
  });

  it("语音服务异常同时看次数与占比：连接多时零星失败不报，失败占比高才报", () => {
    expect(evaluateXiaozhiAlerts({ ws_open: 100, "end:relay_failed": 5 }, 0)).toEqual([]); // 5%
    expect(evaluateXiaozhiAlerts({ ws_open: 10, "end:provider_error": 4 }, 0)).toEqual([]); // 次数不够
    const a = evaluateXiaozhiAlerts({ ws_open: 20, "end:relay_failed": 2, "end:provider_error": 2, "end:provider_unavailable": 1 }, 0);
    expect(a.map((x) => x.key)).toEqual(["xz:voice"]);
    expect(a[0].detail).toMatch(/25%/);
  });
});

describe("小智协议终端 · 告警任务", () => {
  const sent: string[] = [];
  beforeAll(() => {
    delete process.env.REDIS_URL;
    setAlertHandler((title) => sent.push(title));
  });
  afterAll(() => setAlertHandler(null));

  it("取上一个 5 分钟窗口的计数发告警；同一窗口只评估一次（多实例不重复）", async () => {
    __resetAlertThrottle();
    const redis = new RedisService();
    const now = Date.UTC(2026, 8, 22, 8, 5, 30);
    const asked: number[] = [];
    const link: any = { windowCounts: async (b: number) => (asked.push(b), { identity_mismatch: 12 }) };
    const prisma: any = { voiceFirmwareDeviceState: { count: async () => 0 } };
    const a = new XiaozhiAlertTask(link, redis, prisma);
    const b = new XiaozhiAlertTask(link, redis, prisma);
    const r1 = await a.run(now);
    const r2 = await b.run(now + 1000);
    // 两实例可各自读取；只有抢到窗口标记的实例会发送。
    expect(asked).toEqual([Math.floor(now / 300_000) - 1, Math.floor(now / 300_000) - 1]);
    expect(r1.map((x) => x.key)).toEqual(["xz:identity"]);
    expect(r2).toEqual([]);
    expect(sent).toEqual(["小卜硬件：设备身份不符激增"]);
  });

  it("计数读取失败不占用窗口，恢复后仍能发送告警", async () => {
    __resetAlertThrottle();
    sent.length = 0;
    const redis = new RedisService();
    const now = Date.UTC(2026, 8, 22, 8, 10, 30);
    let fail = true;
    const link: any = { windowCounts: async () => {
      if (fail) throw new Error("temporary read failure");
      return { auth_fail: ALERT_RULES.authFail };
    } };
    const task = new XiaozhiAlertTask(link, redis);
    expect(await task.run(now)).toEqual([]);
    fail = false;
    expect((await task.run(now)).map((a) => a.key)).toEqual(["xz:auth_fail"]);
    expect(sent).toEqual(["小卜硬件：连接鉴权失败激增"]);
  });

  it("Webhook 失败后下一分钟补发，已送达的另一条不重复", async () => {
    sent.length = 0;
    const redis = new RedisService();
    const now = Date.UTC(2026, 8, 22, 8, 15, 30);
    const link: any = { windowCounts: async () => ({ auth_fail: 30, identity_mismatch: 10 }) };
    let fail = true;
    setAlertHandler(async (title) => {
      if (fail && title.includes("身份不符")) throw new Error("webhook down");
      sent.push(title);
    });
    const task = new XiaozhiAlertTask(link, redis);
    expect((await task.run(now)).map((a) => a.key)).toEqual(["xz:auth_fail"]);
    fail = false;
    expect((await task.run(now + 60_000)).map((a) => a.key)).toEqual(["xz:identity"]);
    expect(sent).toEqual(["小卜硬件：连接鉴权失败激增", "小卜硬件：设备身份不符激增"]);
  });

  it("跨五分钟窗口补发；本轮计数读取失败也能发送历史待发项", async () => {
    sent.length = 0;
    const redis = new RedisService();
    const batchRead = jest.spyOn(redis, "mgetJson");
    const now = Date.UTC(2026, 8, 22, 8, 20, 30);
    const firstBucket = Math.floor(now / 300_000) - 1;
    let failDelivery = true;
    let failRead = false;
    setAlertHandler(async (title) => {
      if (failDelivery) throw new Error("temporary outage");
      sent.push(title);
    });
    const link: any = { windowCounts: async (bucket: number) => {
      if (failRead) throw new Error("read unavailable");
      return bucket === firstBucket ? { auth_fail: 30 } : {};
    } };
    const task = new XiaozhiAlertTask(link, redis);
    expect(await task.run(now)).toEqual([]);
    expect(await redis.get(`xz:alert:pending:${firstBucket}:xz:auth_fail`)).not.toBeNull();
    failDelivery = false;
    failRead = true;
    expect((await task.run(now + 5 * 60_000)).map((a) => a.key)).toEqual(["xz:auth_fail"]);
    expect(batchRead).toHaveBeenCalledTimes(2);
    failRead = false;
    expect(await task.run(now + 6 * 60_000)).toEqual([]);
    expect(sent).toEqual(["小卜硬件：连接鉴权失败激增"]);
  });
});
