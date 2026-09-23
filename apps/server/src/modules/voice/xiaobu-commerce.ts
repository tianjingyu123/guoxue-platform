import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { grantVoiceSecondsInTx } from "./voice-topup";

/**
 * 小卜 · 报告单独购买与小卜AI会员（决策人 2026-09-21）
 *
 * - 报告单独收费 29 元，付款后赠送 30 分钟 AI 语音对话
 * - 小卜AI会员独立于书院会员：月 150 / 年 988 / 三年 1899 / 五年 2499 元；会员免费不限次生成报告，
 *   会员报告不按份送时长，改为会员期内每月送 300 分钟
 *
 * 口径：
 * - 一份报告 = 某个排盘记录 × 某种报告类型；买过之后切换门派、重新生成都不再收费
 * - 价格一律服务端计算（配置 xiaobu_commerce_config，缺省即上面的拍板值），前端金额无效
 * - 已购记录与会员期都记在通用权益流水（EntitlementLedger，sourceType=ORDER），退款时由
 *   shop-refund 的 revokeSourceWithTx 统一撤销；赠送的语音时长另行冲正
 * - 会员有效期不信任单条流水的 validUntil：按未撤销的购买记录依次累加重算，
 *   中间某笔退款后后续购买自动前移，不会多给也不会少给
 *
 * 与 voice-topup 一样不依赖 Nest 注入，供 shop 模块在其事务内直接调用。
 */

export const XIAOBU_REPORT_ORDER_TYPE = "XIAOBU_REPORT";
export const XIAOBU_MEMBER_ORDER_TYPE = "XIAOBU_MEMBER";
export const REPORT_ENTITLEMENT_KEY = "xiaobu.report";
export const MEMBER_ENTITLEMENT_KEY = "xiaobu.member";

/** 与 paipan-report.service 的 REPORT_TITLES 保持一致 */
export const XIAOBU_REPORT_TYPES = ["general", "career", "love", "wealth", "health"] as const;

export interface XiaobuMemberPlan {
  key: string;
  label: string;
  months: number;
  priceYuan: number;
}

export interface XiaobuCommerceConfig {
  /** 报告是否需要付费或会员才能生成（关掉即恢复免费生成，供灰度/应急） */
  reportPaywall: boolean;
  reportPriceYuan: number;
  /** 单独购买报告赠送的语音分钟数 */
  reportVoiceMinutes: number;
  memberPlans: XiaobuMemberPlan[];
  /** 会员期内每月赠送的语音分钟数 */
  memberMonthlyVoiceMinutes: number;
  /** 圈内语音时长充值的圈主分成比例（决策人 2026-09-21：圈主与平台五五分成） */
  circleVoiceOwnerShare: number;
}

export const DEFAULT_XIAOBU_COMMERCE: XiaobuCommerceConfig = {
  reportPaywall: true,
  reportPriceYuan: 29,
  reportVoiceMinutes: 30,
  memberPlans: [
    { key: "MONTHLY", label: "月会员", months: 1, priceYuan: 150 },
    { key: "YEARLY", label: "年会员", months: 12, priceYuan: 988 },
    { key: "YEAR3", label: "三年会员", months: 36, priceYuan: 1899 },
    { key: "YEAR5", label: "五年会员", months: 60, priceYuan: 2499 },
  ],
  memberMonthlyVoiceMinutes: 300,
  circleVoiceOwnerShare: 0.5,
};

type Tx = any;

const money = (v: unknown) => Math.round(Number(v) * 100) / 100;

/** 解析配置：逐项校验，不合法的项回落缺省值（配置写坏不能变成 0 元开卖） */
export function parseXiaobuCommerceConfig(raw: unknown): XiaobuCommerceConfig {
  let v: any = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      v = {};
    }
  }
  v = v && typeof v === "object" ? v : {};
  const d = DEFAULT_XIAOBU_COMMERCE;
  const posMoney = (x: unknown, fallback: number) => (Number.isFinite(Number(x)) && Number(x) > 0 ? money(x) : fallback);
  const nonNegInt = (x: unknown, fallback: number) => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : fallback);
  const plans = Array.isArray(v.memberPlans)
    ? v.memberPlans
        .filter((p: any) => p && typeof p.key === "string" && /^[A-Z0-9_]{2,20}$/.test(p.key) && Number.isInteger(p.months) && p.months > 0 && p.months <= 120 && Number(p.priceYuan) > 0)
        .map((p: any) => ({ key: p.key, label: String(p.label || p.key).slice(0, 20), months: p.months, priceYuan: money(p.priceYuan) }))
    : [];
  return {
    reportPaywall: typeof v.reportPaywall === "boolean" ? v.reportPaywall : d.reportPaywall,
    reportPriceYuan: posMoney(v.reportPriceYuan, d.reportPriceYuan),
    reportVoiceMinutes: nonNegInt(v.reportVoiceMinutes, d.reportVoiceMinutes),
    memberPlans: plans.length ? plans : d.memberPlans,
    memberMonthlyVoiceMinutes: nonNegInt(v.memberMonthlyVoiceMinutes, d.memberMonthlyVoiceMinutes),
    circleVoiceOwnerShare:
      Number.isFinite(Number(v.circleVoiceOwnerShare)) && Number(v.circleVoiceOwnerShare) >= 0 && Number(v.circleVoiceOwnerShare) <= 1
        ? Number(v.circleVoiceOwnerShare)
        : d.circleVoiceOwnerShare,
  };
}

