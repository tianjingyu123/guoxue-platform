import { PrismaClient } from "@prisma/client";
import * as http from "http";
import { AddressInfo } from "net";
import { RedisService } from "../../../redis/redis.service";
import { VoiceQuotaService } from "../voice-quota.service";
import { VoiceDeviceService } from "../voice-device.service";
import { VoiceSessionService } from "../voice-session.service";
import { VoiceContextBuilder } from "../voice-context.builder";
import { MockXiaozhiProvider } from "../provider/mock-xiaozhi.provider";
import { UnavailableXiaozhiProvider } from "../provider/unavailable-xiaozhi.provider";
import { MiniWsConnection, connectWs } from "./mini-ws";
import { XIAOZHI_WS_PATH, XiaozhiLinkService } from "./xiaozhi-link.service";
import { XiaozhiGatewayService } from "./xiaozhi-gateway.service";
import { packAudio, unpackAudio } from "./xiaozhi-protocol";

/**
 * 小智协议终端 · Mock 契约测试（真实库 + 真实 HTTP/WebSocket + 模拟设备；默认跳过）
 * XIAOBU_IT_DATABASE_URL=<隔离库>
 *
 * 模拟设备按开源固件的报文收发（OTA → 激活码 → 激活轮询 → 取令牌 → WebSocket hello → listen → Opus 帧），
 * 供应商是 MockXiaozhiProvider（回放）。**通过只说明协议与业务编排正确，不代表真实语音接通。**
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("小智协议终端 · Mock 契约（真实库）", () => {
  let prisma: PrismaClient;
  let server: http.Server;
  let base = "";
  let link: XiaozhiLinkService;
  let gateway: XiaozhiGatewayService;
  let provider: MockXiaozhiProvider;
  let devices: VoiceDeviceService;
  let sessions: VoiceSessionService;
  const tag = `it-xz-${Date.now()}`;
  const alice = `${tag}-alice`;
  const bob = `${tag}-bob`;
  const MAC = "a1:b2:c3:d4:e5:f6";
  const UNKNOWN_MAC = "0a:0b:0c:0d:0e:0f";
  let deviceId = "";

  const otaBody = { version: 2, chip_model_name: "esp32s3", application: { name: "xiaozhi", version: "1.9.2", idf_version: "v5.4" }, board: { type: "bread-compact-wifi", name: "bread", ssid: "home", ip: "192.168.1.8" } };

  function http_(method: string, path: string, headers: Record<string, string>, body?: unknown) {
    return new Promise<{ status: number; text: string }>((resolve, reject) => {
      const req = http.request(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...headers } }, (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, text }));
      });
      req.on("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  const ota = (mac = MAC) => link.handleOta({ "device-id": mac, "client-id": "11111111-2222-3333-4444-555555555555", "user-agent": "bread/1.9.2" }, otaBody, base.replace("http://", ""));

  /** 模拟设备：收集文本与二进制 */
  async function device(token: string, mac = MAC, version = "1") {
    const ws = await connectWs(`${base.replace("http", "ws")}${XIAOZHI_WS_PATH}`, {
      Authorization: `Bearer ${token}`, "Protocol-Version": version, "Device-Id": mac, "Client-Id": "11111111-2222-3333-4444-555555555555",
    });
    const texts: any[] = [];
    const bins: Buffer[] = [];
    ws.on("text", (t: string) => texts.push(JSON.parse(t)));
    ws.on("binary", (b: Buffer) => bins.push(b));
    return { ws, texts, bins };
  }
  const waitFor = async (fn: () => boolean, ms = 3000) => {
    const t0 = Date.now();
    while (!fn()) {
      if (Date.now() - t0 > ms) throw new Error("waitFor timeout");
      await new Promise((r) => setTimeout(r, 20));
    }
  };
  const hello = (ws: MiniWsConnection) =>
    ws.sendText(JSON.stringify({ type: "hello", version: 1, features: { mcp: true }, transport: "websocket", audio_params: { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 } }));
  const speakOnce = (ws: MiniWsConnection, sid: string, n = 8, version: 1 | 2 | 3 = 1) => {
    ws.sendText(JSON.stringify({ session_id: sid, type: "listen", state: "start", mode: "auto" }));
    for (let i = 0; i < n; i++) ws.sendBinary(packAudio(Buffer.alloc(40, i + 1), version, i * 60));
    for (let i = 0; i < 13; i++) ws.sendBinary(packAudio(Buffer.alloc(3, 0), version, (n + i) * 60));
  };

  beforeAll(async () => {
    process.env.XIAOBU_DEVICE_PEPPER = "it-only-pepper-0123456789abcdef0123456789";
    process.env.XIAOZHI_ACTIVATION_CODE_LENGTH = "6";
    delete process.env.XIAOZHI_WS_PUBLIC_URL;
    delete process.env.REDIS_URL;
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.user.createMany({ data: [{ id: alice, nickname: "阿丽" }, { id: bob, nickname: "阿波" }] });
    const redis = new RedisService();
    const system: any = { getConfig: async () => null }; // 缺省计费配置：不收费，单次 180 秒体验
    const quota = new VoiceQuotaService(prisma as any, system);
    devices = new VoiceDeviceService(prisma as any);
    provider = new MockXiaozhiProvider();
    sessions = new VoiceSessionService(prisma as any, quota, new VoiceContextBuilder(prisma as any), provider, devices);
    link = new XiaozhiLinkService(prisma as any, redis, devices);
    gateway = new XiaozhiGatewayService(link, sessions, quota, prisma as any, provider);
    // 与线上一致：Nest 的 HTTP 路由由 OTA 控制器承担，这里直接把 OTA/激活挂成最小 HTTP 处理
    server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      if (req.url === "/api/v1/xiaozhi/ota/") {
        const out = await link.handleOta(req.headers as any, body, req.headers.host);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
      } else if (req.url === "/api/v1/xiaozhi/ota/activate") {
        const { status } = await link.handleActivate(req.headers as any);
        res.writeHead(status).end("{}");
      } else res.writeHead(404).end("{}");
    });
    gateway.attach(server);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const d = await devices.register("it-admin", { serial: MAC, productSku: `${tag}-sku` });
    deviceId = d.id;
  });

  afterAll(async () => {
    gateway.onModuleDestroy();
    await new Promise((r) => server.close(r));
    await prisma.voiceSession.deleteMany({ where: { userId: { in: [alice, bob] } } });
    await prisma.voiceDeviceTransfer.deleteMany({ where: { deviceId } });
    await prisma.voiceDeviceBinding.deleteMany({ where: { deviceId } });
    await prisma.voiceDevice.deleteMany({ where: { productSku: `${tag}-sku` } });
    const acc = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { in: [alice, bob] } } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: acc.map((a) => a.id) } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: acc.map((a) => a.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: [alice, bob] } } });
    await prisma.$disconnect();
  });

  it("未登记终端：不给令牌也不给激活码，但仍下发热卜地址（不会回退到官方云）；后台能看到型号/芯片/固件", async () => {
    const r: any = await ota(UNKNOWN_MAC);
    expect(r.websocket.url).toContain(XIAOZHI_WS_PATH);
    expect(r.websocket.token).toBe("");
    expect(r.activation.code).toBeUndefined();
    expect(r.activation.challenge).toBeUndefined();
    expect(r.firmware).toEqual({ version: "1.9.2", url: "" }); // 不推送固件
    const seen = await link.listSeen();
    const me = seen.find((s: any) => s.serialHint === "0E0F")!;
    expect(me).toMatchObject({ registered: false, canRegister: true, info: { chipModel: "esp32s3", firmwareVersion: "1.9.2", boardType: "bread-compact-wifi" } });
    expect(JSON.stringify(seen)).not.toMatch(/0A0B0C0D0E0F|0a:0b|192\.168|home/); // 列表不含明文 MAC 与网络信息
  });

  it("已登记未绑定：下发 6 位激活码（设备逐位播报）；激活轮询 202；用户输入激活码绑定后 200；再次 OTA 拿到令牌", async () => {
    const r: any = await ota();
    expect(r.activation.code).toMatch(/^\d{6}$/);
    expect(r.activation.challenge).toBeTruthy();
    expect(r.websocket.token).toBe("");
    expect((await ota() as any).activation.code).toBe(r.activation.code); // 有效期内复用同一码
    expect((await http_("POST", "/api/v1/xiaozhi/ota/activate", { "Device-Id": MAC })).status).toBe(202);
    await expect(link.bindByActivationCode(alice, "000000" === r.activation.code ? "111111" : "000000")).rejects.toThrow(/无效或已过期/);
    const view = await link.bindByActivationCode(alice, r.activation.code);
    expect(view).toMatchObject({ status: "bound", bindingVersion: 1 });
    await expect(link.bindByActivationCode(bob, r.activation.code)).rejects.toThrow(/无效或已过期/); // 用后即废
    expect((await http_("POST", "/api/v1/xiaozhi/ota/activate", { "Device-Id": MAC })).status).toBe(200);
    const again: any = await ota();
    expect(again.activation).toBeUndefined();
    expect(again.websocket.token.length).toBeGreaterThan(30);
    // 令牌与激活码只存哈希：库里、Redis 键名里都找不到明文
    const row = await prisma.voiceDevice.findUniqueOrThrow({ where: { id: deviceId } });
    expect(JSON.stringify(row)).not.toContain(again.websocket.token);
  });

  it("握手鉴权：无令牌、错令牌、令牌配错设备一律 401；OTA 重新签发后旧令牌作废", async () => {
    const t1 = (await ota() as any).websocket.token;
    await expect(device("")).rejects.toMatchObject({ status: 401 });
    await expect(device("bogus")).rejects.toMatchObject({ status: 401 });
    await expect(device(t1, UNKNOWN_MAC)).rejects.toMatchObject({ status: 401 });
    const t2 = (await ota() as any).websocket.token;
    await expect(device(t1)).rejects.toMatchObject({ status: 401 });
    const ok = await device(t2);
    ok.ws.close();
  });

  it("完整一轮（Mock 回放）：hello → 服务端 hello（下行参数=上行）→ 说话 → 模拟 stt → tts 开始/字幕 → 回放原帧 → tts 结束；会话记为模拟", async () => {
    const token = (await ota() as any).websocket.token;
    const d = await device(token);
    hello(d.ws);
    await waitFor(() => d.texts.some((t) => t.type === "hello"));
    const sh = d.texts.find((t) => t.type === "hello");
    expect(sh).toMatchObject({ transport: "websocket", audio_params: { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 } });
    expect(typeof sh.session_id).toBe("string");
    speakOnce(d.ws, sh.session_id, 8);
    await waitFor(() => d.texts.some((t) => t.type === "tts" && t.state === "stop"));
    const types = d.texts.map((t) => (t.type === "tts" ? `tts:${t.state}` : t.type));
    expect(types).toEqual(["hello", "stt", "llm", "tts:start", "tts:sentence_start", "tts:stop"]);
    expect(d.texts.find((t) => t.type === "stt").text).toMatch(/模拟/);
    expect(d.texts.every((t) => t.session_id === sh.session_id)).toBe(true);
    expect(d.bins.map((b) => b[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // 原帧回放，尾部静音已裁
    expect(d.bins.every((b) => b.length === 40)).toBe(true);
    // 会话：以绑定用户身份建立、挂在设备与当前绑定代次上、标记模拟
    const s = await prisma.voiceSession.findFirstOrThrow({ where: { userId: alice, deviceId }, orderBy: { startedAt: "desc" } });
    expect(s).toMatchObject({ scene: "device", providerIsMock: true, deviceBindingVersion: 1, status: "active" });
    const closed = new Promise((r) => d.ws.once("close", r));
    d.ws.close(1000, "bye");
    await closed;
    await waitFor(() => false, 300).catch(() => undefined);
    // 供应商声明支持用量回调：设备挂断后会话进入 ending，等供应商回调真实用量（不自行估算）
    const ending = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(ending.status).toBe("ending");
    const cb = provider.buildCallback({ eventId: `${tag}-usage`, providerSessionId: ending.providerSessionId!, correlationId: ending.requestId, usedSeconds: 3, isFinal: true });
    await sessions.handleUsageCallback("mock", cb.headers, cb.rawBody);
    const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.id } });
    expect(ended.status).toBe("ended");
    expect(ended.usageState).toBe("mock"); // 模拟会话不计真实用量
    expect(ended.usedSeconds).toBe(3);
  });

  it("连续对话 + 打断：第二轮回放中途 abort 立即停止下发；v2 二进制帧头往返正确", async () => {
    const token = (await ota() as any).websocket.token;
    const d = await device(token, MAC, "2");
    hello(d.ws);
    await waitFor(() => d.texts.some((t) => t.type === "hello"));
    const sid = d.texts[0].session_id;
    speakOnce(d.ws, sid, 4, 2);
    await waitFor(() => d.texts.filter((t) => t.type === "tts" && t.state === "stop").length === 1);
    expect(d.bins.map((b) => unpackAudio(b, 2)!.payload[0])).toEqual([1, 2, 3, 4]);
    d.bins.length = 0;
    speakOnce(d.ws, sid, 40, 2);
    await waitFor(() => d.bins.length >= 3);
    d.ws.sendText(JSON.stringify({ session_id: sid, type: "abort", reason: "wake_word_detected" }));
    await waitFor(() => d.texts.filter((t) => t.type === "tts" && t.state === "stop").length === 2);
    const n = d.bins.length;
    await new Promise((r) => setTimeout(r, 400));
    expect(d.bins.length).toBe(n);
    expect(n).toBeLessThan(40);
    d.ws.close();
  });

  it("断线重连：同一设备新连接顶掉旧连接；旧会话收尾，新会话照常", async () => {
    const token = (await ota() as any).websocket.token;
    const a = await device(token);
    hello(a.ws);
    await waitFor(() => a.texts.some((t) => t.type === "hello"));
    const aClosed = new Promise((r) => a.ws.once("close", r));
    const b = await device(token);
    await aClosed;
    hello(b.ws);
    await waitFor(() => b.texts.some((t) => t.type === "hello"));
    expect(gateway.activeCount()).toBe(1);
    b.ws.close();
  });

  it("换主人：转赠给新用户后旧令牌 401；新主人重新取令牌可用，且看不到旧主人的设备历史", async () => {
    const oldToken = (await ota() as any).websocket.token;
    const { transferCode } = await devices.initiateTransfer(alice, deviceId);
    await devices.acceptTransfer(bob, transferCode);
    await expect(device(oldToken)).rejects.toMatchObject({ status: 401 });
    const newToken = (await ota() as any).websocket.token;
    const d = await device(newToken);
    hello(d.ws);
    await waitFor(() => d.texts.some((t) => t.type === "hello"));
    d.ws.close();
    await new Promise((r) => setTimeout(r, 200));
    const hist = await devices.history(bob, deviceId);
    expect(hist.length).toBeGreaterThan(0);
    const ids = new Set((await prisma.voiceSession.findMany({ where: { userId: alice, deviceId }, select: { id: true } })).map((x) => x.id));
    expect(hist.some((h: any) => ids.has(h.id))).toBe(false);
    await expect(devices.history(alice, deviceId)).rejects.toThrow(/不存在/);
  });

  it("停用与解绑：停用后令牌立即 401；恢复后可用；解绑后 401 且 OTA 重新下发激活码", async () => {
    const token = (await ota() as any).websocket.token;
    await devices.disable("it-admin", deviceId, "测试停用");
    await expect(device(token)).rejects.toMatchObject({ status: 401 });
    expect((await ota() as any).websocket.token).toBe("");
    await devices.enable("it-admin", deviceId);
    const t2 = (await ota() as any).websocket.token;
    (await device(t2)).ws.close();
    await devices.unbind(bob, deviceId);
    await expect(device(t2)).rejects.toMatchObject({ status: 401 });
    expect((await ota() as any).activation.code).toMatch(/^\d{6}$/);
  });

  it("供应商不支持设备中继（暂未开放）：先完成 hello 再提示并结束，不伪造对话、不建会话", async () => {
    const r: any = await ota();
    await link.bindByActivationCode(alice, r.activation.code);
    const token = (await ota() as any).websocket.token;
    (gateway as any).provider = new UnavailableXiaozhiProvider();
    // 会话编排用的也是同一个「暂未开放」供应商
    const quota = new VoiceQuotaService(prisma as any, { getConfig: async () => null } as any);
    (gateway as any).sessions = new VoiceSessionService(prisma as any, quota, new VoiceContextBuilder(prisma as any), (gateway as any).provider, devices);
    const before = await prisma.voiceSession.count({ where: { deviceId } });
    const d = await device(token);
    const closed = new Promise((res) => d.ws.once("close", res));
    hello(d.ws);
    await closed;
    expect(d.texts.map((t) => t.type)).toEqual(["hello", "alert"]);
    expect(d.texts[1].message).toMatch(/待开通|暂未开放/);
    expect(d.bins).toHaveLength(0);
    expect(await prisma.voiceSession.count({ where: { deviceId } })).toBe(before);
    (gateway as any).provider = provider;
  });
});
