// 测试环境标识（排除 GqlModule 等不需要的模块）
process.env.NODE_ENV = "test";
process.env.ENCRYPTION_KEY = "test-key-for-32-byte-encryption!";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.BULLMQ_DISABLED = "true";

// 为 @nestjs/schedule 的 cron 模块提供 crypto polyfill
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// 既有支付回归使用可信发布参数；边界测试自行覆盖并恢复。
process.env.PAYMENT_ORDER_CUTOFF_UTC = "2000-01-01T00:00:00.000Z";
process.env.PAYMENT_ORDER_CUTOFF_SHA256 = require("crypto").createHash("sha256").update(process.env.PAYMENT_ORDER_CUTOFF_UTC).digest("hex");