export async function loadXiaobuCommerceConfig(db: Tx): Promise<XiaobuCommerceConfig> {
  try {
    const row = await db.configSystem.findUnique({ where: { configKey: "xiaobu_commerce_config" } });
    return row?.configValue ? parseXiaobuCommerceConfig(row.configValue) : DEFAULT_XIAOBU_COMMERCE;
  } catch {
    return DEFAULT_XIAOBU_COMMERCE;
  }
}

// ───────── 报告 ─────────

/** 报告订单 targetId = `${排盘记录ID}:${报告类型}` */
export function reportTargetId(recordId: string, reportType: string) {
  return `${recordId}:${reportType}`;
}

export function parseReportTarget(targetId: string | null | undefined) {
  const raw = String(targetId || "");
  const i = raw.lastIndexOf(":");
  const recordId = i > 0 ? raw.slice(0, i) : "";
  const reportType = i > 0 ? raw.slice(i + 1) : "";
  if (!recordId || !(XIAOBU_REPORT_TYPES as readonly string[]).includes(reportType)) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "报告购买对象无效");
  }
  return { recordId, reportType };
}

async function activeReportGrant(db: Tx, userId: string, recordId: string, reportType: string) {
  const rows = await db.entitlementLedger.findMany({
    where: { userId, entitlementKey: REPORT_ENTITLEMENT_KEY, resourceType: "paipan_report", resourceId: reportTargetId(recordId, reportType) },
    select: { id: true, action: true, reversesLedgerId: true },
  });
  const revoked = new Set(rows.filter((r: any) => r.action === "REVOKE").map((r: any) => r.reversesLedgerId));
  return rows.some((r: any) => r.action === "GRANT" && !revoked.has(r.id));
}

/**
 * 能否生成/查看某份报告：
 * paywall 关闭 → 免费；小卜AI会员有效期内 → 会员；买过这一份 → 已购；否则需购买
 */
export async function reportAccess(db: Tx, userId: string, recordId: string, reportType: string) {
  const cfg = await loadXiaobuCommerceConfig(db);
  const base = {
    priceYuan: cfg.reportPriceYuan,
    includedVoiceMinutes: cfg.reportVoiceMinutes,
    memberPlans: cfg.memberPlans,
    memberMonthlyVoiceMinutes: cfg.memberMonthlyVoiceMinutes,
  };
  if (!cfg.reportPaywall) return { granted: true, via: "free" as const, ...base };
  const member = await xiaobuMemberStatus(db, userId);
  if (member.active) return { granted: true, via: "member" as const, memberExpireAt: member.expireAt, ...base };
  if (await activeReportGrant(db, userId, recordId, reportType)) return { granted: true, via: "purchased" as const, ...base };
  return { granted: false, via: null, ...base };
}

/** 下单前校验与定价（shop-order.service 调用） */
export async function priceReportOrder(db: Tx, userId: string, targetId: string) {
  const { recordId, reportType } = parseReportTarget(targetId);
  const record = await db.paipanRecord.findUnique({ where: { id: recordId }, select: { userId: true } });
  if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "排盘记录不存在");
  if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能为自己的排盘购买报告");
  const access = await reportAccess(db, userId, recordId, reportType);
  if (access.granted) {
    const why = access.via === "member" ? "你是小卜AI会员，报告免费" : access.via === "purchased" ? "这份报告已购买" : "报告当前免费";
    throw new BusinessException(ErrorCode.BAD_REQUEST, `${why}，无需再次购买`);
  }
  return { amountYuan: access.priceYuan };
}

const reportVoiceKey = (orderId: string) => `order:${orderId}:report-voice`;

