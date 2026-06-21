"use client"

import { useEffect, useState } from "react"

// 第三方支付渠道
export type PaymentChannel = "wechat" | "alipay" | "unionpay" | "huifu"

export const PAYMENT_CHANNEL_NAMES: Record<PaymentChannel, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  unionpay: "云闪付",
  huifu: "汇付天下",
}

// 模拟：当前账户已绑定的第三方支付渠道
// 实际项目应由账户/支付服务接口返回
const MOCK_BOUND_CHANNELS: PaymentChannel[] = ["wechat", "alipay"]

/**
 * 提供"当前账户已绑定哪些第三方支付渠道"的信息。
 * 用于禁用虚拟币支付的场景：提交支付时校验所选渠道是否已绑定，
 * 未绑定则引导用户前往绑定。
 */
export function usePaymentBindings() {
  const [boundChannels, setBoundChannels] = useState<PaymentChannel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // 模拟异步获取绑定状态
    const timer = setTimeout(() => {
      if (active) {
        setBoundChannels(MOCK_BOUND_CHANNELS)
        setLoading(false)
      }
    }, 200)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])

  const isBound = (channel: PaymentChannel) => boundChannels.includes(channel)

  return { boundChannels, isBound, loading }
}
