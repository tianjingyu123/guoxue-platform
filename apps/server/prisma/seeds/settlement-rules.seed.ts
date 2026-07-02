/**
 * 统一结算引擎（T1）场景规则种子 — 可重复执行（upsert）
 * 运行：cd apps/server && npx tsx prisma/seeds/settlement-rules.seed.ts
 *
 * 已拍板参数（2026-07-02）：
 * - 缓冲期：打赏 T+3，其余 T+7（商家维持周期结算单，不走本表）
 * - 大额复核：单笔收益 ≥ ¥2000 冻结待人工复核
 * - 会员分佣：场景预置但 enabled=false，P2-b 订单接线时启用
 * 注：订单类场景（COURSE_ORDER/PRODUCT_ORDER/CIRCLE_JOIN）的 splits 需以代码真源核对
 *     CommissionConfig 语义后在 P2-b 迁入，本种子不盲转，避免错误资金配置。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPROVAL_THRESHOLD = 2000;

type Split = {
  role: "PROVIDER" | "STATION" | "OPERATOR" | "CIRCLE_OWNER" | "PLATFORM";
  rate: number;
  basis: "GROSS" | "PARENT_SPLIT";
  category: "COMMISSION" | "SERVICE" | "PLATFORM";
  parentRole?: string;
};

const RULES: Array<{
  scene: string;
  splits: Split[];
  bufferDays: number;
  enabled?: boolean;
  remark: string;
}> = [
  {
    scene: "QUESTION",
    splits: [
      { role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.2, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    remark: "付费提问：回答者80%（原 revenue DEFAULT_RATES 收编）",
  },
  {
    scene: "PEEK",
    splits: [
      { role: "PROVIDER", rate: 0.7, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.3, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    remark: "围观回答：回答者70%（原 revenue DEFAULT_RATES 收编）",
  },
  {
    scene: "AUDIO_CALL",
    splits: [
      { role: "PROVIDER", rate: 0.7, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.3, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    remark: "直播连麦嘉宾70%（原 revenue DEFAULT_RATES 收编）",
  },
  {
    scene: "LIVE_GIFT",
    splits: [
      { role: "PROVIDER", rate: 0.5, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.5, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 3,
    remark: "直播打赏：主播50%（2026-07-01 业务规则），缓冲 T+3",
  },
  {
    scene: "CONSULT_CALL",
    splits: [
      { role: "PROVIDER", rate: 0.5, basis: "GROSS", category: "SERVICE" },
      { role: "PLATFORM", rate: 0.5, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    remark: "达人语音咨询50/50：当前 consult-call 显式传 rate=0.5，P2-b 接线后以本规则为准",
  },
  {
    scene: "MEMBER_PURCHASE",
    splits: [
      { role: "STATION", rate: 0.1, basis: "GROSS", category: "COMMISSION" },
      { role: "PLATFORM", rate: 0.9, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    enabled: false,
    remark: "会员推广分佣（已拍板开通，比例暂定10%，P2-b 订单接线时确认并启用）",
  },
];

async function main() {
  for (const r of RULES) {
    await prisma.settlementRule.upsert({
      where: { scene: r.scene },
      create: {
        scene: r.scene,
        splits: r.splits,
        bufferDays: r.bufferDays,
        requireApproval: true,
        approvalThreshold: APPROVAL_THRESHOLD,
        enabled: r.enabled ?? true,
        remark: r.remark,
        updatedBy: "seed:settlement-rules",
      },
      update: {
        // 幂等重跑只补缺省，不覆盖后台可能已人工调整的 splits/比例
        remark: r.remark,
      },
    });
    console.log(`✓ ${r.scene}`);
  }
  const count = await prisma.settlementRule.count();
  console.log(`SettlementRule 共 ${count} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
