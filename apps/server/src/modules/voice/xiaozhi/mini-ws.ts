import { EventEmitter } from "events";
import { createHash, randomBytes } from "crypto";
import * as http from "http";
import type { Duplex } from "stream";

/**
 * 最小 WebSocket（RFC 6455）实现：只供小智协议终端接入使用。
 *
 * 为什么不引依赖：依赖锁文件由多个窗口共用，新增 ws 包需要单独协调；小智固件只用最基本的
 * 文本帧 + 二进制帧 + ping/pong/close，不用扩展与子协议，自实现足够且可逐字节测试。
 *
 * 支持：握手、掩码（客户端→服务端必须掩码，服务端→客户端不掩码）、分片重组、ping/pong、关闭握手、
 * 单消息大小上限。不支持：permessage-deflate 等扩展（握手时不协商，客户端即不会使用）。
 * 同一实现也可作为客户端（role=client，发送加掩码），供模拟设备与测试使用。
 */

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
export const DEFAULT_MAX_MESSAGE = 256 * 1024;

export type WsRole = "server" | "client";

export class MiniWsConnection extends EventEmitter {
  private buf: Buffer = Buffer.alloc(0);
  private fragments: Buffer[] = [];
  private fragmentOpcode = 0;
  private fragmentBytes = 0;
  private closed = false;
  private closeSent = false;

  constructor(
    private readonly socket: Duplex,
    private readonly role: WsRole,
    private readonly maxMessage = DEFAULT_MAX_MESSAGE,
  ) {
    super();
    socket.on("data", (chunk: Buffer) => this.onData(chunk));
    socket.on("close", () => this.finish(1006, "socket closed"));
    socket.on("error", (e) => {
      // 设备网络抖动（ECONNRESET 等）很常见：没人监听 error 时按断线处理，不能让未监听的 error 事件打崩进程
      if (this.listenerCount("error") > 0) this.emit("error", e);
      this.finish(1006, "socket error");
    });
  }

  get isOpen() {
    return !this.closed;
  }

  sendText(text: string) {
    this.sendFrame(0x1, Buffer.from(text, "utf8"));
  }

  sendBinary(data: Buffer) {
    this.sendFrame(0x2, data);
  }

  ping(data = Buffer.alloc(0)) {
    this.sendFrame(0x9, data);
  }

  /** 发起关闭握手；对端回 close 或超时后断开 */
  close(code = 1000, reason = "") {
    if (this.closed || this.closeSent) return;
    const r = Buffer.from(reason.slice(0, 60), "utf8");
    const payload = Buffer.alloc(2 + r.length);
    payload.writeUInt16BE(code, 0);
    r.copy(payload, 2);
    this.sendFrame(0x8, payload);
    this.closeSent = true;
    setTimeout(() => this.destroy(code, reason), 2000).unref?.();
  }

  destroy(code = 1006, reason = "destroyed") {
    this.socket.destroy();
    this.finish(code, reason);
  }

  private finish(code: number, reason: string) {
    if (this.closed) return;
    this.closed = true;
    this.emit("close", code, reason);
  }

