import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { XiaobuMcpServer } from "./xiaobu-mcp-server";

/**
 * 小智 MCP 接入点桥接：主动连接小智控制台为智能体生成的 MCP 接入点（wss 地址含令牌），
 * 把收到的 JSON-RPC 交给 XiaobuMcpServer 处理并回写。断线指数退避重连（1s → 最长 60s），与作者示例一致。
 *
 * - 未配置 XIAOZHI_MCP_ENDPOINT 时不启用
 * - 接入点地址含令牌，日志只输出主机名，不输出路径与查询参数
 * - 多实例部署时每个实例都会连接；是否允许多连接以小智平台行为为准，建议只在一个实例上配置
 */
@Injectable()
export class XiaozhiMcpBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaozhiMcpBridgeService.name);
  private socket: any = null;
  private stopped = false;
  private backoffMs = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  status: "disabled" | "connecting" | "connected" | "waiting_retry" = "disabled";
  lastError: string | null = null;

  constructor(private readonly server: XiaobuMcpServer) {}

  private get endpoint(): string {
    return (process.env.XIAOZHI_MCP_ENDPOINT || "").trim();
  }

  private safeHost(): string {
    try {
      return new URL(this.endpoint).host;
    } catch {
      return "(invalid)";
    }
  }

  onModuleInit() {
    if (!this.endpoint) {
      this.logger.log("未配置 XIAOZHI_MCP_ENDPOINT，小卜 MCP 接入点桥接未启用");
      return;
    }
    const Ws = (globalThis as any).WebSocket;
    if (typeof Ws !== "function") {
      this.logger.warn("当前 Node 运行时没有内置 WebSocket（需要 Node 22+），MCP 桥接未启用");
      return;
    }
    this.connect();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      this.socket?.close();
    } catch {
      /* 忽略关闭异常 */
    }
  }

  private connect() {
    if (this.stopped) return;
    const Ws = (globalThis as any).WebSocket;
    this.status = "connecting";
    let ws: any;
    try {
      ws = new Ws(this.endpoint);
    } catch (error: any) {
      this.lastError = String(error?.message || error);
      this.scheduleReconnect();
      return;
    }
    this.socket = ws;
    ws.onopen = () => {
      this.status = "connected";
      this.backoffMs = 1000;
      this.lastError = null;
      this.logger.log(`已连接小智 MCP 接入点 ${this.safeHost()}`);
    };
    ws.onmessage = async (event: { data: unknown }) => {
      const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data as ArrayBuffer).toString("utf8");
      const reply = await this.server.handle(raw);
      if (reply && ws.readyState === 1) ws.send(reply);
    };
    ws.onerror = (event: any) => {
      this.lastError = String(event?.message || event?.error?.message || "WebSocket error");
    };
    ws.onclose = () => {
      if (this.socket === ws) this.socket = null;
      if (!this.stopped) {
        this.logger.warn(`小智 MCP 接入点连接关闭（${this.safeHost()}），${this.backoffMs / 1000}s 后重连`);
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    this.status = "waiting_retry";
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
