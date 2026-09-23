import { PrismaClient } from "@prisma/client";
import * as http from "http";
import { AddressInfo } from "net";
import { randomBytes } from "crypto";
import { RedisService } from "../../../redis/redis.service";
import { VoiceQuotaService } from "../voice-quota.service";
import { VoiceDeviceService } from "../voice-device.service";
import { VoiceSessionService } from "../voice-session.service";
import { VoiceContextBuilder } from "../voice-context.builder";
import { MockXiaozhiProvider } from "../provider/mock-xiaozhi.provider";
import { connectWs } from "./mini-ws";
import { XIAOZHI_WS_PATH, XiaozhiLinkService } from "./xiaozhi-link.service";
import { XiaozhiGatewayService } from "./xiaozhi-gateway.service";

/**
 * 多实例：两台热卜实例共用 Redis 与数据库，同一台设备换到另一台实例重连时，旧实例上的连接必须被关掉
 * （否则两路会话同时计时）。需要真实库与真实 Redis，默认跳过：
 * XIAOBU_IT_DATABASE_URL=<隔离库> XIAOBU_IT_REDIS_URL=redis://127.0.0.1:6379/9
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const redisUrl = process.env.XIAOBU_IT_REDIS_URL;
const run = dbUrl && redisUrl ? describe : describe.skip;

run("小智协议终端 · 多实例顶替（真实库 + 真实 Redis）", () => {
  let prisma: PrismaClient;
  const tag = `it-xzmi-${Date.now()}`;
  const alice = `${tag}-alice`;
  const MAC = Array.from(randomBytes(6)).map((b) => b.toString(16).padStart(2, "0")).join(":");
  const CID = "5a5a5a5a-1111-4222-8333-444444444444";
  const nodes: { server: http.Server; gateway: XiaozhiGatewayService; link: XiaozhiLinkService; redis: RedisService; base: string }[] = [];
  let devices: VoiceDeviceService;
  let deviceId = "";

  async function startNode() {
    const redis = new RedisService();
    const system: any = { getConfig: async () => null };
    const quota = new VoiceQuotaService(prisma as any, system);
    const provider = new MockXiaozhiProvider();
    const sessions = new VoiceSessionService(prisma as any, quota, new VoiceContextBuilder(prisma as any), provider, devices);
    const link = new XiaozhiLinkService(prisma as any, redis, devices);
    const gateway = new XiaozhiGatewayService(link, sessions, quota, prisma as any, provider, undefined, redis);
    const server = http.createServer((_req, res) => res.writeHead(404).end());
    gateway.attach(server);
    await gateway.enableCrossInstance();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const node = { server, gateway, link, redis, base: `127.0.0.1:${(server.address() as AddressInfo).port}` };
    nodes.push(node);
    return node;
  }

  const waitFor = async (fn: () => boolean, ms = 4000) => {
    const t0 = Date.now();
    while (!fn()) {
      if (Date.now() - t0 > ms) throw new Error("waitFor timeout");
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  async function connectTo(node: (typeof nodes)[number], token: string) {
    const ws = await connectWs(`ws://${node.base}${XIAOZHI_WS_PATH}`, { Authorization: `Bearer ${token}`, "Protocol-Version": "1", "Device-Id": MAC, "Client-Id": CID });
    const texts: any[] = [];
    let closed = false;
    ws.on("text", (t: string) => texts.push(JSON.parse(t)));
    ws.on("close", () => (closed = true));
    ws.sendText(JSON.stringify({ type: "hello", version: 1, transport: "websocket", audio_params: { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 } }));
    await waitFor(() => texts.some((t) => t.type === "hello"));
    return { ws, texts, isClosed: () => closed };
  }

  beforeAll(async () => {
    process.env.XIAOBU_DEVICE_PEPPER = "it-only-pepper-0123456789abcdef0123456789";
    process.env.REDIS_URL = redisUrl;
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.user.create({ data: { id: alice, nickname: "阿丽" } });
    devices = new VoiceDeviceService(prisma as any);
    const d = await devices.register("it-admin", { serial: MAC, productSku: `${tag}-sku`, clientId: CID });
    deviceId = d.id;
    await devices.bindUnboundDevice(alice, deviceId);
  });

  afterAll(async () => {
    for (const n of nodes) {
      n.gateway.onModuleDestroy();
      await new Promise((r) => n.server.close(r));
      await n.redis.onModuleDestroy();
    }
    delete process.env.REDIS_URL;
    await prisma.voiceSession.deleteMany({ where: { userId: alice } });
    await prisma.voiceDeviceBinding.deleteMany({ where: { deviceId } });
    await prisma.voiceDevice.deleteMany({ where: { id: deviceId } });
    await prisma.user.deleteMany({ where: { id: alice } });
    await prisma.$disconnect();
  });

  it("设备在实例 A 对话中，换到实例 B 重连：A 上的旧连接被关掉，B 正常；两边各自的实例标识不同", async () => {
    const A = await startNode();
    const B = await startNode();
    expect(A.gateway.instanceId).not.toBe(B.gateway.instanceId);
    // 令牌在 A 签发、存在共享 Redis，B 也认
    const token = ((await A.link.handleOta({ "device-id": MAC, "client-id": CID }, {}, A.base)) as any).websocket.token;
    expect(token).toBeTruthy();
    const onA = await connectTo(A, token);
    expect(A.gateway.activeCount()).toBe(1);
    const onB = await connectTo(B, token);
    await waitFor(() => onA.isClosed());
    await waitFor(() => A.gateway.activeCount() === 0);
    expect(B.gateway.activeCount()).toBe(1);
    expect(onB.isClosed()).toBe(false);
    onB.ws.close();
  });

  it("同一实例内的新连接不会被自己的广播误关", async () => {
    const [A] = nodes;
    const token = ((await A.link.handleOta({ "device-id": MAC, "client-id": CID }, {}, A.base)) as any).websocket.token;
    const c = await connectTo(A, token);
    await new Promise((r) => setTimeout(r, 300));
    expect(c.isClosed()).toBe(false);
    expect(A.gateway.activeCount()).toBe(1);
    c.ws.close();
  });
});
