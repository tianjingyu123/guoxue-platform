import { createHash } from "crypto";
import { HttpStatus } from "@nestjs/common";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

/** 截止值由发布流程从可信数据库取得并在两节点一致配置，不能来自支付请求。 */
export class PaymentInitializationPolicy {
  private readonly cutoff: Date | null;

  constructor() {
    const raw = process.env.PAYMENT_ORDER_CUTOFF_UTC || "";
    const parsed = new Date(raw);
    this.cutoff = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw)
      && process.env.PAYMENT_ORDER_CUTOFF_SHA256 === createHash("sha256").update(raw).digest("hex")
      && Number.isFinite(parsed.getTime()) && parsed.toISOString() === raw ? parsed : null;
    // 只冻结本进程参数；配置错误不影响应用启动和历史通知、查询、退款。
  }

  assertOrder(order: { createdAt?: Date }): Date {
    if (!this.cutoff) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "支付核对中：暂不能发起付款，请保留原订单并联系平台", HttpStatus.CONFLICT);
    }
    let createdAtMs = NaN;
    try { createdAtMs = Date.prototype.getTime.call(order.createdAt); } catch { /* 非数据库日期拒绝。 */ }
    if (!Number.isFinite(createdAtMs) || createdAtMs <= this.cutoff.getTime()) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "支付核对中：该订单暂不能再次发起付款，请在原订单查看进度或联系平台", HttpStatus.CONFLICT);
    }
    return new Date(this.cutoff.getTime());
  }

  assertRecharge(): never {
    throw new BusinessException(ErrorCode.PAY_FAILED, "充值暂未开放：已有充值请保留原单查询进度或联系平台", HttpStatus.CONFLICT);
  }
}
