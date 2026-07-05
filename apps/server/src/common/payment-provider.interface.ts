/**
 * 支付服务 Provider 接口（国际化预留）
 *
 * 现有实现：WechatPayService / AlipayService / UnionpayService / HuifuService
 * 未来扩展：StripePaymentProvider / PayPalPaymentProvider / ApplePayProvider
 *
 * 当前阶段仅定义接口契约，不强制现有服务实现。
 * 接入海外支付时，新 Provider 实现此接口即可无缝集成。
 */

export interface IPaymentProvider {
  /** 查询订单状态 */
  queryOrder(outTradeNo: string): Promise<Record<string, unknown>>;

  /** 发起退款 */
  refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason?: string;
  }): Promise<Record<string, unknown>>;

  /** 验证支付回调签名（各渠道验签入参形态不同：微信=签名头+原文，支付宝/银联=参数表，故用变长 any 桥接异构实现） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 异构支付渠道验签签名各异，变长 any 为抽象契约的必要处
  verifyNotify(...args: any[]): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string } | boolean>;

  /** 处理支付回调，返回标准化订单数据 */
  handleNotify?(body: Record<string, unknown>): Promise<{
    success: boolean;
    outTradeNo: string;
    transactionId: string;
    amount: number;
    raw: Record<string, unknown>;
  }>;
}

/** 支付渠道标识 */
export type PaymentChannel = 'WECHAT' | 'ALIPAY' | 'UNIONPAY' | 'HUIFU' | 'STRIPE' | 'PAYPAL' | 'APPLE_PAY';

/** 支付 Provider 工厂 — 根据渠道获取对应 Provider */
export interface IPaymentProviderFactory {
  getProvider(channel: PaymentChannel): IPaymentProvider;
}