/** 支付成功：登记已购 + 赠送语音时长（同一事务、均幂等） */
export async function fulfillReportOrderInTx(
  tx: Tx,
  entitlement: { grantWithTx: (tx: Tx, input: any) => Promise<unknown> },
  order: { id: string; userId: string; targetId?: string | null },
) {
  const { recordId, reportType } = parseReportTarget(order.targetId);
  const cfg = await loadXiaobuCommerceConfig(tx);
  await entitlement.grantWithTx(tx, {
    userId: order.userId,
    entitlementKey: REPORT_ENTITLEMENT_KEY,
    kind: "ACCESS",
    resourceType: "paipan_report",
    resourceId: reportTargetId(recordId, reportType),
    unlimited: true,
    sourceType: "ORDER",
    sourceId: order.id,
    idempotencyKey: `order:${order.id}:xiaobu-report`,
    metadata: { recordId, reportType },
  });
  if (cfg.reportVoiceMinutes > 0) {
    await grantVoiceSecondsInTx(tx, {
      ownerType: "user",
      ownerId: order.userId,
      seconds: cfg.reportVoiceMinutes * 60,
      idempotencyKey: reportVoiceKey(order.id),
      note: `购买报告赠送语音 ${cfg.reportVoiceMinutes} 分钟（订单 ${order.id}）`,
    });
  }
}

// ───────── 会员 ─────────

