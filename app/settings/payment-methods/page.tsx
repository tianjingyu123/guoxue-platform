"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { PAYMENT_CHANNEL_NAMES, type PaymentChannel } from "@/hooks/use-payment-bindings"
import { cn } from "@/lib/utils"

const CHANNEL_BADGES: Record<PaymentChannel, { badge: string; color: string }> = {
  wechat: { badge: "微", color: "bg-green-500" },
  alipay: { badge: "支", color: "bg-blue-500" },
  unionpay: { badge: "云", color: "bg-red-500" },
  huifu: { badge: "汇", color: "bg-orange-500" },
}

const CHANNELS: PaymentChannel[] = ["wechat", "alipay", "unionpay", "huifu"]

export default function PaymentMethodsPage() {
  // 模拟绑定状态，实际应由账户/支付服务接口返回
  const [bound, setBound] = useState<Record<PaymentChannel, boolean>>({
    wechat: true,
    alipay: true,
    unionpay: false,
    huifu: false,
  })

  const toggle = (channel: PaymentChannel) => {
    setBound((prev) => ({ ...prev, [channel]: !prev[channel] }))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <BackButton />
        <h1 className="text-base font-semibold text-foreground">支付方式管理</h1>
      </header>

      <p className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        绑定第三方支付渠道后，购买课程、商品、会员等可直接快捷支付，提现也更便捷。
      </p>

      <div className="space-y-3 px-4">
        {CHANNELS.map((channel) => {
          const { badge, color } = CHANNEL_BADGES[channel]
          const isBound = bound[channel]
          return (
            <div
              key={channel}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white",
                    color,
                  )}
                >
                  {badge}
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {PAYMENT_CHANNEL_NAMES[channel]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isBound ? "已绑定" : "未绑定"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggle(channel)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  isBound
                    ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isBound ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    已绑定
                  </>
                ) : (
                  "去绑定"
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
