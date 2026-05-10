# 性能压测脚本

使用 [Artillery](https://www.artillery.io/) 进行负载测试。

## 前置条件

```bash
# 安装 Artillery（全局）
pnpm add -g artillery

# 或通过 npx 运行（无需安装）
npx artillery run test/load/critical-paths.yml
```

## 脚本说明

| 脚本 | 用途 | 运行时间 |
|------|------|----------|
| `smoke-test.yml` | 冒烟测试 — 快速验证所有端点可访问 | ~10秒 |
| `critical-paths.yml` | 核心路径压测 — 50~100并发全栈测试 | ~120秒 |
| `throttle-test.yml` | 限流验证 — 验证 StrictThrottleGuard 是否生效 | ~5秒 |

## 运行压测

### 1. 冒烟测试（上线前必跑）

```bash
npx artillery run test/load/smoke-test.yml
```

### 2. 核心路径压测

```bash
# 基础运行
npx artillery run test/load/critical-paths.yml

# 输出 JSON 报告
npx artillery run --output report.json test/load/critical-paths.yml

# 生成 HTML 报告
npx artillery report report.json
```

### 3. 限流验证

```bash
npx artillery run test/load/throttle-test.yml
```

## 压测指标参考

| 指标 | 正常 | 警告 | 危险 |
|------|------|------|------|
| P50 延迟 | < 100ms | 100-300ms | > 300ms |
| P95 延迟 | < 300ms | 300-1000ms | > 1s |
| P99 延迟 | < 1s | 1-3s | > 3s |
| 错误率 | < 0.1% | 0.1-1% | > 1% |
| RPS | - | 低于预期50% | 低于预期80% |

## 注意事项

1. 压测前确保服务器已启动：`pnpm dev:server`
2. 不要在生产环境直接压测，使用 staging 环境
3. 压测会产生大量日志，建议设置 `LOG_LEVEL=warn`
4. 限流压测会触发 429 状态码，属于正常行为
