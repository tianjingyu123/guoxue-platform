# 权益异常只读检测（候选实现 · 阶段一）

状态：**候选，未接入生产告警、未连接任何生产数据库。**
基线：`release/integration-20260801` @ `2e458597`（**这是当前本地工作树的分支，不代表生产接收分支；合入目标未确定，待指定**）。
工作树：`.worktrees/entitlement-audit-20260918`，分支 `codex/entitlement-audit-20260918`。

## 它做什么

用只读查询找出"钱收了但权益不对"的订单，输出脱敏汇总，交人工处置。

**它不做**：不自动补发、不自动退款、不写任何业务数据、不发告警、不改支付/圈子/学习逻辑。

## 文件

| 文件 | 作用 |
|---|---|
| `truth-sources.mjs` | 订单类型 → 实际权益真源映射表。**口径的唯一来源**，改口径先改这里 |
| `rules.mjs` | 纯函数规则集。不碰数据库、不碰网络，可用合成数据完整自测 |
| `fixtures.mjs` | 合成数据集（全部 `syn-` 前缀），覆盖八类场景 |
| `selftest.mjs` | 规则自测 + 误报边界断言 + 只读门禁用例 |
| `queries.sql` | 取数 SQL，全部 SELECT，参数化绑定，字段最小化 |
| `run.mjs` | 运行器，含连接与只读门禁 |

## 运行

```bash
# 规则自测（不连任何数据库）
node scripts/ops/entitlement-audit/selftest.mjs

# SQL 门禁自检（不连任何数据库）
node scripts/ops/entitlement-audit/run.mjs --dry-run

# 对隔离测试库执行（需自备 pg 驱动；本脚本不安装依赖、不改 package.json）
AUDIT_ALLOW_DB=1 node scripts/ops/entitlement-audit/run.mjs \
  --dsn="postgres://readonly_user@<isolated-host>:5432/<db>" \
  --allow-host=<isolated-host> \
  --i-understand-read-only \
  --from=2026-09-11T00:00:00+08:00 \
  --to=2026-09-18T00:00:00+08:00 \
  --grace-minutes=15 \
  --out=artifacts/entitlement-audit/report.json
```

## 运行边界（代码层强制）

| 边界 | 实现 |
|---|---|
| 只执行 SELECT | `assertReadOnlySql()` 对每条语句做关键字/起始词/多语句三重门禁；`queries.sql` 解析时即校验 |
| 只读事务 | `BEGIN READ ONLY` + `SET LOCAL default_transaction_read_only = on`，结束一律 `ROLLBACK` |
| 超时 | `statement_timeout` 与 `idle_in_transaction_session_timeout`，默认 15s，上限 60s |
| 时间窗 | `--from` / `--to` 必填，跨度上限 31 天 |
| 分页与总量 | 单页 ≤1000，页数 ≤50，总行数 ≤20000，超限截断并提示缩小窗口 |
| 连接白名单 | 必须 `--allow-host=<host>` 且与 DSN 主机完全一致 |
| 生产拒绝 | DSN 主机命中 `api.*` / `prod*` / `prd` / `rebugx.cn` 等特征时**直接拒绝**，白名单也不放行 |
| 双重开关 | 需同时 `AUDIT_ALLOW_DB=1` 与 `--i-understand-read-only` |
| 不告警 | `--emit-alerts` 在本阶段被硬禁用 |

## 输出边界

- **默认只输出汇总**：各规则命中数、观察项计数、发放延迟分桶、真源未覆盖计数、幂等横切计数。
- 明细需显式 `--with-findings`，且明细本身也是脱敏的：
  - 订单/用户/目标均为 `前4位…长度#HMAC短摘要`，**不可逆**；
  - 摘要盐默认每次运行随机生成（跨报告不可关联）；需跨报告追踪时由调用方显式设 `AUDIT_REF_SALT`；
  - 金额只输出量级桶（`<10` / `10-100` / …），不输出精确金额；
  - 时长只输出桶（`<1m` / `<1h` / …），不输出精确毫秒。
- **不取也不输出**：手机号、邮箱、昵称、收货地址、支付凭证明文、聊天内容、搜索词。
  `queries.sql` 的 `users` 查询显式只取 `id / memberLevel / memberExpire`。

## 规则与严重级别

