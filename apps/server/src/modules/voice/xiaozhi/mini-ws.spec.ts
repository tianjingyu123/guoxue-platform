import * as http from "http";
import * as net from "net";
import { AddressInfo } from "net";
import { MiniWsConnection, acceptUpgrade, connectWs, rejectUpgrade } from "./mini-ws";

/**
 * 最小 WebSocket 实现的互通测试：服务端分别对接 Node 自带的标准 WebSocket 客户端（undici，独立实现）
 * 与本实现的客户端；并用手工构造的原始字节覆盖分片、长度编码、控制帧与方向约束。
 */
describe("mini-ws", () => {
  let server: http.Server;
  let port = 0;
  let conns: MiniWsConnection[] = [];
  let reject401 = false;

  beforeAll(async () => {
    server = http.createServer((_, res) => res.end("no"));
    server.on("upgrade", (req, socket, head) => {
      if (reject401) return rejectUpgrade(socket, 401, "unauthorized");
      const c = acceptUpgrade(req, socket, head, 128 * 1024);
      if (!c) return;
      conns.push(c);
      // 回声：文本加前缀，二进制原样
      c.on("text", (t: string) => c.sendText(`echo:${t}`));
      c.on("binary", (b: Buffer) => c.sendBinary(b));
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    for (const c of conns) c.destroy();
    await new Promise((r) => server.close(r));
  });

  beforeEach(() => {
    reject401 = false;
  });

  const url = () => `ws://127.0.0.1:${port}/x`;
  const next = <T>(c: MiniWsConnection, ev: string) => new Promise<T>((r) => c.once(ev, r as any));

  it("与标准 WebSocket 客户端互通：文本、二进制（含 16 位与 64 位长度编码）", async () => {
    // Jest 沙箱不暴露 Node 自带的 WebSocket，放到独立 node 进程里跑（undici 实现，与本实现无共享代码）
    const script = `
      const ws = new WebSocket(${JSON.stringify(url())});
      ws.binaryType = "arraybuffer";
      const mid = Buffer.alloc(300, 7);
      const big = Buffer.alloc(70000); for (let i = 0; i < big.length; i++) big[i] = i % 251;
      const got = [];
      ws.onopen = () => { ws.send("你好小智"); ws.send(mid); ws.send(big); };
      ws.onmessage = (e) => {
        got.push(e.data);
        if (got.length === 3) {
          const ok = got[0] === "echo:你好小智" && Buffer.from(got[1]).equals(mid) && Buffer.from(got[2]).equals(big);
          console.log(ok ? "INTEROP_OK" : "INTEROP_BAD");
          ws.close(); setTimeout(() => process.exit(0), 50);
        }
      };
      ws.onerror = (e) => { console.log("INTEROP_ERR", e.message); process.exit(1); };
      setTimeout(() => { console.log("INTEROP_TIMEOUT"); process.exit(1); }, 5000);`;
    const { execFile } = await import("child_process");
    const out = await new Promise<string>((resolve) => execFile(process.execPath, ["-e", script], (_e, stdout) => resolve(String(stdout))));
    expect(out).toContain("INTEROP_OK");
  });

  it("本实现的客户端：可带自定义请求头；二进制往返逐字节一致；关闭握手", async () => {
    const c = await connectWs(url(), { "Device-Id": "aa:bb:cc:dd:ee:ff" });
    const frame = Buffer.from([0xf8, 0xff, 0xfe, 1, 2, 3]);
    c.sendBinary(frame);
    const back = await next<Buffer>(c, "binary");
    expect(back.equals(frame)).toBe(true);
    c.sendText("{\"type\":\"hello\"}");
    expect(await next<string>(c, "text")).toBe("echo:{\"type\":\"hello\"}");
    const closed = next<number>(c, "close");
    c.close(1000, "bye");
    expect(await closed).toBe(1000);
  });

  it("拒绝握手时客户端拿到 HTTP 状态（401），不会升级", async () => {
    reject401 = true;
    await expect(connectWs(url())).rejects.toMatchObject({ status: 401 });
  });

  it("原始字节：分片重组、ping→pong、未掩码的客户端帧被拒", async () => {
    const sock = net.connect(port, "127.0.0.1");
    await new Promise((r) => sock.once("connect", r));
    sock.write(
      "GET /x HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n",
    );
    let raw = Buffer.alloc(0);
    sock.on("data", (d) => (raw = Buffer.concat([raw, d])));
    for (let i = 0; i < 50 && !raw.includes("\r\n\r\n"); i++) await new Promise((r) => setTimeout(r, 10));
    expect(raw.toString()).toContain("s3pPLMBiTxaQ9kYGzzhZRbK+xOo="); // RFC 6455 示例值
    raw = Buffer.alloc(0);
    const masked = (fin: boolean, op: number, payload: Buffer) => {
      const key = Buffer.from([1, 2, 3, 4]);
      const out = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ key[i & 3];
      return Buffer.concat([Buffer.from([(fin ? 0x80 : 0) | op, 0x80 | payload.length]), key, out]);
    };
    // 文本分成三片，中间插一个 ping（控制帧允许穿插在分片之间）
    sock.write(masked(false, 0x1, Buffer.from("ab")));
    sock.write(masked(true, 0x9, Buffer.from("p")));
    sock.write(masked(false, 0x0, Buffer.from("cd")));
    sock.write(masked(true, 0x0, Buffer.from("ef")));
    for (let i = 0; i < 50 && raw.length < 3 + 12; i++) await new Promise((r) => setTimeout(r, 10));
    // pong(0x8A, 长度1, "p") + text(0x81, 长度 11, "echo:abcdef")
    expect(raw.subarray(0, 3).equals(Buffer.from([0x8a, 1, 0x70]))).toBe(true);
    expect(raw.subarray(3).toString("utf8", 2)).toBe("echo:abcdef");
    // 未掩码的客户端帧：按协议关闭连接
    const closed = new Promise((r) => sock.once("close", r));
    sock.write(Buffer.from([0x81, 0x01, 0x61]));
    await closed;
  });

  it("超过单消息上限：以 1009 关闭", async () => {
    const c = await connectWs(url());
    const closed = next<number>(c, "close");
    c.sendBinary(Buffer.alloc(200 * 1024));
    expect(await closed).toBe(1009);
  });
});
