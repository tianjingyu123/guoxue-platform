/**
 * shop 域拆分后各 service spec 共享 mock 工厂（纯测试辅助·不参与生产运行时）。
 * 每个工厂返回全新 mock 实例，各 spec 文件独立构建，互不串扰。
 * 默认值与原 shop.service.spec 完全一致，保证拆分后行为零变化。
 */

export function makeMockWechatPay() {
  return {
    // 真实服务是 getter；mock 为可改写属性（"无证书优雅 400" 用例会临时置 false）
    isConfigured: true,
    createNativeOrder: jest.fn().mockResolvedValue({ codeUrl: "weixin://wxpay/mock" }),
    createJsapiOrder: jest.fn().mockResolvedValue({ prepay_id: "mock-prepay" }),
    createH5Order: jest.fn().mockResolvedValue({ h5Url: "https://wx.tenpay.com/h5/pay/mock" }),
    queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
    closeOrder: jest.fn().mockResolvedValue({}),
    refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
    queryRefund: jest.fn().mockResolvedValue({ status: "PROCESSING" }),
    verifyAndDecryptNotify: jest.fn().mockResolvedValue({ valid: true, data: { out_trade_no: "o1" } }),
  };
}

export function makeMockAlipay() {
  return {
    isConfigured: true,
    verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "o1", tradeStatus: "TRADE_SUCCESS" } }),
    query: jest.fn().mockResolvedValue({ alipay_trade_query_response: {} }),
    refund: jest.fn().mockResolvedValue({ status: "SUCCESS", outRefundNo: "RFo1", raw: {} }),
    queryRefund: jest.fn().mockResolvedValue({ status: "PROCESSING", raw: {} }),
  };
}

export function makeMockUnionpay() {
  return {
    isConfigured: true,
    verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "o1", respCode: "00" } }),
    query: jest.fn().mockResolvedValue({ respCode: "00" }),
    refund: jest.fn().mockResolvedValue({ status: "PROCESSING", channelRefundNo: "RForder1", raw: { respCode: "00" } }),
  };
}

export function makeMockCoin() {
  return {
    handleRechargeCallback: jest.fn().mockResolvedValue(undefined),
    getCoinRate: jest.fn().mockResolvedValue(10),
    getRechargeTiers: jest.fn().mockResolvedValue([]),
    getOrCreateAccount: jest.fn(),
    spend: jest.fn(),
    refund: jest.fn(),
  };
}

export function makeMockWebhook() {
  return { fire: jest.fn().mockResolvedValue(undefined) };
}

export function makeMockRedis() {
  return {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
    setNX: jest.fn().mockResolvedValue(true),
    runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
  };
}

export function makeMockPrisma(): any {
  const mockPrisma: any = {
    $transaction: jest.fn((arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(mockPrisma);
    }),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productSku: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
    },
    productReview: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
    },
    flashSaleItem: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    orderLogistics: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    coupon: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userCoupon: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auth: {
      findFirst: jest.fn(),
    },
    virtualCoinRecharge: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    configSystem: {
      findUnique: jest.fn(),
    },
    memberPurchase: {
      create: jest.fn(),
    },
    merchant: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    inventoryMovement: {
      create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn(),
    },
    groupBuy: {
      findUnique: jest.fn(),
    },
    groupBuyParticipant: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    // 供-P3 自购立减泛化涉及的分销角色模型（默认全 null=普通用户·测试内用 mockResolvedValueOnce 命中角色）
    station: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    // 加盟费定价真源（价格塞 rateA·名额塞 rateB）：默认无配置 → 下单应报「未配置价格」
    commissionConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    circle: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    stationOffline: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    teacherCertification: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    operator: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    referralRelation: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    // 佣-V2-P2 渠道主体临时链接归因（默认无点击记录·灰度开关默认关=configSystem 缺省 null）
    channelClick: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    // 佣-V2-P3 直播来源→圈子受益人解析（默认查无房间）
    liveRoom: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    afterSale: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "as-created", updatedAt: new Date("2026-07-01T00:00:00.000Z") }),
      update: jest.fn().mockResolvedValue({ id: "as-updated", updatedAt: new Date("2026-07-01T00:00:00.000Z") }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    huifuSplitRecord: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return mockPrisma;
}

export function makeMockCommission() {
  return {
    calculateAndRecord: jest.fn().mockResolvedValue(undefined),
    reverseCommission: jest.fn().mockResolvedValue({ reversed: true }),
    getStationRate: jest.fn().mockResolvedValue(0.25),
  };
}

export function makeMockUnifiedPricing() {
  return {
    calculateEffectivePrice: jest.fn().mockResolvedValue({
      productId: "p1", effectivePrice: 99, originalPrice: 99,
      appliedPromotion: null, activePromotions: [], hasPromotion: false,
    }),
    batchCalculateEffectivePrice: jest.fn().mockResolvedValue([]),
    calculateFullReduction: jest.fn().mockResolvedValue({ reducedAmount: 99, reduction: 0 }),
    invalidateCache: jest.fn().mockResolvedValue(undefined),
    invalidateCacheByProduct: jest.fn().mockResolvedValue(undefined),
  };
}

export function makeMockPaymentFactory() {
  const mockWechatPay = makeMockWechatPay();
  return {
    getProvider: jest.fn().mockReturnValue(mockWechatPay),
    refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
    queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
    isConfigured: jest.fn().mockReturnValue(true),
  };
}

export function makeMockHuifu() {
  return {
    isEnabled: jest.fn().mockResolvedValue(true),
    registerPaymentNotifyHandler: jest.fn(),
    registerRefundNotifyHandler: jest.fn(),
    createPayment: jest.fn().mockResolvedValue({ outTradeNo: "HF1" }),
    createRefund: jest.fn().mockResolvedValue({ outRefundNo: "RForder1", refundStatus: "PROCESSING", raw: {} }),
  };
}

export function makeMockMemberBenefit() {
  return {
    isActiveMember: jest.fn().mockResolvedValue(false),
    consumeAiQuota: jest.fn().mockResolvedValue({ isMember: false, remaining: 9 }),
    getAiQuota: jest.fn().mockResolvedValue({ isMember: false, dailyLimit: 10, usedToday: 0, remaining: 10 }),
    grantMonthlyBenefits: jest.fn().mockResolvedValue(true),
  };
}

export function makeMockAudit() {
  return {
    moderateTextOrThrow: jest.fn().mockResolvedValue(undefined),
    moderateImageOrThrow: jest.fn().mockResolvedValue(undefined),
  };
}
