import * as http from "http";
import { AddressInfo } from "net";
import { setAlertHandler } from "../../../common/alert";
import { WeworkService } from "../../notification/wework.service";
import { RedisService } from "../../../redis/redis.service";
import { XiaozhiAlertTask } from "./xiaozhi-ops";

/** 只使用专用 Redis DB 与本机 HTTP 接收器，不向真实企微发送。 */
const redisUrl = process.env.XIAOBU_IT_REDIS_URL;
const run = redisUrl ? describe : describe.skip;

run("小卜告警送达 · 真实 Redis 与本机 Webhook", () => {
  const bucket = Math.floor(Date.UTC(2040, 0, 1) / 300_000);
  const firstRun = (bucket + 1) * 300_000 + 30_000;
  const doneKey = `xz:alert:done:${bucket}:xz:auth_fail`;
  const pendingKey = `xz:alert:pending:${bucket}:xz:auth_fail`;
  const probeKey = `xz:alert:probe:${bucket}`;
  let server: http.Server;
  let first: RedisService;
  let second: RedisService;
  let originalRedis: string | undefined;
  let originalWebhook: string | undefined;
  let originalFetch: typeof fetch | undefined;
  let requests = 0;

  beforeAll(async () => {
    originalRedis = process.env.REDIS_URL;
    originalWebhook = process.env.WEWORK_WEBHOOK_ALERT_URL;
    originalFetch = global.fetch;
    // Jest 的 Node 沙箱未暴露全局 fetch；测试适配器仍通过真实本机 HTTP 发请求。
    global.fetch = ((url: string, init: RequestInit) => new Promise((resolve, reject) => {
      const req = http.request(url, { method: init.method, headers: init.headers as http.OutgoingHttpHeaders }, (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve({
          ok: (response.statusCode || 0) >= 200 && (response.statusCode || 0) < 300,
          status: response.statusCode,
          json: async () => JSON.parse(Buffer.concat(chunks).toString("utf8")),
        } as Response));
      });
      req.on("error", reject);
      req.end(String(init.body));
    })) as typeof fetch;
    process.env.REDIS_URL = redisUrl;
    server = http.createServer((_req, res) => {
      requests++;
      res.writeHead(requests === 1 ? 502 : 200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ errcode: 0 }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    process.env.WEWORK_WEBHOOK_ALERT_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/alert`;
    first = new RedisService();
    second = new RedisService();
    await first.set(probeKey, "real-redis", 60);
    // 如果连接失败而降级为各进程内存，此断言会失败。
    expect(await second.get(probeKey)).toBe("real-redis");
    const wework = new WeworkService();
    setAlertHandler((title, detail) => wework.notifyAlertChecked(title, detail));
  });

  afterAll(async () => {
    setAlertHandler(null);
    if (first) {
      await Promise.all([first.del(doneKey), first.del(pendingKey), first.del(probeKey)]);
      await first.onModuleDestroy();
    }
    if (second) await second.onModuleDestroy();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
    if (originalWebhook === undefined) delete process.env.WEWORK_WEBHOOK_ALERT_URL;
    else process.env.WEWORK_WEBHOOK_ALERT_URL = originalWebhook;
    if (originalFetch === undefined) delete (global as any).fetch;
    else global.fetch = originalFetch;
  });

  it("首次 HTTP 失败留待发项，下一窗口两实例竞争只发送一次", async () => {
    const link: any = { windowCounts: async (b: number) => b === bucket ? { auth_fail: 30 } : {} };
    const a = new XiaozhiAlertTask(link, first);
    const b = new XiaozhiAlertTask(link, second);
    expect(await a.run(firstRun)).toEqual([]);
    expect(requests).toBe(1);
    expect(await second.get(pendingKey)).not.toBeNull();
    const [one, two] = await Promise.all([a.run(firstRun + 300_000), b.run(firstRun + 300_000)]);
    expect([...one, ...two].map((item) => item.key)).toEqual(["xz:auth_fail"]);
    expect(requests).toBe(2);
    expect(await first.get(doneKey)).toBe("1");
    expect(await second.get(pendingKey)).toBeNull();
  });
});