| 规则 | 级别 | 含义 | 不等于什么 |
|---|---|---|---|
| `fulfillment_gap` | high | 已支付但**实际访问真源**未被推进 | — |
| `ledger_inconsistent` | medium | 支付后处理器应写权益台账却没写 | **不等于用户拿不到**。课程访问判定读的是 `Order`，台账缺失只影响权益中心展示与后续迁移；结果里带 `impactsAccess` 字段说明 |
| `refund_not_revoked` | high | 已退款但权益仍可用（台账未冲正 / 真源未回收） | — |
| `order_status_stale` | low | 圈子订单已履约但状态仍停在 PAID | 不影响可用 |
| `idempotency_violation` | critical | 重复 GRANT / 重复 payTransactionId / 重复 MemberPurchase.orderId | 预期恒为 0，非 0 即唯一约束或幂等键有问题 |
| `balance_drift` | info | 余额与台账复算不一致；或 `ACTIVE` 但已过期 | 后者是已知设计（余额只在 grant/consume/revoke 时重算，读模型用 `effectiveStatus` 兜底），**只计数不告警** |

另有两个**不产生 finding、只产生计数**的观察项：
- `grantDelay`：台账首条 GRANT 与 `paidAt` 的差值分桶。数字权益类同事务，正常落在 `<1s`；落在更大桶说明走了旁路（线下确认收款、Apple IAP、圈子客户端补调）。
- `needsReview`：真源未定位的订单类型计数。**"没报异常"不等于"全都正常"**，这一栏就是为了不让未覆盖被静默。

## 误报边界（已用合成数据验证）

规则**不会**把下列情况判为异常：

| 情况 | 排除方式 |
|---|---|
| 允许的发放延迟 | `--grace-minutes`（默认 15 分钟）内不判 |
| 自然到期（圈子成员被 `cleanupExpiredMembers` 硬删） | 订单已 `COMPLETED` 视为曾成功履约；且时间窗上限 31 天 << 圈子 365 天有效期 |
| 自然到期（权益余额 `ACTIVE` 但过期） | 归 `balance_drift` 观察项，不进 finding |
| 退款且已正确冲正 | `reversesLedgerId` 指向原 GRANT 即视为已冲正 |
| 会员退款但该用户另有未退款有效会员单 | 先排除"其他有效会员单"再判 |
| 续费（`expireAt` 顺延而非新建成员） | 判据是"到期时间是否推进到 `paidAt` 之后"，不是"是否新建行" |
| 多次购买同一课程 | 逐单判定，只报缺台账的那一单 |
| 重复支付回调 | 指标只读 `Order` / `EntitlementLedger`，不读回调次数；重复回调被 `payTransactionId @unique` 与 `idempotencyKey @unique` 挡住，故不会产生第二条事实 |
| 实物订单 | `PRODUCT` 在 SQL 层就排除 |
| 用户主动退圈 / 被圈主移出 | 订单已 `COMPLETED` → 不判 |

**仍可能误报/漏报的情况（如实列出）**：

1. 圈子订单**从未 COMPLETED 但用户确实进过圈又退出**——本规则会判为 `fulfillment_gap`。理论上不应出现（`confirmJoin` 成功即置 COMPLETED），但若存在历史数据或管理员手工加成员的路径，会误报。
2. `BUNDLE` / `BOT_SERVICE` / `PAIPAN` / `LIVESTREAM` 本次未定位到统一访问判定入口，只做台账观察，**可能漏报**。计入 `needsReview`。
3. 线下确认收款（`adminPayOrder`）与 Apple IAP 的发放延迟天然非零，会落在较大延迟桶，**不是异常**。
4. 时间窗边界上的订单（支付在窗口外、退款在窗口内）只会被退款相关规则覆盖。
5. 合成数据无法覆盖真实数据的脏数据形态（历史迁移数据、字段为空、枚举值漂移）。**首次对隔离测试库或脱敏样本执行后，必须人工核对前 20 条再决定后续动作。**

## 后续接入告警的约定（本阶段不做）

- 使用**明确的启停开关**（布尔值），例如 `sentinel.entitlement_anomaly.enabled = false|true`。
- **不得**用"把阈值设成极大值"代替关闭——那会让规则看起来在跑、实际永远不触发，与"看着有其实不会响"是同一类问题。
- 启用前置条件：① 在隔离测试库或脱敏样本上跑过全量；② 人工核对前 20 条确属真异常；③ 误报率记录在案。
