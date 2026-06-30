# 圈子达人咨询交易子系统 — 规格 V1.0（待审）

> 2026-06-25 制定，供用户审阅。咨询 = **图文付费问答** + **语音/视频付费通话**两种形态。
> 关键结论：**图文问答后端已完整实现，仅需前端接线（零资金决策）；通话形态后端完全缺失，需建表+RTC+资金规则（本文档重点）。**

---

## 一、现状盘点（体检结论）

| 能力 | 后端 | 说明 |
|---|---|---|
| 达人列表 | ✅ 已有 | consult-experts.vue 第1批已真实化（达人 + 金币咨询价） |
| **图文付费问答** | ✅ **完整已有** | `question` 模块 / `PaidQuestion` 表，见下 §二 |
| 定价字段 | ✅ 已有 | `CircleMember.questionPriceCoin` / `callPricePerMinuteCoin` / `questionTimeoutHours` / `callAvailableHours` |
| **语音/视频通话** | ❌ **完全缺失** | 无通话表/端点/RTC 集成，见下 §三 |
| 资金基建 | ✅ 已有 | `coin.spend/refund`（扣费/退费）、`revenue.record`（达人分账）、`commission.reverseCommission`（冲正） |

---

## 二、图文付费问答（后端已实现，仅需前端接线）

### 后端现成端点（`question` 模块，@Controller("question")）
| 端点 | 作用 | 资金逻辑（已实现） |
|---|---|---|
| `POST /question/ask` | 付费提问 | 事务内 `coin.spend(priceCoin, PAID_QUESTION)` + 建 `PaidQuestion(PENDING)`；校验回答者在圈子、不能问自己 |
| `POST /question/:id/answer` | 达人回答 | 状态→ANSWERED + `revenue.record(scene=QUESTION, amountCoin=priceCoin)` 给达人分账 |
| `POST /question/:id/reject` | 达人拒答 | `coin.refund` **全额退还**提问者 + 状态→REFUNDED |
| `POST /question/admin/refund-expired` | 超时退款 | 按各自 `questionTimeoutHours` 超时未答自动全额退 |
| `POST /question/:id/peek` | 围观付费 | 消耗围观币查看已回答内容（付费墙） |
| `GET /question` | 问答列表 | 圈子维度，公开/私密筛选 |
| `GET /question/:id` | 问答详情 | 付费墙保护（非当事人/未围观时 answer 隐藏） |

### 图文计费/退款规则（后端既定，无需决策）
- 计费：提问一次性扣 `priceCoin`（金币，前端取达人 `questionPriceCoin`）。
- 分账：达人回答后 `revenue.record` 入账（具体分账比例见 RevenueService，沿用现有）。
- 退款：达人拒答 → 全额退；超时未答 → 全额退。
- 围观：`peekPriceCoin` 二次变现（其他用户付费围观已答问题）。

### 前端接线清单（**阶段1，无资金决策，可立即执行**）
| 前端页 | 接 |
|---|---|
| `consult-ask.vue`（发起提问） | `POST /question/ask` + 防重复 |
| `my-questions.vue`（我的提问） | `GET /question?askerId=me` |
| `consult-orders.vue`（咨询订单） | `GET /question`（问答即订单）|
| 问答详情 | `GET /question/:id`（含付费墙）|
| 达人回答入口（达人端） | `POST /question/:id/answer` / `reject` |

---

## 三、语音/视频付费通话（后端缺失，需建设 — **本文档重点，含资金决策**）

### 计费模型（提案，待你确认）
- 单价：达人 `callPricePerMinuteCoin`（金币/分钟）。
- **预扣机制**（提案）：发起通话时按"预估时长"或"余额上限"预扣金币，通话结束按**实际时长**结算、多退少不补（余额耗尽自动挂断）。
  - 备选：纯后付（通话结束一次性扣）——风险是余额不足赖账。**推荐预扣。**
- 可接时段：达人 `callAvailableHours` 限制。

