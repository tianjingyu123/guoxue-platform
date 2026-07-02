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
  selfDeal?: "BLOCK" | "ALLOW_FLAG"; // 自购策略：订单类=ALLOW_FLAG（自购返佣是明示产品能力·打标不计让利承诺）；充值必须 BLOCK（防套利）
};

/** 订单类场景通用 splits：过渡期实际比例以 CommissionConfig.rateA/运营商等级比例运行时 override 为准，此处 rate 为文档默认 */
const ORDER_SPLITS: Split[] = [
  { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION", selfDeal: "ALLOW_FLAG" },
  { role: "OPERATOR", rate: 0.1, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
];
const ORDER_REMARK = "订单推广分佣（影子双写）：实际比例以 CommissionConfig/运营商等级为真源 rateOverride 传入，P2-c 切换后以本规则为准";

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
      { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION", selfDeal: "ALLOW_FLAG" },
      { role: "PLATFORM", rate: 0.8, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    enabled: false,
    remark: "会员推广分佣（默认20%·2026-07-02 拍板·后台可改）；会员权益产品化待定，定稿后启用",
  },
  {
    scene: "COIN_RECHARGE",
    splits: [
      // 自购充值严禁返佣（selfDeal 默认 BLOCK）：否则自充可套取20%可提现佣金形成套利环路
      { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
      { role: "PLATFORM", rate: 0.8, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    enabled: false,
    remark: "虚拟币充值推广分佣（默认20%·2026-07-02 拍板·后台可改），充值链路接线时启用；自购充值不返佣（防套利）",
  },
  // ── 订单类场景（P2-b 影子双写接线）──
  { scene: "COURSE_ORDER", splits: ORDER_SPLITS, bufferDays: 7, remark: ORDER_REMARK },
  { scene: "PRODUCT_ORDER", splits: ORDER_SPLITS, bufferDays: 7, remark: ORDER_REMARK },
  { scene: "CIRCLE_JOIN", splits: ORDER_SPLITS, bufferDays: 7, remark: ORDER_REMARK },
  { scene: "BOT_CALL", splits: ORDER_SPLITS, bufferDays: 7, remark: ORDER_REMARK },
  { scene: "MERCHANT_PRODUCT_ORDER", splits: ORDER_SPLITS, bufferDays: 7, remark: ORDER_REMARK },
];

async function main() {
  for (const r of RULES) {
    const existing = await prisma.settlementRule.findUnique({ where: { scene: r.scene } });
    if (!existing) {
      await prisma.settlementRule.create({
        data: {
          scene: r.scene,
          splits: r.splits,
          bufferDays: r.bufferDays,
          requireApproval: true,
          approvalThreshold: APPROVAL_THRESHOLD,
          enabled: r.enabled ?? true,
          remark: r.remark,
          updatedBy: "seed:settlement-rules",
        },
      });
      console.log(`✓ 创建 ${r.scene}`);
    } else if (existing.updatedBy === "seed:settlement-rules") {
      // 仅覆盖未被后台人工调整过的规则；人工改过（updatedBy 非种子）则不动比例
      await prisma.settlementRule.update({
        where: { scene: r.scene },
        data: { splits: r.splits, bufferDays: r.bufferDays, remark: r.remark },
      });
      console.log(`✓ 更新 ${r.scene}（未被人工修改，按种子刷新）`);
    } else {
      console.log(`- 跳过 ${r.scene}（已被 ${existing.updatedBy} 人工调整）`);
    }
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
