import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Logger } from "@nestjs/common";
import { buildRedisTlsOptions } from "../redis/redis-tls";

/**
 * socket.io Redis adapter — cluster 多实例下跨实例房间广播的前提（H2）。
 * pub/sub 需要两条独立 Redis 连接（sub 进入订阅模式后不能复用于普通命令）。
 * Redis 不可用时不接 adapter，降级为单实例内存广播（与现状等价，fork 单进程下无影响）。
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<boolean> {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn("REDIS_URL 未配置，websocket 使用单实例内存广播（cluster 下跨实例推送会丢失）");
      return false;
    }
    try {
      const tls = buildRedisTlsOptions(url);
      const pubClient = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        ...(tls ? { tls } : {}),
      });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log("websocket Redis adapter 已接入（跨实例广播就绪）");
      return true;
    } catch (err) {
      this.logger.error("websocket Redis adapter 连接失败，降级为单实例内存广播", err);
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
