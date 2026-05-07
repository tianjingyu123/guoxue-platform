import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/**
 * Redis 缓存模块（全局）
 *
 * RedisService 作为全局单例，导出供各模块注入使用。
 * 当前为内存降级方案，安装 ioredis 后无需改动模块结构。
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