function addMonths(from: Date, months: number) {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // 月底对齐：1 月 31 日 + 1 个月 → 2 月末，而不是 3 月初
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** 按未撤销的购买记录依次累加：每笔从「付款时间」与「上一笔到期」中较晚者起算 */
async function memberPeriods(db: Tx, userId: string) {
  const rows = await db.entitlementLedger.findMany({
    where: { userId, entitlementKey: MEMBER_ENTITLEMENT_KEY },
    select: { id: true, action: true, reversesLedgerId: true, validFrom: true, metadata: true, sourceId: true },
    orderBy: { createdAt: "asc" },
  });
  const revoked = new Set(rows.filter((r: any) => r.action === "REVOKE").map((r: any) => r.reversesLedgerId));
  let end: Date | null = null;
  const periods: { orderId: string; planKey: string; start: Date; end: Date }[] = [];
  for (const r of rows) {
    if (r.action !== "GRANT" || revoked.has(r.id)) continue;
    const months = Number((r.metadata as any)?.months);
    if (!Number.isInteger(months) || months <= 0) continue;
    const paidAt = new Date((r.metadata as any)?.paidAt || r.validFrom);
    const start: Date = end && end > paidAt ? end : paidAt;
    end = addMonths(start, months);
    periods.push({ orderId: r.sourceId, planKey: (r.metadata as any)?.planKey, start, end });
  }
  return periods;
}

export async function xiaobuMemberStatus(db: Tx, userId: string, now = new Date()) {
  const periods = await memberPeriods(db, userId);
  const current = periods.find((p) => p.start <= now && now < p.end);
  // 会员期内续买的一定从当前期末起算、首尾相接，所以有效时到期日就是最后一笔的期末
  return {
    active: !!current,
    expireAt: current ? periods[periods.length - 1].end : null,
    planKey: current?.planKey ?? null,
  };
}

export async function priceMemberOrder(db: Tx, targetId: string) {
  const cfg = await loadXiaobuCommerceConfig(db);
  const plan = cfg.memberPlans.find((p) => p.key === String(targetId || "").trim());
  if (!plan) throw new BusinessException(ErrorCode.BAD_REQUEST, "会员档位不存在");
  return { amountYuan: plan.priceYuan, plan };
}

export const monthKey = (d: Date) => {
  // 按北京时间的自然月发放
  const bj = new Date(d.getTime() + 8 * 3600_000);
  return `${bj.getUTCFullYear()}${String(bj.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const memberVoiceKey = (userId: string, month: string) => `xiaobu-member-voice:${userId}:${month}`;

/** 会员当月赠送（幂等：同一用户同一自然月只送一次） */
export async function grantMemberMonthlyVoiceInTx(tx: Tx, userId: string, cfg: XiaobuCommerceConfig, now = new Date(), orderId?: string) {
  if (cfg.memberMonthlyVoiceMinutes <= 0) return null;
  const month = monthKey(now);
  const res = await grantVoiceSecondsInTx(tx, {
    ownerType: "user",
    ownerId: userId,
    seconds: cfg.memberMonthlyVoiceMinutes * 60,
    idempotencyKey: memberVoiceKey(userId, month),
    note: `小卜AI会员 ${month.slice(0, 4)} 年 ${Number(month.slice(4))} 月赠送语音 ${cfg.memberMonthlyVoiceMinutes} 分钟${orderId ? `（开通订单 ${orderId}）` : ""}`,
  });
  return res.duplicated ? null : memberVoiceKey(userId, month);
}

/** 支付成功：登记会员期 + 当月语音（同一事务、均幂等） */
export async function fulfillMemberOrderInTx(
  tx: Tx,
  entitlement: { grantWithTx: (tx: Tx, input: any) => Promise<unknown> },
  order: { id: string; userId: string; targetId?: string | null; paidAt?: Date | null },
) {
  const cfg = await loadXiaobuCommerceConfig(tx);
  const plan = cfg.memberPlans.find((p) => p.key === String(order.targetId || ""));
  if (!plan) throw new BusinessException(ErrorCode.BAD_REQUEST, `小卜AI会员订单档位无效：${order.id}`);
  const paidAt = order.paidAt ? new Date(order.paidAt) : new Date();
  // 先登记本单，再按全部有效购买重算本单实际区间（写入 validUntil 仅供展示，判定以重算为准）
  const before = await memberPeriods(tx, order.userId);
  const lastEnd = before.length ? before[before.length - 1].end : null;
  const start = lastEnd && lastEnd > paidAt ? lastEnd : paidAt;
  const end = addMonths(start, plan.months);
  const voiceKey = await grantMemberMonthlyVoiceInTx(tx, order.userId, cfg, paidAt, order.id);
  await entitlement.grantWithTx(tx, {
    userId: order.userId,
    entitlementKey: MEMBER_ENTITLEMENT_KEY,
    kind: "MEMBERSHIP",
    unlimited: true,
    validFrom: start,
    validUntil: end,
    sourceType: "ORDER",
    sourceId: order.id,
    idempotencyKey: `order:${order.id}:xiaobu-member`,
    metadata: { planKey: plan.key, months: plan.months, paidAt: paidAt.toISOString(), voiceGrantKey: voiceKey },
  });
  return { start, end };
}

// ───────── 退款冲正 ─────────

/** 扣回某条语音发放（最多扣到可用余额；已用部分记流水交人工核对）。幂等 */
async function reverseVoiceGrantInTx(tx: Tx, grantKey: string, reason: string) {
  const grant = await tx.voiceQuotaLedger.findUnique({ where: { idempotencyKey: grantKey } });
  if (!grant) return { reversed: 0, shortfall: 0 };
  const refundKey = `${grantKey}:refund`;
  const existed = await tx.voiceQuotaLedger.findUnique({ where: { idempotencyKey: refundKey } });
  if (existed) return { reversed: Math.abs(existed.seconds), shortfall: 0 };
  const account = await tx.voiceQuotaAccount.findUniqueOrThrow({ where: { id: grant.accountId } });
  const available = Math.max(0, account.balanceSeconds - account.reservedSeconds);
  const reverse = Math.min(grant.seconds, available);
  const shortfall = grant.seconds - reverse;
  const updated = reverse > 0
    ? await tx.voiceQuotaAccount.update({ where: { id: account.id }, data: { balanceSeconds: { decrement: reverse } } })
    : account;
  await tx.voiceQuotaLedger.create({
    data: {
      accountId: account.id,
      type: "refund",
      seconds: -reverse,
      balanceAfter: updated.balanceSeconds,
      idempotencyKey: refundKey,
      note: shortfall > 0 ? `${reason}：扣回 ${reverse} 秒；其余 ${shortfall} 秒已使用，待人工核对` : `${reason}：扣回 ${reverse} 秒`,
    },
  });
  return { reversed: reverse, shortfall };
}

/**
 * 报告/会员订单退款：权益由 revokeSourceWithTx 先行撤销（须在本函数之前调用），这里只冲正赠送的语音。
 * - 报告：扣回本单赠送的 30 分钟
 * - 会员：退款后仍在会员期内（还有别的有效购买）则不扣——当月赠送本就该有；
 *   会员因此完全失效时，扣回当月赠送。更早月份的赠送不自动扣，留在流水里由人工结合退款金额核对
 */
export async function reverseXiaobuOrderVoiceInTx(tx: Tx, order: { id: string; userId: string; type: string }, now = new Date()) {
  if (order.type === XIAOBU_REPORT_ORDER_TYPE) return reverseVoiceGrantInTx(tx, reportVoiceKey(order.id), "报告订单退款冲正");
  if (order.type === XIAOBU_MEMBER_ORDER_TYPE) {
    if ((await xiaobuMemberStatus(tx, order.userId, now)).active) return { reversed: 0, shortfall: 0 };
    return reverseVoiceGrantInTx(tx, memberVoiceKey(order.userId, monthKey(now)), "会员订单退款、会员失效，冲正当月赠送");
  }
  return { reversed: 0, shortfall: 0 };
}
