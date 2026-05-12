# 国学平台 — 日志规范与关键埋点

## 1. 日志格式

### 1.1 JSON 结构化字段

```json
{
  "level": "info",
  "time": "2026-05-11T14:30:22.123Z",
  "pid": 12345,
  "service": "guoxue-server",
  "traceId": "a1b2c3d4e5f6",
  "context": "ShopService",
  "msg": "用户下单成功",
  "userId": "u_abc123",
  "orderId": "o_xyz789",
  "durationMs": 45,
  "ip": "10.0.1.5"
}
```

### 1.2 必填字段

| 字段 | 来源 | 说明 |
|------|------|------|
| `level` | Pino 自动 | debug / info / warn / error |
| `time` | Pino 自动 | ISO 8601 时间戳 |
| `service` | Pino base | 固定 `"guoxue-server"` |
| `traceId` | RequestContext | 请求级链路追踪 ID |
| `msg` | NestJS Logger | 日志描述文本 |
| `context` | NestJS Logger | 产生日志的类名 |

### 1.3 可选业务字段

```typescript
// 在业务代码中通过 PinoLoggerService.raw() 直接使用
this.logger.raw().info({
  userId: "u1",
  orderId: "o1",
  amount: 99.00,
  durationMs: 45,
}, "订单支付成功");
```

---

## 2. 日志级别

| 级别 | 何时使用 | 示例 |
|------|----------|------|
| `fatal` | 进程无法继续运行、数据损坏 | DB 连接全部断开、磁盘满 |
| `error` | 业务异常、第三方调用失败、500 错误 | 支付回调验签失败、订单创建异常 |
| `warn` | 降级行为、资源接近阈值、可恢复错误 | 缓存未命中走 DB、连接池 > 80% |
| `info` | 关键业务流程节点、状态变更 | 用户登录、订单状态变更、配置更新 |
| `debug` | 开发调试信息、请求参数 | SQL 参数、请求体、中间计算值 |
| `trace` | 极详细调试（生产环境关闭） | 循环内日志、逐行执行追踪 |

### 2.1 生产环境级别

```env
# 生产环境 — info（默认，不输出 debug/trace）
LOG_LEVEL=info

# 排查问题时临时开启 debug（通过 FeatureFlag 或环境变量热更新）
LOG_LEVEL=debug
```

---

## 3. 关键埋点位置

### 3.1 认证模块（AuthModule）

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| 登录成功 | info | userId, provider | 微信/密码/手机登录 |
| 登录失败 | warn | phone/email, reason | 密码错误、用户被禁用 |
| 注册成功 | info | userId, provider | 新用户注册 |
| Token 刷新 | debug | userId | JWT 刷新 |
| 安全事件 | error | userId, ip, action | 连续 5 次密码错误/异地登录 |

### 3.2 支付模块（ShopModule）

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| 下单成功 | info | userId, orderId, type, amount | 预下单 |
| 支付回调成功 | info | orderId, transactionId, amount | 微信/支付宝回调 |
| 支付回调失败 | error | orderId, reason | 验签失败/金额不匹配 |
| 退款成功 | info | orderId, refundId, amount | 退款到账 |
| 支付超时 | warn | orderId, elapsedSec | 超过 30s 未收到回调 |
| 分佣计算 | info | orderId, stationId, rate, earned | 分佣记录生成 |

### 3.3 排盘模块（PaipanModule）

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| 排盘缓存命中 | debug | cacheKey | 走 Redis 缓存 |
| 排盘缓存未命中 | debug | cacheKey | 走计算引擎 |
| 排盘计算完成 | info | userId, paipanType, durationMs | 八字/紫微排盘 |
| AI 分析请求 | info | userId, analyzeType, modelName | DeepSeek API 调用 |
| AI 分析响应 | info | userId, tokenUsage | Token 消耗统计 |

### 3.4 搜索模块（SearchModule）

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| 搜索请求 | info | userId, keyword, type | 搜索关键词 |
| 搜索无结果 | info | keyword, type | 零结果搜索 |
| 热门搜索重建 | info | count | 定时任务刷新热搜 |
| FTS 查询慢 | warn | durationMs, query | 全文搜索超过 200ms |

### 3.5 第三方服务（全局）

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| API 调用开始 | debug | service, method, params | 腾讯云/微信/DeepSeek |
| API 调用成功 | debug | service, durationMs | |
| API 调用失败 | error | service, statusCode, body | 关键错误信息 |
| API 调用重试 | warn | service, attempt, maxRetries | 非 200 响应重试 |
| API 超时 | error | service, timeoutMs | 超时阈值 |

### 3.6 系统运维

| 事件 | 级别 | 字段 | 说明 |
|------|------|------|------|
| 应用启动 | info | port, env, nodeVersion | bootstrap |
| 优雅关闭 | info | signal | SIGTERM/SIGINT |
| 慢查询 | warn | durationMs, query | 超过 PRISMA_SLOW_QUERY_MS |
| WebSocket 连接 | debug | userId, event | 连接/断开 |
| 定时任务执行 | info | taskName, durationMs | @Cron 定时任务 |
| 定时任务失败 | error | taskName, error | 定时任务异常 |

