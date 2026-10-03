import { Injectable, Logger } from "@nestjs/common";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { HuifuService } from "../huifu/huifu.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 标准化退款参数 */
export interface RefundParams {
  /** 平台订单 ID：汇付退款与异步回调关联必须使用。 */
  orderId: string;
  outTradeNo: string;
  /** 渠道交易号(微信 transaction_id/支付宝 trade_no)。微信退款优先用它,避免误把 transaction_id 当 out_trade_no。 */
  transactionId?: string;
  outRefundNo: string;
  totalYuan: number;
  totalFen: number;
  /** 首次进入退款处理的持久化时间；银联用它保持 orderId+txnTime 幂等键稳定。 */
  refundRequestedAt: Date;
  reason?: string;
}

/** 支付渠道适配器 — 抹平各渠道退款签名差异 */
interface PaymentAdapter {
  channel: string;
  refund(params: RefundParams): Promise<{ status: string }>;
}

/**
 * 支付 Provider 工厂
 *
 * 新增支付渠道：创建适配器 → 注册到 Map → 无需修改 ShopService
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly adapters = new Map<string, PaymentAdapter>();
  private readonly logger = new Logger(PaymentProviderFactory.name);

  constructor(
    private wechatPay: WechatPayService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private huifu: HuifuService,
  ) {
    this.adapters.set("WECHAT", {
      channel: "WECHAT",
      refund: (p) =>
        this.wechatPay.refund({
          // 修复(后端审计P1-2)：支付时 payTransactionId 存的是微信 transaction_id(非商户 out_trade_no)。
          // 优先按 transaction_id 退款；无则回退 out_trade_no。原先把 transaction_id 当 out_trade_no 传
          // → 微信按商户单号查不到 → 退款报「订单不存在」。二选一,不同时下发。
          ...(p.transactionId ? { transactionId: p.transactionId } : { outTradeNo: p.outTradeNo }),
          outRefundNo: p.outRefundNo,
          amount: { refund: p.totalFen, total: p.totalFen },
          reason: p.reason || "用户申请退款",
        }) as unknown as Promise<{ status: string }>,
    });

    this.adapters.set("ALIPAY", {
      channel: "ALIPAY",
      refund: (p) =>
        this.alipay.refund({
          outTradeNo: p.outTradeNo,
          tradeNo: p.transactionId,
          outRefundNo: p.outRefundNo,
          refundAmount: p.totalYuan,
          reason: p.reason || "用户申请退款",
        }),
    });

    this.adapters.set("UNIONPAY", {
      channel: "UNIONPAY",
      refund: (p) => {
        this.logger.log(`银联退款: ${p.outRefundNo}, 金额: ${p.totalFen}`);
        return this.unionpay.refund({
          outTradeNo: p.outTradeNo,
          outRefundNo: p.outRefundNo,
          amount: p.totalFen,
          origQryId: p.transactionId,
          merchantOrderId: p.orderId,
          requestedAt: p.refundRequestedAt,
        });
      },
    });

    this.adapters.set("HUIFU", {
      channel: "HUIFU",
      refund: async (p) => {
        const result = await this.huifu.createRefund({
          orderId: p.orderId,
          amount: p.totalYuan,
          reason: p.reason || "用户申请退款",
        });
        return { status: result.refundStatus };
      },
    });
  }

  /** 根据原支付渠道退款；未知渠道必须失败关闭，绝不能误退到微信。 */
  async refund(channel: string, params: RefundParams): Promise<{ status: string }> {
    const normalized = String(channel || "").toUpperCase();
    const adapter = this.adapters.get(normalized);
    if (!adapter) {
      this.logger.error(`不支持的退款渠道: ${normalized || "EMPTY"}`);
      throw new BusinessException(ErrorCode.BAD_REQUEST, "原支付渠道暂不支持自动退款");
    }
    return adapter.refund(params);
  }

  /** 指定渠道的支付网关是否已配置密钥（未配置时无法调用网关退款，调用方应降级为线下退款） */
  async isConfigured(channel: string): Promise<boolean> {
    switch (String(channel || "").toUpperCase()) {
      case "ALIPAY": return this.alipay.isConfigured;
      case "UNIONPAY": return this.unionpay.isConfigured;
      case "HUIFU": return this.huifu.isEnabled();
      case "WECHAT": return this.wechatPay.isConfigured;
      default: return false;
    }
  }
}