### 分账规则（提案，**需你定比例**）
- 通话费分账：达人 X% / 平台 Y%。
  - 退款系统里站长有佣金分成；这里建议沿用同一分账框架（`revenue.record` + 可能的站长佣金）。
  - **决策点①：达人/平台分账比例（如 80/20？）**

### 退款规则（提案，**需你确认边界**）
- 未接通（达人未接/超时未接）→ 预扣全额退。
- 通话中途异常掉线 → 按已通话时长结算，剩余预扣退还。
- 达人主动挂断 → 按实际时长结算。
- **决策点②：通话最短计费单位（不足1分钟按1分钟？按秒？）、掉线判定时长。**

### 状态机（提案）
```
发起(预扣) → 等待接听 → [达人接听]通话中 → [任一方挂断]结算分账
                      → [超时未接/达人拒接]全额退款
                      → [通话中余额耗尽]自动挂断+结算
```

### 表设计（提案）
```prisma
model ConsultCall {
  id              String    @id @default(uuid())
  circleId        String
  callerId        String    // 发起方（咨询者）
  expertId        String    // 达人
  type            String    // VOICE / VIDEO
  pricePerMinute  Int       // 下单时快照的金币单价
  prepaidCoin     Int       // 预扣金币
  status          String    @default("WAITING") // WAITING/ONGOING/ENDED/REFUNDED/MISSED
  rtcRoomId       String?   // RTC 房间
  startAt         DateTime?
  endAt           DateTime?
  durationSec     Int       @default(0)
  settledCoin     Int       @default(0) // 实际结算金币
  refundedCoin    Int       @default(0)
  createdAt       DateTime  @default(now())
  @@index([callerId])
  @@index([expertId, status])
}
```

### RTC 技术方案（**需你选型**）
- **决策点③：通话走哪套 RTC？**
  - 选项A：腾讯 TRTC（实时音视频，真人对真人）——平台直播已用腾讯云 CSS（`LiveStreamService`），可扩展 TRTC。需配 SDKAppId/密钥。
  - 选项B：Coze voice-room（`bot` 模块有 `POST /bots/:id/voice-room`）——但那是人机AI语音，非真人对真人，**不适用达人咨询**。
  - 推荐 A（TRTC）。⚠️ 本地无法完整验证（需真实 RTC 配置 + 双端），只能做到"建房间+计费逻辑"，真机联调上线时做。

### 资金事务设计（复用现有基建）
- 预扣：`coin.spend(prepaidCoin, scene=CONSULT_CALL_PREPAY)` 事务内建 `ConsultCall`。
- 结算：通话结束 → 算 `settledCoin = ceil(durationSec/60) × pricePerMinute` → `revenue.record` 给达人分账 → `refundedCoin = prepaidCoin - settledCoin` 退回 `coin.refund`。
- 全部走事务，参考 `circle-refund` 的 `executeRefund` 事务模式。

---

## 四、分阶段实施计划

| 阶段 | 内容 | 是否需你决策 |
|---|---|---|
| **阶段1** 图文接线 | consult-ask/my-questions/orders/详情 接 question 模块 | ❌ 无，可立即做 |
| **阶段2** 通话后端 | 建 ConsultCall 表 + 端点 + 计费/结算/退款事务 | ✅ 决策①②（分账/计费规则） |
| **阶段3** 通话 RTC+前端 | TRTC 集成 + my-calls/发起通话前端 | ✅ 决策③（RTC选型）+ 上线真机联调 |

---

## 五、决策点（用户 2026-06-25 已确认）
1. **通话分账比例**：达人 **50%** / 平台 **50%**（五五分）✅
2. **通话计费**：虚拟币**预充值预扣**；最短计费单位**不足 1 分钟按 1 分钟**（durationSec 向上取整到分钟）✅
3. **RTC 选型**：**腾讯 TRTC**（与平台直播同腾讯云体系）✅ ⚠️ 本地无法完整验证，真机联调留上线时做
4. **阶段1 图文接线**：用户确认**现在就做**✅

> 备注：图文部分（阶段1）严格说不涉及任何资金规则决策（后端既定），可不等本规格审批先行真实化。通话部分（阶段2/3）涉及真实分账与 RTC，需你确认上述决策点后实施。
