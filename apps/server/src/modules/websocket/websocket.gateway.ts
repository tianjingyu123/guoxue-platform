import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { WsAuthService } from "./ws-auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 在线态 Redis 键（H2·cluster 跨实例共享）：
 * - ws:online:users          set(userId)  全局在线用户集合
 * - ws:online:sockets:{uid}  set(socketId) 该用户的全部连接（多端/跨实例）
 * - ws:online:meta:{uid}     json {role,nickname}
 * - ws:ip:{ip}               同 IP 连接计数
 * 所有键带 TTL 兜底（实例崩溃残留自愈）；socketMap/eventRateLimit 留在进程内存是
 * 正确决策——socket 生命周期归属本实例，跨实例无意义。
 */
const ONLINE_TTL = 6 * 3600;
const IP_TTL = 3600;

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN?.split(",") ?? (process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]),
    credentials: true,
  },
  namespace: "/ws",
  pingInterval: 25000,
  pingTimeout: 10000,
  maxHttpBufferSize: 1e6,        // 1MB max message
  connectTimeout: 10000,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AppGateway.name);
  @WebSocketServer() server!: Server;

  // socketId → userId（本实例连接，跨实例无意义故留内存）
  private socketMap = new Map<string, string>();
  // 每个 socket 的事件速率限制 key = `${socketId}:${eventName}`（本实例 socket 私有）
  private eventRateLimit = new Map<string, { count: number; resetAt: number }>();

  private readonly MAX_CONNECTIONS_PER_IP = 10;
  /** 单实例连接上限（cluster×N 时总容量随实例数扩展） */
  private readonly MAX_INSTANCE_CONNECTIONS = 5000;

  constructor(
    private wsAuth: WsAuthService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 事件级频率检查 */
  private checkEventRate(socketId: string, eventName: string, maxPerWindow = 10, windowMs = 1000): boolean {
    const key = `${socketId}:${eventName}`;
    const now = Date.now();
    const entry = this.eventRateLimit.get(key);
    if (!entry || now > entry.resetAt) {
      this.eventRateLimit.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxPerWindow) return false;
    entry.count++;
    return true;
  }

  async handleConnection(client: Socket) {
    // 单实例连接数限制
    if (this.socketMap.size >= this.MAX_INSTANCE_CONNECTIONS) {
      this.logger.warn(`实例连接数已达上限 ${this.MAX_INSTANCE_CONNECTIONS}`);
      client.emit("auth_error", { message: "服务器连接数已满，请稍后再试" });
      client.disconnect(true);
      return;
    }

    // IP 连接数限制（Redis 跨实例共享计数，防同 IP 分散到多实例绕限）
    const ip = (client.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || client.handshake.address || "unknown";
    const ipCount = await this.redis.incrBy(`ws:ip:${ip}`, 1, IP_TTL);
    if (ipCount > this.MAX_CONNECTIONS_PER_IP) {
      await this.redis.incrBy(`ws:ip:${ip}`, -1);
      this.logger.warn(`IP ${ip} 连接数超限 (${ipCount})`);
      client.emit("auth_error", { message: "连接过于频繁，请稍后再试" });
      client.disconnect(true);
      return;
    }

    // 认证
    const user = this.wsAuth.extractUser(client.handshake as unknown as Record<string, unknown>);
    if (!user) {
      await this.redis.incrBy(`ws:ip:${ip}`, -1);
      this.logger.warn(`WebSocket连接被拒绝: ${client.id}`);
      client.emit("auth_error", { message: "认证失败" });
      client.disconnect(true);
      return;
    }

    // 检查用户是否被封禁
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { status: true },
    });
    if (dbUser && (dbUser.status === "BANNED" || dbUser.status === "DISABLED")) {
      await this.redis.incrBy(`ws:ip:${ip}`, -1);
      this.logger.warn(`被封禁/停用用户尝试连接: ${user.userId}`);
      client.emit("auth_error", { message: "账户已被限制，如有疑问请联系客服" });
      client.disconnect(true);
      return;
    }

    // 记录在线：本实例映射 + Redis 共享在线态；用户信息挂 socket.data 供事件处理直取
    this.socketMap.set(client.id, user.userId);
    client.data.userId = user.userId;
    client.data.nickname = user.nickname;
    client.data.role = user.role;

    const firstOnline = (await this.redis.sadd("ws:online:users", user.userId)) === 1;
    await this.redis.expire("ws:online:users", ONLINE_TTL);
    await this.redis.sadd(`ws:online:sockets:${user.userId}`, client.id);
    await this.redis.expire(`ws:online:sockets:${user.userId}`, ONLINE_TTL);
    await this.redis.set(`ws:online:meta:${user.userId}`, JSON.stringify({ role: user.role, nickname: user.nickname }), ONLINE_TTL);
    if (firstOnline) {
      this.broadcastPresence(user.userId, "online");
    }

    // 加入个人房间
    client.join(`user:${user.userId}`);
    if (user.role === "SUPER_ADMIN" || user.role === "OPERATION_ADMIN") {
      client.join("admin");
    }

    this.logger.log(`WS连接: ${user.nickname || user.userId} (${client.id}, IP: ${ip})`);
    client.emit("welcome", {
      userId: user.userId,
      onlineCount: await this.getOnlineCount(),
      message: "连接成功",
    });
    await this.broadcastOnlineCount();
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketMap.get(client.id);
    this.socketMap.delete(client.id);

    // 清理事件限流记录
    for (const key of this.eventRateLimit.keys()) {
      if (key.startsWith(`${client.id}:`)) this.eventRateLimit.delete(key);
    }

    // IP 计数递减（负值=崩溃残留误差，直接清零自愈）
    const ip = (client.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || client.handshake.address || "unknown";
    const remain = await this.redis.incrBy(`ws:ip:${ip}`, -1);
    if (remain <= 0) await this.redis.del(`ws:ip:${ip}`);

    if (!userId) return;

    await this.redis.srem(`ws:online:sockets:${userId}`, client.id);
    if ((await this.redis.scard(`ws:online:sockets:${userId}`)) === 0) {
      await this.redis.del(`ws:online:sockets:${userId}`);
      await this.redis.del(`ws:online:meta:${userId}`);
      await this.redis.srem("ws:online:users", userId);
      this.broadcastPresence(userId, "offline");
      this.logger.log(`WS用户离线: ${client.data?.nickname || userId}`);
    }

    await this.broadcastOnlineCount();
  }

  // ───────── 客户端事件 ─────────

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { time: Date.now(), serverTime: new Date().toISOString() });
  }

  @SubscribeMessage("join_room")
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    if (typeof room !== "string" || room.length > 100) return;
    client.join(room);
    client.emit("joined", { room });
  }

  @SubscribeMessage("leave_room")
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    if (typeof room !== "string" || room.length > 100) return;
    client.leave(room);
    client.emit("left", { room });
  }

  /** 加入圈子的实时讨论房间 */
  @SubscribeMessage("join_circle")
  handleJoinCircle(@ConnectedSocket() client: Socket, @MessageBody() circleId: string) {
    if (typeof circleId !== "string" || circleId.length > 100) return;
    const room = `circle:${circleId}`;
    client.join(room);
    client.emit("circle_joined", { circleId });
    this.logger.debug(`${this.socketMap.get(client.id)} 加入圈子房间: ${circleId}`);
  }

  @SubscribeMessage("leave_circle")
  handleLeaveCircle(@ConnectedSocket() client: Socket, @MessageBody() circleId: string) {
    if (typeof circleId !== "string" || circleId.length > 100) return;
    const room = `circle:${circleId}`;
    client.leave(room);
    client.emit("circle_left", { circleId });
  }

  /** 订阅某个用户的上线/下线状态 */
  @SubscribeMessage("subscribe_presence")
  async handleSubscribePresence(@ConnectedSocket() client: Socket, @MessageBody() targetUserId: string) {
    if (typeof targetUserId !== "string" || targetUserId.length > 100) return;
    const room = `presence:${targetUserId}`;
    client.join(room);
    const isOnline = await this.isUserOnline(targetUserId);
    client.emit("presence_update", { userId: targetUserId, status: isOnline ? "online" : "offline" });
  }

  @SubscribeMessage("unsubscribe_presence")
  handleUnsubscribePresence(@ConnectedSocket() client: Socket, @MessageBody() targetUserId: string) {
    if (typeof targetUserId !== "string" || targetUserId.length > 100) return;
    client.leave(`presence:${targetUserId}`);
  }

  /** 打字状态广播 */
  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; isTyping: boolean },
  ) {
    const userId = this.socketMap.get(client.id);
    if (!this.checkEventRate(client.id, "typing", 3, 3000)) return;
    if (!userId || !data?.room) return;
    this.server.to(data.room).emit("typing", {
      userId,
      room: data.room,
      isTyping: data.isTyping,
      timestamp: Date.now(),
    });
  }

  /** 通用消息（供前端到WebSocket，不经过腾讯云IM的场景） */
  @SubscribeMessage("send_message")
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; content: string; type?: string },
  ) {
    const userId = this.socketMap.get(client.id);
    if (!this.checkEventRate(client.id, "send_message", 10, 1000)) return;
    if (!userId || !data?.room || !data?.content) return;
    const message = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      room: data.room,
      content: data.content.slice(0, 5000),
      type: data.type || "text",
      timestamp: new Date().toISOString(),
    };
    this.server.to(data.room).emit("new_message", message);
  }

  // ───────── 直播房间事件 ─────────

  /** 加入直播间 */
  @SubscribeMessage("live:join")
  handleLiveJoin(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const userId = this.socketMap.get(client.id);
    if (!userId || typeof roomId !== "string" || roomId.length > 100) return;
    const room = `live:${roomId}`;
    client.join(room);
    // 广播用户进入（用户信息在连接时挂到 socket.data，避免跨实例查询）
    this.server.to(room).emit("live:user_joined", {
      userId,
      nickname: client.data?.nickname,
      timestamp: Date.now(),
    });
    client.emit("live:joined", { roomId });
  }

  /** 离开直播间 */
  @SubscribeMessage("live:leave")
  handleLiveLeave(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const userId = this.socketMap.get(client.id);
    if (!userId || typeof roomId !== "string" || roomId.length > 100) return;
    const room = `live:${roomId}`;
    client.leave(room);
    this.server.to(room).emit("live:user_left", { userId, timestamp: Date.now() });
  }

  /** 直播弹幕消息（WebSocket转发 + 后端持久化由HTTP API完成） */
  @SubscribeMessage("live:chat")
  handleLiveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const userId = this.socketMap.get(client.id);
    if (!this.checkEventRate(client.id, "live:chat", 10, 1000)) return;
    if (!userId || !data?.roomId || !data?.content) return;
    const room = `live:${data.roomId}`;
    this.server.to(room).emit("live:chat", {
      userId,
      nickname: client.data?.nickname || "用户",
      content: data.content.slice(0, 500),
      timestamp: Date.now(),
    });
  }

  /** 直播礼物消息（WebSocket转发到直播间） */
  @SubscribeMessage("live:gift")
  handleLiveGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; giftId: string; giftName: string; giftIcon?: string; quantity?: number },
  ) {
    const userId = this.socketMap.get(client.id);
    if (!this.checkEventRate(client.id, "live:gift", 5, 2000)) return;
    if (!userId || !data?.roomId || !data?.giftId) return;
    const room = `live:${data.roomId}`;
    this.server.to(room).emit("live:gift", {
      userId,
      nickname: client.data?.nickname || "用户",
      giftId: data.giftId,
      giftName: data.giftName,
      giftIcon: data.giftIcon,
      quantity: data.quantity || 1,
      timestamp: Date.now(),
    });
  }

  /** 直播点赞消息（WebSocket转发到直播间） */
  @SubscribeMessage("live:like")
  handleLiveLike(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = this.socketMap.get(client.id);
    if (!userId || !data?.roomId) return;
    const room = `live:${data.roomId}`;
    this.server.to(room).emit("live:like", {
      userId,
      timestamp: Date.now(),
    });
  }

  // ───────── 推送API（供其他Service调用） ─────────

  /** 推送给指定用户（支持多端） */
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

  /** 推送IM新消息通知（由IM回调触发） */
  notifyImMessage(userId: string, msg: {
    fromUserId: string;
    toUserId?: string;
    groupId?: string;
    text: string;
    msgTime: number;
    msgKey?: string;
  }) {
    this.sendToUser(userId, "im_new_message", {
      ...msg,
      timestamp: new Date(msg.msgTime * 1000).toISOString(),
    });
  }

  /** 推送IM群消息 */
  notifyImGroupMessage(groupId: string, msg: {
    fromUserId: string;
    text: string;
    msgTime: number;
  }) {
    this.sendToRoom(`circle:${groupId}`, "im_group_message", {
      groupId,
      ...msg,
      timestamp: new Date(msg.msgTime * 1000).toISOString(),
    });
  }

  // ───────── 状态广播 ─────────

  private broadcastPresence(userId: string, status: "online" | "offline") {
    this.server.to(`presence:${userId}`).emit("presence_update", { userId, status });
  }

  private async broadcastOnlineCount() {
    this.server.emit("online_count", { count: await this.getOnlineCount() });
  }

  // ───────── 查询（Redis 共享在线态·跨实例一致） ─────────

  async getOnlineUsers(): Promise<Array<{ userId: string; role: string; nickname?: string; deviceCount: number }>> {
    const userIds = await this.redis.smembers("ws:online:users");
    const result: Array<{ userId: string; role: string; nickname?: string; deviceCount: number }> = [];
    for (const userId of userIds) {
      const [metaRaw, deviceCount] = await Promise.all([
        this.redis.get(`ws:online:meta:${userId}`),
        this.redis.scard(`ws:online:sockets:${userId}`),
      ]);
      let meta: { role?: string; nickname?: string } = {};
      try { meta = metaRaw ? JSON.parse(metaRaw) : {}; } catch { /* 忽略脏数据 */ }
      result.push({ userId, role: meta.role || "USER", nickname: meta.nickname, deviceCount });
    }
    return result;
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.redis.sismember("ws:online:users", userId);
  }

  async getOnlineCount(): Promise<number> {
    return this.redis.scard("ws:online:users");
  }

  /** 获取在线用户ID集合 */
  async getOnlineUserIds(): Promise<string[]> {
    return this.redis.smembers("ws:online:users");
  }
}
