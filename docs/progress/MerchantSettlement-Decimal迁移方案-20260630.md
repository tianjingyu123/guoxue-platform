# MerchantSettlement Int→Decimal 迁移方案 — 2026-06-30

> 来源：后端审计 B5-1 + 金额精度专项遗留。`MerchantSettlement` 4 个金额字段用 `Int` 存「元」，结算时 `Math.round` 截整到元**丢分**。金额专项当时未一并修，因它需 schema 迁移（停机）。
> 性质：schema 变更，**方案先行 + 需用户停机配合**（与 db-opt-05 一致的严谨度）。

---

## 一、问题与现状（已核实）

**schema `MerchantSettlement`（4395-4414）** — 4 个金额字段是 `Int`：
```prisma
orderCount       Int  @default(0)   // 数量，保留 Int ✓
totalRevenue     Int  @default(0)   // ✗ 应 Decimal(12,2)
commission       Int  @default(0)   // ✗
settlementAmount Int  @default(0)   // ✗
paidAmount       Int?               // ✗
```

**service 丢分点** — `merchant-settlement.service.ts`：
- `:96 const totalRevenue = Math.round(Number(orderAgg._sum.amount ?? 0))` —— **截整到元，丢分**（如 ¥1234.56 → 1235）。
- `:103 const commission = totalRevenue - Math.round(totalRevenue * merchantRate)` —— 基于已截整值。
- `:104 settlementAmount = totalRevenue - commission`。
- `paySettlement`（写 `paidAmount`）—— 执行时核同样规整。
- 对照：同文件 `getRevenueOverview:38-41`、`calculateCommission:57-58` 已用 `Math.round(x*100)/100` 规整到分（但它们只展示、不写 DB，无遗留）。

**影响面**：grep 到 10 文件引用 `merchantSettlement`/金额字段，主要 = `merchant-admin.controller` / `merchant-backend.controller`（后台展示结算单）+ 各 `*.spec`。

---

## 二、改造方案

### 1. schema（4 字段 Int → Decimal）
```prisma
totalRevenue     Decimal  @default(0) @db.Decimal(12, 2)
commission       Decimal  @default(0) @db.Decimal(12, 2)
settlementAmount Decimal  @default(0) @db.Decimal(12, 2)
paidAmount       Decimal? @db.Decimal(12, 2)
```
（`orderCount` 保持 `Int`。）

### 2. service（去截整，规整到分）
- `:96` `Math.round(Number(amount))` → `Math.round(Number(amount) * 100) / 100`（规整到分，不再截整到元）。
- `:103/104` commission/settlementAmount 用规整后的值；分账差额用 `totalRevenue - commission` 保证两者之和 == 总额（避免分账不平）。
- `paySettlement` 的 `paidAmount` 写入同样规整。

### 3. 读取点适配（关键风险）
Prisma `Decimal` 字段在 JS 是 `Decimal.js` 对象、JSON 序列化为 **string**（原 `Int` 是 number）。需逐点核：
- **后台展示**（merchant-admin/backend controller）：若直接返回 settlement 对象 → 前端收到 string 金额。需确认 admin 前端展示/计算处用 `Number()` 包裹（多数展示可直接显示 string；若做算术或图表需转）。
- **任何 `settlement.totalRevenue` 参与算术的点** → 加 `Number()`。
- 执行时 `grep` 10 个引用文件逐一过。

### 4. 单测
更新 `merchant-settlement.service.spec` / 相关 spec 的金额断言（整数 → 两位小数），补一个"含分金额不丢分"用例（如订单 ¥1234.56 → settlement 保留 .56）。

---

## 三、停机迁移步骤（参照已走通的 db-opt-05 流程）
1. 备份：`schema.prisma` 复制 + `pg_dump` 导出 `MerchantSettlement` 表。
2. 改 schema 4 字段为 Decimal。
3. `prisma validate`。
4. 改 service（规整）+ 读取点适配 + spec，本地 `tsc` + `jest` 绿。
5. **停机迁移**（用户终端，沙箱无法 generate/db execute）：`pm2 stop guoxue-api` → `prisma generate`（无 EPERM）→ `prisma db execute --file` 跑 `ALTER TABLE "MerchantSettlement" ALTER COLUMN "totalRevenue" TYPE numeric(12,2)`（4 列，整数值自动无损转 numeric：`100 → 100.00`）→ `nest build`（EXIT 0）→ `pm2 restart guoxue-api` → `home=200` → `schema-db-check 0 不一致`。
6. `jest` 全绿。

新建 SQL：`prisma/manual-sql/db-opt-09-merchant-settlement-decimal.sql`（沿用编号序列）。

---

## 四、风险与回滚
- **数据无损**：`Int → numeric(12,2)` 是扩展型转换，现有整数值无损（`1235 → 1235.00`）。**历史已丢的分不恢复**（如旧单 1235 元本应 1234.56，已不可考），但新结算单起不再丢分。
- **回滚**：`numeric → Int` 会截断小数。回滚前若已生成带小数的新结算单，回滚会丢这些分 → 回滚需趁早（迁移后立即验证，有问题马上回滚 + restore pg_dump）。
- **读取点**：Decimal 序列化为 string 是最大隐性风险，必须逐点核 `Number()`，否则前端金额展示/计算可能异常。
- **需用户配合**：generate + db execute + pm2 重启 + e2e 走查一笔真实结算（沙箱无法跑这些）。

---

## 五、工作量与建议
- 工作量：小（schema 4 字段 + service 2-3 处 + 读取点适配约 10 文件核查 + spec）。
- 但 = schema 迁移 + 停机 + 读取点适配，**风险集中在读取点（Decimal→string）**，须谨慎逐点核。
- 建议：独立窗口执行，先在本地完成代码改动 + tsc/jest 绿，再约用户停机迁移 + e2e 验证。是否执行请拍板。