  private sendFrame(opcode: number, payload: Buffer) {
    if (this.closed || this.closeSent) return;
    const mask = this.role === "client";
    const len = payload.length;
    let header: Buffer;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;
    if (mask) {
      header[1] |= 0x80;
      const key = randomBytes(4);
      const masked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) masked[i] = payload[i] ^ key[i & 3];
      this.socket.write(Buffer.concat([header, key, masked]));
    } else {
      this.socket.write(Buffer.concat([header, payload]));
    }
  }

  /** 协议错误：先把关闭帧写出去（带错误码），再半关闭连接；对端不配合时 close() 的定时器兜底销毁 */
  private protocolError(code: number, reason: string) {
    this.emit("protocolError", reason);
    this.close(code, reason);
    this.socket.end();
    this.finish(code, reason);
  }

  private onData(chunk: Buffer) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    while (!this.closed) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0];
      const b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      if (b0 & 0x70) return this.protocolError(1002, "RSV bits set");
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        const big = this.buf.readBigUInt64BE(2);
        if (big > BigInt(this.maxMessage)) return this.protocolError(1009, "message too big");
        len = Number(big);
        offset = 10;
      }
      // 方向约束：客户端发来的帧必须掩码，服务端发来的帧不得掩码
      if (this.role === "server" && !masked) return this.protocolError(1002, "client frame not masked");
      if (this.role === "client" && masked) return this.protocolError(1002, "server frame masked");
      if (len > this.maxMessage) return this.protocolError(1009, "message too big");
      const need = offset + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(offset + (masked ? 4 : 0), need);
      if (masked) {
        const key = this.buf.subarray(offset, offset + 4);
        const out = Buffer.alloc(len);
        for (let i = 0; i < len; i++) out[i] = payload[i] ^ key[i & 3];
        payload = out;
      } else {
        payload = Buffer.from(payload);
      }
      this.buf = this.buf.subarray(need);
      this.handleFrame(fin, opcode, payload);
    }
  }

  private handleFrame(fin: boolean, opcode: number, payload: Buffer) {
    if (opcode >= 0x8) {
      if (!fin || payload.length > 125) return this.protocolError(1002, "bad control frame");
      if (opcode === 0x8) {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
        const reason = payload.length > 2 ? payload.subarray(2).toString("utf8") : "";
        if (!this.closeSent) {
          const echo = Buffer.alloc(2);
          echo.writeUInt16BE(code === 1005 ? 1000 : code, 0);
          this.sendFrame(0x8, echo);
          this.closeSent = true;
        }
        this.socket.end();
        this.finish(code, reason);
      } else if (opcode === 0x9) {
        this.sendFrame(0xa, payload);
      } else if (opcode === 0xa) {
        this.emit("pong", payload);
      } else {
        this.protocolError(1002, "unknown control opcode");
      }
      return;
    }
    if (opcode === 0x0) {
      if (!this.fragmentOpcode) return this.protocolError(1002, "unexpected continuation");
    } else if (opcode === 0x1 || opcode === 0x2) {
      if (this.fragmentOpcode) return this.protocolError(1002, "expected continuation");
      this.fragmentOpcode = opcode;
    } else {
      return this.protocolError(1002, "unknown data opcode");
    }
    this.fragments.push(payload);
    this.fragmentBytes += payload.length;
    if (this.fragmentBytes > this.maxMessage) return this.protocolError(1009, "message too big");
    if (!fin) return;
    const data = this.fragments.length === 1 ? this.fragments[0] : Buffer.concat(this.fragments);
    const op = this.fragmentOpcode;
    this.fragments = [];
    this.fragmentOpcode = 0;
    this.fragmentBytes = 0;
    if (op === 0x1) this.emit("text", data.toString("utf8"));
    else this.emit("binary", data);
  }
}

/** 拒绝升级：返回普通 HTTP 状态后断开（不暴露原因细节） */
export function rejectUpgrade(socket: Duplex, status: number, message: string) {
  const body = JSON.stringify({ code: status, message });
  // end 而不是 write + destroy：确保响应写完再断开
  socket.end(
    `HTTP/1.1 ${status} ${http.STATUS_CODES[status] || "Error"}\r\n` +
      "Content-Type: application/json; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      "Connection: close\r\n\r\n" +
      body,
  );
}

/** 接受升级：校验握手头并回 101；头不合法时返回 null（已回 400） */
export function acceptUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer, maxMessage = DEFAULT_MAX_MESSAGE) {
  const key = req.headers["sec-websocket-key"];
  const upgrade = String(req.headers.upgrade || "").toLowerCase();
  const version = req.headers["sec-websocket-version"];
  if (upgrade !== "websocket" || typeof key !== "string" || !/^[A-Za-z0-9+/]{22}==$/.test(key) || version !== "13") {
    rejectUpgrade(socket, 400, "bad websocket handshake");
    return null;
  }
  const accept = createHash("sha1").update(key + GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const conn = new MiniWsConnection(socket, "server", maxMessage);
  if (head?.length) socket.unshift(head);
  return conn;
}

/** 客户端连接（模拟设备与测试用）：可带任意请求头（Authorization / Device-Id / Client-Id / Protocol-Version） */
export function connectWs(url: string, headers: Record<string, string> = {}, timeoutMs = 5000): Promise<MiniWsConnection> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.protocol !== "ws:") return reject(new Error("只支持 ws://（本机隔离测试）"));
    const key = randomBytes(16).toString("base64");
    const req = http.request({
      host: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      headers: {
        ...headers,
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Key": key,
        "Sec-WebSocket-Version": "13",
      },
      timeout: timeoutMs,
    });
    req.on("upgrade", (res, socket, head) => {
      const expected = createHash("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== expected) {
        socket.destroy();
        return reject(new Error("bad accept"));
      }
      const conn = new MiniWsConnection(socket, "client");
      if (head?.length) socket.unshift(head);
      resolve(conn);
    });
    req.on("response", (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => reject(Object.assign(new Error(`HTTP ${res.statusCode}: ${body}`), { status: res.statusCode })));
    });
    req.on("timeout", () => req.destroy(new Error("connect timeout")));
    req.on("error", reject);
    req.end();
  });
}
