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
  // ASKER = 围观场景的提问者分成（其付费问题被第三方围观时按比例分账）
  role: "PROVIDER" | "ASKER" | "STATION" | "OPERATOR" | "CIRCLE_OWNER" | "PLATFORM";
  rate: number;
  basis: "GROSS" | "PARENT_SPLIT";
  category: "COMMISSION" | "SERVICE" | "PLATFORM";
  parentRole?: string;
  note?: string;
};

// 自购规则（2026-07-02 拍板）：站长自购在下单时直接立减、不产生佣金（退款退实付价）；引擎 L3 对佣金类目硬拦截自买自卖

/** 订单类场景通用 splits：过渡期实际比例以 CommissionConfig.rateA/运营商等级比例运行时 override 为准，此处 rate 为文档默认 */
const ORDER_SPLITS: Split[] = [
  { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
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
    // 董事长拍板 2026-07-10：围观 平台40% / 提问者30% / 达人30%（原「达人70%」已废弃）。
    // 生产 DB 已按此修正（20260714_settlement_rules_fix.sql）；种子必须同步，
    // 否则谁重跑 seed 会把 upsert(enabled 默认 true) 覆盖回错值 → 达人被多发到 70%。
    splits: [
      { role: "PROVIDER", rate: 0.3, basis: "GROSS", category: "SERVICE", note: "达人 30%" },
      { role: "ASKER", rate: 0.3, basis: "GROSS", category: "SERVICE", note: "提问者 30%" },
      { role: "PLATFORM", rate: 0.4, basis: "GROSS", category: "PLATFORM", note: "平台 40%" },
    ],
    bufferDays: 7,
    remark: "围观回答：平台40%/提问者30%/达人30%（2026-07-10 拍板）",
  },
  {
    scene: "AUDIO_CALL",
    // 董事长拍板 2026-07-10：实时互动统一 平台50%/达人50%（与 DEFAULT_RATES.AUDIO_CALL、
    // CONSULT_CALL、LIVE_GIFT 一致）。原「嘉宾70%」是旧值；生产 DB 已修正为 50/50，
    // 种子必须同步 —— 否则重跑 seed(updatedBy=seed 会被覆盖) 把连麦打回 70% 多发。
    splits: [
      { role: "PROVIDER", rate: 0.5, basis: "GROSS", category: "SERVICE", note: "达人 50%" },
      { role: "PLATFORM", rate: 0.5, basis: "GROSS", category: "PLATFORM", note: "平台 50%" },
    ],
    bufferDays: 7,
    remark: "直播连麦/通话 达人50%（2026-07-10 拍板·与咨询/打赏同口径）",
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
      { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
      { role: "PLATFORM", rate: 0.8, basis: "GROSS", category: "PLATFORM" },
    ],
    bufferDays: 7,
    enabled: false,
    // 现状：会员已产品化上线，生产 DB 此规则 updatedBy=c1-member-productize-20260703、
    // enabled=true、splits 已对齐订单类(STATION 20%+OPERATOR 管理奖)。因 updatedBy 非本种子，
    // 重跑 seed 会「跳过」不覆盖 —— 故此处旧值不会打回生产，仅作全新 DB 初始化的保守兜底。
    remark: "会员推广分佣（默认20%·2026-07-02 拍板·后台可改）；生产已启用见 c1-member-productize",
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
