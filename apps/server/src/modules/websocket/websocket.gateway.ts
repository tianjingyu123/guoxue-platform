import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { WsAuthService, WsUser } from "./ws-auth.service";

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN?.split(",") ?? (process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]),
    credentials: true,
  },
  namespace: "/ws",
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AppGateway.name);
  @WebSocketServer() server!: Server;

  // socketId → WsUser
  private onlineUsers = new Map<string, WsUser>();

  constructor(private wsAuth: WsAuthService) {}

  /** 连接认证 */
  handleConnection(client: Socket) {
    const user = this.wsAuth.extractUser(client.handshake);
    if (!user) {
      this.logger.warn(`WebSocket连接被拒绝: ${client.id}`);
      client.emit("auth_error", { message: "认证失败" });
      client.disconnect(true);
      return;
    }

    this.onlineUsers.set(client.id, user);
    // 加入个人房间（方便定向推送）
    client.join(`user:${user.userId}`);
    if (user.role === "SUPER_ADMIN" || user.role === "OPERATION_ADMIN") {
      client.join("admin");
    }

    this.logger.log(`WS连接: ${user.nickname || user.userId} (${client.id})`);
    this.broadcastOnlineCount();
  }

  /** 断开连接 */
  handleDisconnect(client: Socket) {
    const user = this.onlineUsers.get(client.id);
    this.onlineUsers.delete(client.id);
    if (user) {
      this.logger.log(`WS断开: ${user.nickname || user.userId} (${client.id})`);
      this.broadcastOnlineCount();
    }
  }

  // ───────── 客户端事件 ─────────

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { time: Date.now() });
  }

  @SubscribeMessage("join_room")
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    client.emit("joined", { room });
  }

  @SubscribeMessage("leave_room")
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
    client.emit("left", { room });
  }

  // ───────── 推送API（供其他Service调用） ─────────

  /** 推送给指定用户 */
  sendToUser(userId: string, event: string, data: unknown) {
    try { this.server.to(`user:${userId}`).emit(event, data); } catch (err) { this.logger.warn("WS推送失败", err); }
  }

  /** 推送给多个用户 */
  sendToUsers(userIds: string[], event: string, data: unknown) {
    for (const uid of userIds) {
      try { this.server.to(`user:${uid}`).emit(event, data); } catch (err) { this.logger.warn("WS推送失败", err); }
    }
  }

  /** 推送给管理员 */
  sendToAdmins(event: string, data: unknown) {
    try { this.server.to("admin").emit(event, data); } catch (err) { this.logger.warn("WS推送失败", err); }
  }

  /** 广播给所有在线用户 */
  broadcast(event: string, data: unknown) {
    try { this.server.emit(event, data); } catch (err) { this.logger.warn("WS推送失败", err); }
  }

  /** 推送到指定房间 */
  sendToRoom(room: string, event: string, data: unknown) {
    try { this.server.to(room).emit(event, data); } catch (err) { this.logger.warn("WS推送失败", err); }
  }

  /** 广播在线人数 */
  private broadcastOnlineCount() {
    this.server.emit("online_count", { count: this.onlineUsers.size });
  }

  /** 获取在线用户列表（脱敏） */
  getOnlineUsers(): Array<{ userId: string; role: string }> {
    return Array.from(this.onlineUsers.values()).map((u) => ({
      userId: u.userId,
      role: u.role,
    }));
  }

  /** 检查用户是否在线 */
  isUserOnline(userId: string): boolean {
    return Array.from(this.onlineUsers.values()).some((u) => u.userId === userId);
  }

  /** 获取在线人数 */
  getOnlineCount(): number {
    return this.onlineUsers.size;
  }
}
