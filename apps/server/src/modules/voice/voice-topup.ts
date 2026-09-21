import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { DEFAULT_VOICE_BILLING, VoiceBillingConfig, parseVoiceBillingConfig } from "./voice-quota.service";

/**
 * 语音时长充值（决策人 2026-09-21：报告赠送的 30 分钟用完后，支持充值继续使用）
 *
 * 走平台既有订单/支付链路：订单类型 VOICE_MINUTES，targetId = 充值分钟数（只接受配置里的档位）。
 * - 价格由服务端按 voice_billing_config.pricing.userMicroPerMinute 计算（已拍板 2 元/分钟），前端金额一律无效
 * - 语音尚未开始计费（chargeUsers=false）时拒绝下单：服务没开放，不能先收钱
 * - 支付成功后在「订单置 PAID」的同一事务里加时长，幂等键 order:<id>:voice-minutes，同一订单只加一次
 * - 退款时在退款事务里冲正：扣回本单发放的时长，最多扣到当前可用余额；已用掉的部分记在流水里交人工核对，
 *   不替业务决定退款金额
 *
 * 这些函数不依赖 Nest 注入，供 shop 模块在其事务内直接调用（避免 shop ↔ voice 模块循环依赖）。
 */

export const VOICE_TOPUP_ORDER_TYPE = "VOICE_MINUTES";
export const DEFAULT_TOPUP_PACK_MINUTES = [10, 30, 60];

type Tx = any;

export async function loadVoiceBillingConfig(db: Tx): Promise<VoiceBillingConfig> {
  try {
    const row = await db.configSystem.findUnique({ where: { configKey: "voice_billing_config" } });
    return row?.configValue ? parseVoiceBillingConfig(row.configValue) : DEFAULT_VOICE_BILLING;
  } catch {
    return DEFAULT_VOICE_BILLING;
  }
}

export function topupPacks(cfg: VoiceBillingConfig): number[] {
  const packs = Array.isArray((cfg.pricing as any).topUpPackMinutes) ? (cfg.pricing as any).topUpPackMinutes : DEFAULT_TOPUP_PACK_MINUTES;
  return packs.filter((m: unknown) => Number.isInteger(m) && (m as number) > 0 && (m as number) <= 600);
}

/** 报价：金额用整数 micro 计算后换成两位小数的元，不用浮点累加 */
export function quoteVoiceTopup(cfg: VoiceBillingConfig, minutes: number) {
  const priceMicro = cfg.pricing.userMicroPerMinute * minutes;
  const fen = Math.round(priceMicro / 10_000);
  return { minutes, seconds: minutes * 60, priceMicro, amountYuan: fen / 100 };
}

/** 下单前校验与定价（shop-order.service 调用） */
export async function priceVoiceTopupOrder(db: Tx, targetId: string) {
  const cfg = await loadVoiceBillingConfig(db);
  if (!cfg.chargeUsers) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "语音暂未开始计费，当前无需充值");
  }
  const minutes = Number(String(targetId || "").trim());
  if (!topupPacks(cfg).includes(minutes)) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "充值档位不存在");
  }
  const q = quoteVoiceTopup(cfg, minutes);
  if (!(q.amountYuan > 0)) throw new BusinessException(ErrorCode.BAD_REQUEST, "语音续费单价未配置");
  return q;
}

/** 事务内加时长（幂等）：已有同幂等键流水则不重复加 */
export async function grantVoiceSecondsInTx(
  tx: Tx,
  input: { ownerType: "user" | "circle"; ownerId: string; seconds: number; idempotencyKey: string; note?: string; operatorId?: string },
) {
  if (!Number.isInteger(input.seconds) || input.seconds <= 0) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "发放时长必须为正整数秒");
  }
  const existed = await tx.voiceQuotaLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existed) return { duplicated: true, ledger: existed };
  const account = await tx.voiceQuotaAccount.upsert({
    where: { ownerType_ownerId: { ownerType: input.ownerType, ownerId: input.ownerId } },
    create: { ownerType: input.ownerType, ownerId: input.ownerId },
    update: {},
  });
  const updated = await tx.voiceQuotaAccount.update({
    where: { id: account.id },
    data: { balanceSeconds: { increment: input.seconds } },
  });
  const ledger = await tx.voiceQuotaLedger.create({
    data: {
      accountId: account.id,
      type: "grant",
      seconds: input.seconds,
      balanceAfter: updated.balanceSeconds,
      idempotencyKey: input.idempotencyKey,
      note: input.note,
      operatorId: input.operatorId,
    },
  });
  return { duplicated: false, ledger };
}

export const topupIdempotencyKey = (orderId: string) => `order:${orderId}:voice-minutes`;

/** 支付成功：按订单 targetId（分钟数）加时长。targetId 已在下单时校验过档位 */
export async function fulfillVoiceTopupOrderInTx(tx: Tx, order: { id: string; userId: string; targetId?: string | null }) {
  const minutes = Number(order.targetId);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, `语音充值订单分钟数无效：${order.id}`);
  }
  return grantVoiceSecondsInTx(tx, {
    ownerType: "user",
    ownerId: order.userId,
    seconds: minutes * 60,
    idempotencyKey: topupIdempotencyKey(order.id),
    note: `充值语音时长 ${minutes} 分钟（订单 ${order.id}）`,
  });
}

/**
 * 退款冲正（幂等）：扣回本单发放的时长，最多扣到当前可用余额（余额 − 通话中预留）。
 * 扣不回的部分（已用掉）写进流水备注，交人工核对；不在这里替业务决定退多少钱。
 */
export async function reverseVoiceTopupOrderInTx(tx: Tx, order: { id: string; userId: string }) {
  const grant = await tx.voiceQuotaLedger.findUnique({ where: { idempotencyKey: topupIdempotencyKey(order.id) } });
  if (!grant) return { reversed: 0, shortfall: 0, duplicated: false };
  const refundKey = `${topupIdempotencyKey(order.id)}:refund`;
  const existed = await tx.voiceQuotaLedger.findUnique({ where: { idempotencyKey: refundKey } });
  if (existed) return { reversed: Math.abs(existed.seconds), shortfall: 0, duplicated: true };
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
      note: shortfall > 0
        ? `订单退款冲正：扣回 ${reverse} 秒；其余 ${shortfall} 秒已使用，待人工核对`
        : `订单退款冲正：扣回 ${reverse} 秒`,
    },
  });
  return { reversed: reverse, shortfall, duplicated: false };
}
