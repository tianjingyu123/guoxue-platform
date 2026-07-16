import { Injectable, Logger } from "@nestjs/common";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";

/** 标准化退款参数 */
export interface RefundParams {
  outTradeNo: string;
  /** 渠道交易号(微信 transaction_id/支付宝 trade_no)。微信退款优先用它,避免误把 transaction_id 当 out_trade_no。 */
  transactionId?: string;
  outRefundNo: string;
  totalYuan: number;
  totalFen: number;
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
          outRefundNo: p.outRefundNo,
          refundAmount: p.totalYuan,
          reason: p.reason || "用户申请退款",
        }) as unknown as Promise<{ status: string }>,
    });

    this.adapters.set("UNIONPAY", {
      channel: "UNIONPAY",
      refund: (p) => {
        this.logger.log(`银联退款: ${p.outRefundNo}, 金额: ${p.totalFen}`);
        return this.unionpay.refund({
          outTradeNo: p.outTradeNo,
          outRefundNo: p.outRefundNo,
          amount: p.totalFen,
        }) as unknown as Promise<{ status: string }>;
      },
    });

    // HUIFU: createRefund 签名差异较大，暂不注册，新增渠道在此补充
  }

  /** 根据渠道退款，未匹配到则回退微信 */
  async refund(channel: string, params: RefundParams): Promise<{ status: string }> {
    const adapter = this.adapters.get(channel) || this.adapters.get("WECHAT")!;
    return adapter.refund(params);
  }

  /** 指定渠道的支付网关是否已配置密钥（未配置时无法调用网关退款，调用方应降级为线下退款） */
  isConfigured(channel: string): boolean {
    switch ((channel || "WECHAT").toUpperCase()) {
      case "ALIPAY": return this.alipay.isConfigured;
      case "UNIONPAY": return this.unionpay.isConfigured;
      case "WECHAT":
      default: return this.wechatPay.isConfigured;
    }
  }
}
