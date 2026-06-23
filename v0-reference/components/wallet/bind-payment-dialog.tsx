"use client"

import { useRouter } from "next/navigation"
import { Link2 } from "lucide-react"
import { PAYMENT_CHANNEL_NAMES, type PaymentChannel } from "@/hooks/use-payment-bindings"

interface BindPaymentDialogProps {
  open: boolean
  onClose: () => void
  channel: PaymentChannel | null
}

/**
 * 禁用虚拟币的场景中，用户所选第三方支付渠道尚未绑定时，
 * 引导其前往绑定页完成绑定。
 */
export function BindPaymentDialog({ open, onClose, channel }: BindPaymentDialogProps) {
  const router = useRouter()
  if (!open || !channel) return null

  const channelName = PAYMENT_CHANNEL_NAMES[channel]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-8">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Link2 className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">尚未绑定{channelName}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          使用{channelName}付款前，需先绑定{channelName}账户。绑定后即可完成支付。
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            取消
          </button>
          <button
            onClick={() => router.push("/settings/payment-methods")}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            去绑定
          </button>
        </div>
      </div>
    </div>
  )
}
