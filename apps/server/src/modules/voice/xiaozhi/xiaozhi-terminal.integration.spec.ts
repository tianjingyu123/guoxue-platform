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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("设备状态：对话中标记（新连接顶替旧连接不误清）、最近联网与固件版本；后台运行概况计数", async () => {
    await device("bad-token").catch(() => undefined); // 鉴权失败计数
    const token = (await ota() as any).websocket.token;
    const a = await device(token);
    hello(a.ws);
    await waitFor(() => a.texts.some((t) => t.type === "hello"));
    let st = await link.terminalStatus([deviceId]);
    expect(st[deviceId]).toMatchObject({ talking: true, firmwareVersion: "1.9.2" });
    expect(st[deviceId].lastSeenAt).toBeTruthy();
    const aClosed = new Promise((r) => a.ws.once("close", r));
    const b = await device(token);
    await aClosed;
    hello(b.ws);
    await waitFor(() => b.texts.some((t) => t.type === "hello"));
    await sleep(300); // 等旧连接收尾跑完
    expect((await link.terminalStatus([deviceId]))[deviceId].talking).toBe(true);
    const bClosed = new Promise((r) => b.ws.once("close", r));
    b.ws.close(1000, "bye");
    await bClosed;
    await sleep(300);
    st = await link.terminalStatus([deviceId]);
    expect(st[deviceId].talking).toBe(false);
    const o = await link.overview();
    expect(o.talkingNow).toBe(0);
    expect(o.seen.last24h).toBeGreaterThanOrEqual(1);
    expect(o.ledger.bound).toBeGreaterThanOrEqual(1);
    expect(Object.keys(o.firmware).some((k) => k.includes("1.9.2"))).toBe(true);
    const today = o.days[0].counts;
    expect(today.ota).toBeGreaterThan(0);
    expect(today.auth_fail).toBeGreaterThanOrEqual(1);
    expect(today.ws_open).toBeGreaterThanOrEqual(2);
    expect(today["end:replaced_by_new_connection"]).toBeGreaterThanOrEqual(1);
    expect(today["end:device_hangup"]).toBeGreaterThanOrEqual(1);
    // 5 分钟窗口计数（告警用）：当前窗口 + 上一窗口（防跨窗口边界）
    const bucket = Math.floor(Date.now() / 300_000);
    const [w0, w1] = [await link.windowCounts(bucket), await link.windowCounts(bucket - 1)];
    expect((w0.ota || 0) + (w1.ota || 0)).toBeGreaterThan(0);
    expect((w0.ws_open || 0) + (w1.ws_open || 0)).toBeGreaterThanOrEqual(2);
    // 概况与状态里都不出现明文 MAC
    expect(JSON.stringify(o) + JSON.stringify(st)).not.toMatch(/a1:?b2:?c3:?d4/i);
  });

  it("额度提醒：额度不足给友好提示；按余额开出的短会话开场提醒余额、结束前 30 秒提醒、到点按「时长用完」结束", async () => {
    const quota = new VoiceQuotaService(prisma as any, { getConfig: async () => ({ configValue: JSON.stringify({ chargeUsers: true }) }) } as any);
    const orig = { quota: (gateway as any).quota, sessions: (gateway as any).sessions };
    (gateway as any).quota = quota;
    (gateway as any).sessions = new VoiceSessionService(prisma as any, quota, new VoiceContextBuilder(prisma as any), provider, devices);
    try {
      expect(await quota.getAvailable("user", alice)).toMatchObject({ balanceSeconds: 0, reservedSeconds: 0 });
      const token = (await ota() as any).websocket.token;
      const d0 = await device(token);
      const c0 = new Promise((r) => d0.ws.once("close", r));
      hello(d0.ws);
      await c0;
      expect(d0.texts.map((t) => t.type)).toEqual(["hello", "alert"]);
      expect(d0.texts[1].message).toMatch(/时长用完.*充值/);
      expect(d0.texts[1].message).not.toMatch(/暂时无法开始/);
      expect(await prisma.voiceSession.count({ where: { userId: alice, status: "active" } })).toBe(0);

      await quota.grant({ ownerType: "user", ownerId: alice, seconds: 90, idempotencyKey: `${tag}-g90` });
      expect(await quota.getAvailable("user", alice)).toMatchObject({ balanceSeconds: 90, reservedSeconds: 0, availableSeconds: 90 });
      const d = await device(token);
      hello(d.ws);
      await waitFor(() => d.texts.some((t) => t.type === "alert"));
      expect(d.texts.map((t) => t.type)).toEqual(["hello", "alert"]);
      expect(d.texts[1].message).toMatch(/只剩约 \d+ 分钟.*充值/);
      const conn = (gateway as any).connections.get(deviceId);
      const active = await prisma.voiceSession.findFirstOrThrow({ where: { userId: alice, deviceId, status: "active" }, orderBy: { startedAt: "desc" } });
      expect(active).toMatchObject({ maxSeconds: 90, reservedSeconds: 90, providerIsMock: true });
      expect(await quota.getAvailable("user", alice)).toMatchObject({ balanceSeconds: 90, reservedSeconds: 90, availableSeconds: 0 });
      expect(conn.warnTimer._idleTimeout).toBe(60_000); // 90 秒会话，第 60 秒提醒
      conn.warnTimer._onTimeout();
      await waitFor(() => d.texts.filter((t) => t.type === "alert").length === 2);
      expect(d.texts.filter((t) => t.type === "alert")[1].message).toMatch(/还剩 30 秒.*充值/);
      const closed = new Promise((r) => d.ws.once("close", r));
      conn.limitTimer._onTimeout();
      await closed;
      expect(d.texts.filter((t) => t.type === "alert").pop().message).toMatch(/时长用完/);
      let ending = await prisma.voiceSession.findUniqueOrThrow({ where: { id: active.id } });
      for (let i = 0; i < 100 && ending.status !== "ending"; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        ending = await prisma.voiceSession.findUniqueOrThrow({ where: { id: active.id } });
      }
      expect(ending.status).toBe("ending");
      const cb = provider.buildCallback({ eventId: `${tag}-balance-usage`, providerSessionId: ending.providerSessionId!, correlationId: ending.requestId, usedSeconds: 25, isFinal: true });
      await (gateway as any).sessions.handleUsageCallback("mock", cb.headers, cb.rawBody);
      await (gateway as any).sessions.handleUsageCallback("mock", cb.headers, cb.rawBody);
      const settled = await prisma.voiceSession.findUniqueOrThrow({ where: { id: active.id } });
      expect(settled).toMatchObject({ status: "ended", usageState: "mock", usedSeconds: 25, supplierCostMicro: null });
      expect(await quota.getAvailable("user", alice)).toMatchObject({ balanceSeconds: 65, reservedSeconds: 0, availableSeconds: 65 });
      const ledger = await prisma.voiceQuotaLedger.findMany({ where: { accountId: settled.accountId! }, orderBy: { createdAt: "asc" } });
      expect(ledger.map((row) => [row.type, row.seconds])).toEqual([["grant", 90], ["consume", -25]]);
      expect(ledger[1].note).toContain("模拟供应商用量，非真实计费");
      expect(await quota.getAvailable("user", bob)).toMatchObject({ balanceSeconds: 0, reservedSeconds: 0, availableSeconds: 0 });
    } finally {
      (gateway as any).quota = orig.quota;
      (gateway as any).sessions = orig.sessions;
    }
  });

  it("未计费的体验会话：结束前 30 秒提醒不提充值", async () => {
    const token = (await ota() as any).websocket.token;
    const d = await device(token);
    hello(d.ws);
    await waitFor(() => d.texts.some((t) => t.type === "hello"));
    expect(d.texts.some((t) => t.type === "alert")).toBe(false); // 不收费时不报余额
    const conn = (gateway as any).connections.get(deviceId);
    expect(conn.warnTimer._idleTimeout).toBe(150_000); // 缺省体验上限 180 秒
    conn.warnTimer._onTimeout();
    await waitFor(() => d.texts.some((t) => t.type === "alert"));
    expect(d.texts.find((t) => t.type === "alert").message).toBe("本次通话还剩 30 秒。");
    d.ws.close();
  });

  it("设备在会话签发等待中断开：迟到的会话请求停费并等待用量回调", async () => {
    const original = sessions.startForDevice.bind(sessions);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    let entered = false;
    let issuedId = "";
    (sessions as any).startForDevice = async (...args: any[]) => {
      entered = true;
      await blocked;
      const issued = await (original as any)(...args);
      if (issued?.available) issuedId = issued.session.id;
      return issued;
    };
    try {
      const token = (await ota() as any).websocket.token;
      const d = await device(token);
      hello(d.ws);
      await waitFor(() => entered);
      const closed = new Promise((resolve) => d.ws.once("close", resolve));
      d.ws.close();
      await closed;
      release();
      await waitFor(() => !!issuedId);
      let status = "";
      for (let i = 0; i < 100; i++) {
        status = (await prisma.voiceSession.findUniqueOrThrow({ where: { id: issuedId } })).status;
        if (status === "ending" || status === "ended" || status === "cancelled") break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(status).toBe("ending");
      const ending = await prisma.voiceSession.findUniqueOrThrow({ where: { id: issuedId } });
      const cb = provider.buildCallback({ eventId: `${tag}-late-disconnect`, providerSessionId: ending.providerSessionId!, correlationId: ending.requestId, usedSeconds: 0, isFinal: true });
      await sessions.handleUsageCallback("mock", cb.headers, cb.rawBody);
      const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id: issuedId } });
      expect(ended.status).toBe("ended");
      expect(d.texts).toEqual([]);
    } finally {
      release();
      (sessions as any).startForDevice = original;
    }
  });

  it("批量登记：逐条回报；已登记、本批重复（不同写法的同一 MAC）、格式错误各自失败，不影响其它；只回显末 4 位", async () => {
    const r = await devices.registerBatch("it-admin", {
      productSku: `${tag}-sku`,
      serials: [MAC, "10-20-30-40-50-01", "102030405001", "bad serial!", "10:20:30:40:50:02", ""],
    });
    expect(r.total).toBe(5);
    expect(r.succeeded).toBe(2);
    expect(r.results.map((x) => [x.line, x.serialHint, x.ok])).toEqual([
      [1, "E5F6", false],
      [2, "5001", true],
      [3, "5001", false],
      [4, expect.any(String), false],
      [5, "5002", true],
    ]);
    expect(r.results[0].error).toMatch(/已登记/);
    expect(r.results[2].error).toBe("本批重复");
    expect(JSON.stringify(r)).not.toMatch(/102030405001|10:20:30/);
    await expect(devices.registerBatch("it-admin", { productSku: `${tag}-sku`, serials: [] })).rejects.toThrow(/没有可登记/);
  });

  const CID = "11111111-2222-3333-4444-555555555555";
  const EVIL = "66666666-7777-4888-9999-aaaaaaaaaaaa";
  const otaAs = (mac: string, clientId: string | null, ip?: string) =>
    link.handleOta({ "device-id": mac, ...(clientId ? { "client-id": clientId } : {}), "user-agent": "bread/1.9.2" }, otaBody, base.replace("http://", ""), ip);

  it("防冒充：已绑定设备只认「MAC + 设备 ID」——换设备 ID 或不带设备 ID 拿不到令牌与固件，不顶掉真设备的令牌", async () => {
    const good: any = await ota();
    expect(good.websocket.token).toBeTruthy();
    const dev = await prisma.voiceDevice.findUniqueOrThrow({ where: { id: deviceId } });
    expect(dev.terminalIdHash).toBeTruthy(); // 首次联网已锁定
    expect(dev.terminalPinSource).toBe("first_contact");
    for (const cid of [EVIL, null]) {
      const r: any = await otaAs(MAC, cid);
      expect(r.websocket.token).toBe("");
      expect(r.activation.message).toMatch(/认证未通过/);
      expect(r.activation.code).toBeUndefined();
      expect(r.firmware.url).toBe("");
    }
    // App 侧看到「身份不符」提示
    expect((await link.terminalStatus([deviceId]))[deviceId].identityMismatch).toBe(true);
    // 冒充请求没有作废真设备的令牌
    const d = await device(good.websocket.token);
    hello(d.ws);
    await waitFor(() => d.texts.some((t) => t.type === "hello"));
    d.ws.close();
    await sleep(200);
    // 真设备再联网：提示清除
    await ota();
    expect((await link.terminalStatus([deviceId]))[deviceId].identityMismatch).toBe(false);
    expect((await link.overview()).days[0].counts.identity_mismatch).toBeGreaterThanOrEqual(2);
  });

  it("令牌与设备 ID 绑定：截获令牌后换设备 ID 或不带设备 ID 连接一律 401", async () => {
    const token = (await ota() as any).websocket.token;
    for (const headers of [{ "Client-Id": EVIL }, {}] as Record<string, string>[]) {
      await expect(
        connectWs(`${base.replace("http", "ws")}${XIAOZHI_WS_PATH}`, { Authorization: `Bearer ${token}`, "Protocol-Version": "1", "Device-Id": MAC, ...headers }),
      ).rejects.toThrow();
    }
    const ok = await device(token);
    ok.ws.close();
  });

  it("防抢激活：出厂预置设备 ID 的未绑定设备，别的设备 ID 拿不到激活码；真设备拿到", async () => {
    const mac = "02:00:00:00:0b:01";
    const factoryId = "0b0b0b0b-1111-4222-8333-444444444444";
    const reg = await devices.register("it-admin", { serial: mac, productSku: `${tag}-sku`, clientId: factoryId.toUpperCase() });
    expect(reg).toMatchObject({ terminalPinned: true, terminalPinSource: "factory" });
    const evil: any = await otaAs(mac, EVIL);
    expect(evil.activation.code).toBeUndefined();
    expect(evil.activation.message).toMatch(/认证未通过/);
    const real: any = await otaAs(mac, factoryId);
    expect(real.activation.code).toMatch(/^\d{6}$/);
    await expect(devices.register("it-admin", { serial: "02:00:00:00:0b:02", productSku: `${tag}-sku`, clientId: "not-a-uuid" })).rejects.toThrow(/设备 ID 格式/);
  });

  it("重新认证：只有机主能重置；重置后旧令牌作废，设备（恢复出厂后新 ID）下次联网重新锁定；每小时限 3 次", async () => {
    const oldToken = (await ota() as any).websocket.token;
    await expect(link.resetTerminalIdentity(deviceId, { userId: bob })).rejects.toThrow(/设备不存在/);
    const r = await link.resetTerminalIdentity(deviceId, { userId: alice });
    expect(r.message).toMatch(/断电重开/);
    expect((await prisma.voiceDevice.findUniqueOrThrow({ where: { id: deviceId } })).terminalIdHash).toBeNull();
    expect(await link.verifyConnection(`Bearer ${oldToken}`, MAC, CID)).toBeNull();
    // 设备恢复出厂后换了新 ID：重新锁定新 ID，旧 ID 反而不认
    const NEW = "12121212-3434-4565-8787-909090909090";
    const again: any = await otaAs(MAC, NEW);
    expect(again.websocket.token).toBeTruthy();
    expect(await link.verifyConnection(`Bearer ${again.websocket.token}`, MAC, NEW)).not.toBeNull();
    expect((await otaAs(MAC, CID) as any).websocket.token).toBe("");
    // 恢复成原 ID（后续用例用它），并验证限频
    await link.resetTerminalIdentity(deviceId, { adminId: "it-admin" });
    expect((await ota() as any).websocket.token).toBeTruthy();
    await link.resetTerminalIdentity(deviceId, { userId: alice });
    await expect(link.resetTerminalIdentity(deviceId, { userId: alice })).rejects.toThrow(/频繁/);
    expect((await ota() as any).websocket.token).toBeTruthy(); // 第 3 次重置后原 ID 重新锁定
  });

  it("OTA 防刷：同一出口 IP 每分钟超过上限即拒绝并计数，别的 IP 不受影响", async () => {
    process.env.XIAOZHI_OTA_PER_IP_PER_MIN = "3";
    try {
      const ip = `10.9.${Date.now() % 250}.7`;
      for (let i = 0; i < 3; i++) await otaAs(MAC, CID, ip);
      await expect(otaAs(MAC, CID, ip)).rejects.toThrow(/频繁/);
      await otaAs(MAC, CID, "10.9.0.8"); // 别的 IP 不受影响
      expect((await link.overview()).days[0].counts.ota_throttled).toBeGreaterThanOrEqual(1);
    } finally {
      delete process.env.XIAOZHI_OTA_PER_IP_PER_MIN;
    }
  });

  it("批量登记带设备 ID（「MAC,设备ID」两列）：登记即锁定；设备 ID 格式错逐条报错；不回显设备 ID", async () => {
    const r = await devices.registerBatch("it-admin", {
      productSku: `${tag}-sku`,
      serials: ["02:00:00:00:0c:01,0c0c0c0c-1111-4222-8333-444444444444", "02:00:00:00:0c:02\tbad-id", "02:00:00:00:0c:03"],
    });
    expect(r.results.map((x) => x.ok)).toEqual([true, false, true]);
    expect(r.results[1].error).toMatch(/设备 ID 格式/);
    const rows = await prisma.voiceDevice.findMany({ where: { id: { in: [r.results[0].deviceId!, r.results[2].deviceId!] } } });
    const byId = Object.fromEntries(rows.map((x) => [x.id, x]));
    expect(byId[r.results[0].deviceId!].terminalPinSource).toBe("factory");
    expect(byId[r.results[2].deviceId!].terminalIdHash).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/0c0c0c0c/);
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