---

## 4. 敏感信息脱敏规则

### 4.1 脱敏函数

```typescript
// src/common/mask.util.ts
export const mask = {
  phone: (v: string) => v ? v.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "***",
  email: (v: string) => v ? v.replace(/(.{2}).*(@.*)/, "$1***$2") : "***",
  idCard: (v: string) => v ? v.replace(/(\d{4})\d{10}(\d{4})/, "$1****$2") : "***",
  bankCard: (v: string) => v ? v.replace(/(\d{4})\d{8,12}(\d{4})/, "$1****$2") : "***",
  name: (v: string) => v ? v.charAt(0) + "*".repeat(v.length - 1) : "***",
  token: () => "***",
  password: () => "***",
  apiKey: () => "sk-****",
} as const;
```

### 4.2 脱敏字段清单

| 字段名 | 脱敏方式 | 日志示例 |
|--------|----------|----------|
| `phone` | `mask.phone` | `138****5678` |
| `email` | `mask.email` | `ab***@qq.com` |
| `password` / `credential` | 完全移除 | `***` |
| `idCard` / `clientBirth` | `mask.idCard` | `3201****1234` |
| `bankAccount` | `mask.bankCard` | `6222****5678` |
| `nickname` (含真名) | `mask.name` | `张*` |
| `realName` | `mask.name` | `张**` |
| `apiKey` / `secretId` / `secretKey` | `mask.apiKey` | `sk-****` |
| `JWT token` | `mask.token` | `***` |
| `payTransactionId` | 保留（非敏感） | 保持原文 |

### 4.3 日志拦截器（自动脱敏）

```typescript
// src/common/log-sanitizer.interceptor.ts
// 自动拦截所有请求/响应日志中的敏感字段，统一脱敏
const SENSITIVE_FIELDS = [
  "password", "credential", "apiKey", "secretKey", "secretId",
  "accessToken", "refreshToken", "idCard", "bankAccount",
];

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 3 || !obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitize(v, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE_FIELDS.includes(k) ? "***" : sanitize(v, depth + 1);
  }
  return result;
}
```

### 4.4 禁止记录的敏感数据

| 类型 | 说明 |
|------|------|
| 完整密码/密钥 | 任何情况下不得在日志中输出明文密码或 API 密钥 |
| 完整身份证号 | 仅保留前 4 后 4 位 |
| 完整银行卡号 | 仅保留前 4 后 4 位 |
| JWT Token 完整内容 | 仅记录过期时间 |
| 用户请求中的 `clientBirth` 原文 | 加密存储，日志仅记录加密后文本 |

---

## 5. 日志输出目标

### 5.1 开发环境

```
[2026-05-11 14:30:22.123] INFO  (ShopService): 用户下单成功
    userId: "u_abc123"
    orderId: "o_xyz789"
    amount: 99.00
```

使用 `pino-pretty` transport，彩色输出，方便开发者阅读。

### 5.2 生产环境

```json
{"level":"info","time":"2026-05-11T14:30:22.123Z","pid":12345,"service":"guoxue-server","traceId":"a1b2","context":"ShopService","msg":"用户下单成功","userId":"u_abc123","orderId":"o_xyz789","amount":99.00}
```

纯 JSON 输出到 stdout，由日志收集器（Filebeat/Fluentd）采集，发送到 Elasticsearch / Loki。

### 5.3 日志采集配置建议

```yaml
# docker-compose 中配置日志驱动
services:
  server:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
```

---

## 6. 日志查询示例（Loki/Elasticsearch）

```logql
# Loki LogQL
# 查询某用户的操作日志
{service="guoxue-server"} |= "u_abc123" | json

# 查询错误日志
{service="guoxue-server"} | level="error" | json | line_format "{{.msg}} {{.error}}"

# 查询慢支付回调
{service="guoxue-server"} | context="ShopService" | level="warn" | msg=~"支付超时"
```

---

## 7. 代码示例

### 7.1 标准业务日志

```typescript
import { Logger } from "@nestjs/common";

// NestJS 内置 Logger 自动走 PinoLoggerService
this.logger.log(`用户 ${userId} 下单成功, 订单号 ${orderId}, 金额 ${amount}`);
// 输出: { "level": "info", "msg": "用户 u1 下单成功, 订单号 o1, 金额 99.00", "context": "ShopService" }

this.logger.error(`支付回调验签失败: orderId=${orderId}`, err.stack);
// 输出: { "level": "error", "msg": "支付回调验签失败: orderId=o1", "stack": "..." }
```

### 7.2 结构化的业务日志

```typescript
// 使用 PinoLoggerService.raw() 输出完整结构化日志
const pino = (this.logger as any).raw?.() ?? this.logger;
pino.info({
  userId, orderId, type, amount,
  durationMs: Date.now() - start,
}, "订单创建完成");
```

### 7.3 请求级 traceId（自动注入）

```typescript
// RequestContext 中间件已自动为每个请求分配 traceId
// 所有日志自动携带 traceId，无需手动传递
// 可通过 RequestContext.traceId() 获取当前请求的 traceId
```
