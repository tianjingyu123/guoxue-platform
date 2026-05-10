// 测试环境标识（排除 GqlModule 等不需要的模块）
process.env.NODE_ENV = "test";
process.env.ENCRYPTION_KEY = "test-key-32bytes-long!!!!!!";

// 为 @nestjs/schedule 的 cron 模块提供 crypto polyfill
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
