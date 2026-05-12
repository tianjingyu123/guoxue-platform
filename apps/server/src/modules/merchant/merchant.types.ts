/** 保证金流水类型 */
export const DepositType = {
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  DEDUCTION: "DEDUCTION",
  TOPUP: "TOPUP",
} as const;
export type DepositType = (typeof DepositType)[keyof typeof DepositType];

/** 保证金流水状态 */
export const DepositStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

/** 支付方式 */
export const PayMethod = {
  WECHAT: "WECHAT",
  ALIPAY: "ALIPAY",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;
export type PayMethod = (typeof PayMethod)[keyof typeof PayMethod];

/** 系统配置键 */
export const MERCHANT_CONFIG_KEYS = {
  COMMISSION_RATE: "merchant_commission_rate",
  DEPOSIT_BASE: "merchant_deposit_base",
  DEPOSIT_PER_CATEGORY: "merchant_deposit_per_category",
  SETTLEMENT_CYCLE: "merchant_settlement_cycle",
} as const;

/** 功能开关键 */
export const MERCHANT_FEATURE_FLAGS = {
  ONBOARDING: "merchant_onboarding",
  BACKEND: "merchant_backend",
  AUTO_APPROVE: "merchant_auto_approve",
  DEPOSIT_AUTO: "merchant_deposit_auto",
} as const;

/** 保证金支付订单号前缀 */
export const DEPOSIT_OUT_TRADE_NO_PREFIX = "DP";
