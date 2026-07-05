/**
 * 智能商业顾问规则种子 — 五角色全覆盖（T2-P1 站长/驿站 + T2-P3 圈主/讲师/运营商），可重复执行
 * 现含 16 条：站长3 / 驿站6(含开业SOP) / 圈主3 / 讲师2 / 运营商2。生产库已 seed 生效（2026-07-05 核实）。
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
  // ── 驿站开业阶段规则（T8-P1b 加盟 SOP·共用 offline_onboarding 探针，仅 condition 不同）──
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_onboarding_d7",
    metric: "offline_onboarding",
    condition: { minDays: 7, checkKind: "content" },
    severity: "INFO",
    suggestion:
      "驿站已开业 {{ageDays}} 天，目前课程 {{courses}} 门、在售商品 {{products}} 件。首个课程/商品是获客的起点——建议本周完成首次上架，让驿站主页「有内容可看、有课程可报」。",
    actions: [
      { label: "查看开业指南", type: "NAVIGATE", target: "/pkg-offline/onboarding/index" },
      { label: "去排课程", type: "NAVIGATE", target: "/pkg-offline/manage-courses/index" },
    ],
  },
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_onboarding_d30",
    metric: "offline_onboarding",
    condition: { minDays: 30, checkKind: "registrations", threshold: 5 },
    severity: "WARN",
    suggestion:
      "驿站开业 {{ageDays}} 天，累计有效报名 {{count}} 人（目标 {{threshold}} 人）。首月冷启动三件事：把课程分享到本地社群、办一场免费体验课、邀请到店客人现场扫码报名——开业指南里有完整打法。",
    actions: [{ label: "查看开业指南", type: "NAVIGATE", target: "/pkg-offline/onboarding/index" }],
  },
  {
    roleType: "STATION_OFFLINE_OWNER",
    ruleKey: "offline_onboarding_d90",
    metric: "offline_onboarding",
    condition: { minDays: 90, checkKind: "events", threshold: 1 },
    severity: "INFO",
    suggestion:
      "驿站已运营 {{ageDays}} 天，还没有举办过一场活动。一场雅集/读书会是激活会员、带动口碑传播的最好方式——建议本月安排一场，用回顾照片墙沉淀二次传播素材。",
    actions: [
      { label: "去办活动", type: "NAVIGATE", target: "/pkg-offline/manage-events/index" },
      { label: "查看开业指南", type: "NAVIGATE", target: "/pkg-offline/onboarding/index" },
    ],
  },
  // ── 圈主（T2-P3）──
  {
    roleType: "CIRCLE_OWNER",
    ruleKey: "circle_activity_drop",
    metric: "circle_activity_drop",
    condition: { thresholdPct: 40 },
    severity: "WARN",
    suggestion:
      "圈子近7天发帖 {{last7}} 条，比前一周（{{prev7}} 条）下降 {{dropPct}}%。建议发起一个话题讨论（如八字案例解析、经典共读打卡）重新激活氛围。",
    actions: [{ label: "去发起话题", type: "NAVIGATE", target: "/pkg-circle/circles/editor?circleId={{subjectId}}" }],
  },
  {
    roleType: "CIRCLE_OWNER",
    ruleKey: "circle_member_growth_stall",
    metric: "circle_member_growth_stall",
    condition: { days: 14, minMembers: 10 },
    severity: "INFO",
    suggestion:
      "圈子已连续 {{days}} 天没有新成员加入（当前 {{total}} 人）。建议把圈内一篇优质内容分享到站外，或请活跃成员帮忙转发拉新。",
    actions: [{ label: "查看圈子数据", type: "NAVIGATE", target: "/pkg-circle/circles/dashboard?id={{subjectId}}" }],
  },
  {
    roleType: "CIRCLE_OWNER",
    ruleKey: "circle_zero_join_revenue",
    metric: "circle_zero_join_revenue",
    condition: { days: 30 },
    severity: "INFO",
    suggestion:
      "您的付费圈子近 {{days}} 天没有新付费加入。建议检查入圈介绍是否清晰展示了权益价值，或用一场免费直播/公开内容为圈子引流。",
    actions: [{ label: "查看圈子数据", type: "NAVIGATE", target: "/pkg-circle/circles/dashboard?id={{subjectId}}" }],
  },
  // ── 讲师（T2-P3）──
  {
    roleType: "LECTURER",
    ruleKey: "teacher_new_bad_review",
    metric: "teacher_new_bad_review",
    condition: { days: 7, maxRating: 2 },
    severity: "WARN",
    suggestion:
      "近 {{days}} 天您的课程收到 {{count}} 条低分评价。及时回复能显著挽回口碑——建议逐条查看并真诚回应学员的具体问题。",
    actions: [{ label: "去看评价", type: "NAVIGATE", target: "/pkg-creator/course-reviews/index" }],
  },
  {
    roleType: "LECTURER",
    ruleKey: "teacher_no_new_content",
    metric: "teacher_no_new_content",
    condition: { days: 45 },
    severity: "INFO",
    suggestion:
      "您已 {{days}} 天没有发布新课程。持续更新是学员关注度的关键——哪怕一节短课或一次答疑直播，都能有效维持活跃。",
    actions: [{ label: "去讲师中心", type: "NAVIGATE", target: "/pkg-creator/teacher-dashboard/index" }],
  },
  // ── 运营商（T2-P3）──
  {
    roleType: "OPERATOR",
    ruleKey: "operator_dormant_stations",
    metric: "operator_dormant_stations",
    condition: { days: 30 },
    severity: "WARN",
    suggestion:
      "您名下 {{total}} 位站长中有 {{dormant}} 位近 {{days}} 天零业绩。建议逐一联系了解困难，分享一份本周热销素材包帮他们重新开张。",
    actions: [{ label: "查看沉寂站长", type: "NAVIGATE", target: "/pkg-operator/dormant/index" }],
  },
  {
    roleType: "OPERATOR",
    ruleKey: "operator_new_station_stall",
    metric: "operator_new_station_stall",
    condition: { days: 14 },
    severity: "WARN",
    suggestion:
      "有 {{stalled}} 位新站长加入 {{days}} 天仍未产生首笔佣金。新人首单是留存的分水岭——建议一对一辅导：帮他们完成分站装修并发出第一条推广。",
    actions: [{ label: "查看团队", type: "NAVIGATE", target: "/pkg-operator/team/index" }],
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
