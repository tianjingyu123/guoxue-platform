import { Injectable, Logger } from "@nestjs/common";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";

/** 标准化退款参数 */
export interface RefundParams {
  outTradeNo: string;
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
          outTradeNo: p.outTradeNo,
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
