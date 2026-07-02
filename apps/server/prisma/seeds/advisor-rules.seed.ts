/**
 * 智能商业顾问（T2-P1）首发规则种子 — 站长/驿站两角色，可重复执行
 * 运行：cd apps/server && npx tsx prisma/seeds/advisor-rules.seed.ts
 * 更新策略与 settlement-rules 一致：仅覆盖未被后台人工调整过的规则（updatedBy 判定）
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RULES = [
  // ── 站长（STATION_MASTER）──
  {
    roleType: "STATION_MASTER",
    ruleKey: "station_earning_wow_drop",
    metric: "station_earning_wow_drop",
    condition: { thresholdPct: 30 },
    severity: "WARN",
    suggestion:
      "您的推广佣金近7天 ¥{{last7}}，比前一周（¥{{prev7}}）下降了 {{dropPct}}%。建议本周挑 1-2 件热销商品或新课，用推广素材重新触达您的用户。",
    actions: [
      { label: "去选素材", type: "NAVIGATE", target: "/pkg-operator/station-materials/index" },
      { label: "查看收益明细", type: "NAVIGATE", target: "/pkg-operator/station-earnings/index" },
    ],
  },
  {
    roleType: "STATION_MASTER",
    ruleKey: "station_zero_earning",
    metric: "station_zero_earning",
    condition: { days: 14 },
    severity: "INFO",
    suggestion:
      "您的分站已连续 {{days}} 天没有新佣金。分享是收益的起点——把分站链接或商品海报发到朋友圈/社群，通常当周就能看到变化。",
    actions: [
      { label: "生成推广海报", type: "NAVIGATE", target: "/pkg-operator/station-poster/index" },
    ],
  },
  {
    roleType: "STATION_MASTER",
    ruleKey: "station_idle_locked_users",
    metric: "station_idle_locked_users",
    condition: { days: 30, thresholdPct: 70 },
    severity: "WARN",
    suggestion:
      "您的 {{total}} 位归属用户中有 {{idle}} 位（{{idlePct}}%）近 {{days}} 天没有消费。老用户唤醒比拉新便宜得多——建议分享一批限时优惠内容定向触达。",
    actions: [
      { label: "去选推广内容", type: "NAVIGATE", target: "/pkg-operator/station-materials/index" },
    ],
  },
  // ── 驿站（STATION_OFFLINE_OWNER）──
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_stock_low",
    metric: "offline_stock_low",
    condition: { threshold: 5 },
    severity: "WARN",
    suggestion: "有 {{count}} 件在售商品库存不足 {{threshold}} 件，缺货会直接损失到店转化，建议尽快补货或下架。",
    actions: [{ label: "去处理库存", type: "NAVIGATE", target: "/pkg-offline/manage-products/index" }],
  },
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_pending_bookings",
    metric: "offline_pending_bookings",
    condition: {},
    severity: "WARN",
    suggestion: "有 {{count}} 条讲师预约待您确认。响应越快，讲师排期越稳，建议当天处理完毕。",
    actions: [{ label: "去确认预约", type: "NAVIGATE", target: "/pkg-offline/manage-teachers/index" }],
  },
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_revenue_wow_drop",
    metric: "offline_revenue_wow_drop",
    condition: { thresholdPct: 30 },
    severity: "WARN",
    suggestion:
      "驿站近7天营收 ¥{{last7}}，比前一周（¥{{prev7}}）下降 {{dropPct}}%。建议查看近期课程排期是否偏少，或发起一场体验课/沙龙拉动到店。",
    actions: [{ label: "去排课程", type: "NAVIGATE", target: "/pkg-offline/manage-courses/index" }],
  },
];

async function main() {
  for (const r of RULES) {
    const existing = await prisma.advisorRule.findUnique({ where: { ruleKey: r.ruleKey } });
    if (!existing) {
      await prisma.advisorRule.create({
        data: { ...r, actions: r.actions, condition: r.condition, updatedBy: "seed:advisor-rules" },
      });
      console.log(`✓ 创建 ${r.ruleKey}`);
    } else if (existing.updatedBy === "seed:advisor-rules") {
      await prisma.advisorRule.update({
        where: { ruleKey: r.ruleKey },
        data: { condition: r.condition, severity: r.severity, suggestion: r.suggestion, actions: r.actions },
      });
      console.log(`✓ 更新 ${r.ruleKey}`);
    } else {
      console.log(`- 跳过 ${r.ruleKey}（已被人工调整）`);
    }
  }
  console.log(`AdvisorRule 共 ${await prisma.advisorRule.count()} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
